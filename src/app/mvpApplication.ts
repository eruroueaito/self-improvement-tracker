/**
 * 模块名称：MVP 应用门面
 * 职责描述：编排 Goals、Roll、Session、Settlement、Rewards 与原子持久化用例
 * 输入/输出：接收 UI 命令并返回不可变领域快照或操作结果
 * 依赖关系：领域模块与 ports，不依赖具体 React/SQLite 实现
 * 注意事项：所有多事实修改先在副本完成，再通过 DataStore.replace 一次提交
 */
import type { ActivityInput, ActivityTemplate, Goal, GoalInput, GoalStatus } from '../modules/goals/types';
import { normalizeActivityInput, normalizeGoalInput, ValidationError } from '../modules/goals/validation';
import { runRollEngine } from '../modules/recommendations/rollEngine';
import type { RollContext, RollResult } from '../modules/recommendations/types';
import { calculateXp, emptyCompanionProjection, rebuildCompanionProjection } from '../modules/rewards/rewardEngine';
import type { RewardLedgerEntry } from '../modules/rewards/types';
import {
  createSession,
  elapsedMs,
  endSession,
  normalizeSettlement,
  pauseSession,
  recoverSession,
  resumeSession,
} from '../modules/sessions/sessionMachine';
import type { Session, SessionEndAction, SettlementInput, TimerMode } from '../modules/sessions/types';
import { createDefaultAppSettings, normalizeAppSettings, type AppSettings } from '../modules/settings/settings';
import type { ProviderBinding, ProviderCredentials } from '../modules/ai/credentials';
import {
  buildExportEnvelope,
  buildRecoveryExport,
  summarizeImport,
  type ImportPreview,
  type RecoveryExport,
} from './importExport';
import { migrateSnapshot } from './migrations';
import type { AppSnapshot, Clock, DataStore, ExportFilePort, IdGenerator, NotificationPort, SecretStore } from './ports';
import { assertEnvelopeTextWithinBudget, assertSnapshotWithinBudget } from './snapshotBudget';
import { validateImportEnvelope } from './importValidation';
import {
  clearDevelopmentSeedFacts,
  createDevelopmentSeedFacts,
  hasDevelopmentSeedFacts,
  type DevelopmentSeedRemovedCounts,
} from './developmentSeed';

export interface CreateGoalResult {
  goal: Goal;
  activity: ActivityTemplate;
}

export class MvpApplication {
  private snapshot: AppSnapshot | null = null;
  private recoveryExport: RecoveryExport | null = null;

  constructor(
    private readonly store: DataStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly notifications: NotificationPort,
    private readonly exportFiles: ExportFilePort,
    private readonly secretStore: SecretStore,
  ) {}

  async initialize(): Promise<AppSnapshot> {
    this.snapshot = null;
    this.recoveryExport = null;
    await this.store.initialize();
    const loaded = await this.store.load();
    if (loaded) {
      this.recoveryExport = buildRecoveryExport(loaded, this.clock.now());
      const migrated = migrateSnapshot(loaded);
      if (migrated.migratedFrom !== null) await this.store.replace(migrated.snapshot);
      this.snapshot = migrated.snapshot;
    } else {
      const initial = this.emptySnapshot();
      await this.store.replace(initial);
      this.snapshot = initial;
    }
    await this.recoverActiveSession();
    this.recoveryExport = null;
    return this.getSnapshot();
  }

  private emptySnapshot(): AppSnapshot {
    return {
      schemaVersion: 3,
      goals: [],
      activities: [],
      recommendationRuns: [],
      sessions: [],
      rewardEntries: [],
      companionProjection: emptyCompanionProjection(this.clock.now()),
      settings: createDefaultAppSettings(),
      aiInteractions: [],
    };
  }

  private current(): AppSnapshot {
    if (!this.snapshot) throw new Error('应用尚未初始化');
    return this.snapshot;
  }

  getSnapshot(): AppSnapshot {
    return structuredClone(this.current());
  }

  private async commit(next: AppSnapshot): Promise<void> {
    assertSnapshotWithinBudget(next);
    await this.store.replace(next);
    this.snapshot = next;
  }

  private buildActivity(goalId: string, normalized: ActivityInput, now: number, id: string): ActivityTemplate {
    return {
      id,
      goalId,
      title: normalized.title,
      description: normalized.description ?? '',
      minimumMinutes: normalized.minimumMinutes,
      maximumMinutes: normalized.maximumMinutes,
      energyCost: normalized.energyCost,
      contexts: normalized.contexts ?? [],
      minimumRestHours: normalized.minimumRestHours ?? null,
      suggestedCadenceDays: normalized.suggestedCadenceDays ?? null,
      rewardWeight: normalized.rewardWeight ?? 1,
      createdAt: now,
      archivedAt: null,
    };
  }

  private findActivityForGoal(snapshot: AppSnapshot, goalId: string, activityId: string): ActivityTemplate {
    const activity = snapshot.activities.find((candidate) => candidate.id === activityId && candidate.goalId === goalId);
    if (!activity) throw new ValidationError('活动不存在或不属于该目标');
    return activity;
  }

  async createGoal(goalInput: GoalInput, activityInput: ActivityInput): Promise<CreateGoalResult> {
    const normalizedGoal = normalizeGoalInput(goalInput);
    const normalizedActivity = normalizeActivityInput(activityInput);
    const now = this.clock.now();
    const goal: Goal = {
      id: this.ids.next(),
      title: normalizedGoal.title,
      description: normalizedGoal.description ?? '',
      status: 'active',
      importance: normalizedGoal.importance,
      feedback: normalizedGoal.feedback,
      desiredCadenceDays: normalizedGoal.desiredCadenceDays ?? null,
      minimumRestHours: normalizedGoal.minimumRestHours ?? 0,
      defaultEnergyCost: normalizedGoal.defaultEnergyCost,
      createdAt: now,
      updatedAt: now,
    };
    const activity = this.buildActivity(goal.id, normalizedActivity, now, this.ids.next());
    const next = this.getSnapshot();
    next.goals.push(goal);
    next.activities.push(activity);
    await this.commit(next);
    return { goal: structuredClone(goal), activity: structuredClone(activity) };
  }

  async createActivity(goalId: string, activityInput: ActivityInput): Promise<ActivityTemplate> {
    const next = this.getSnapshot();
    if (!next.goals.some((goal) => goal.id === goalId)) throw new ValidationError('目标不存在');
    const normalizedActivity = normalizeActivityInput(activityInput);
    const activity = this.buildActivity(goalId, normalizedActivity, this.clock.now(), this.ids.next());
    next.activities.push(activity);
    await this.commit(next);
    return structuredClone(activity);
  }

  async setGoalStatus(goalId: string, status: GoalStatus): Promise<void> {
    const next = this.getSnapshot();
    const goal = next.goals.find((candidate) => candidate.id === goalId);
    if (!goal) throw new ValidationError('目标不存在');
    goal.status = status;
    goal.updatedAt = this.clock.now();
    await this.commit(next);
  }

  async updateGoal(goalId: string, goalInput: GoalInput): Promise<void> {
    const normalizedGoal = normalizeGoalInput(goalInput);
    const next = this.getSnapshot();
    const goal = next.goals.find((candidate) => candidate.id === goalId);
    if (!goal) throw new ValidationError('目标不存在');
    Object.assign(goal, {
      title: normalizedGoal.title,
      description: normalizedGoal.description ?? '',
      importance: normalizedGoal.importance,
      feedback: normalizedGoal.feedback,
      desiredCadenceDays: normalizedGoal.desiredCadenceDays ?? null,
      minimumRestHours: normalizedGoal.minimumRestHours ?? 0,
      defaultEnergyCost: normalizedGoal.defaultEnergyCost,
      updatedAt: this.clock.now(),
    });
    await this.commit(next);
  }

  async updateActivity(goalId: string, activityId: string, activityInput: ActivityInput): Promise<void> {
    const normalizedActivity = normalizeActivityInput(activityInput);
    const next = this.getSnapshot();
    const activity = this.findActivityForGoal(next, goalId, activityId);
    Object.assign(activity, {
      title: normalizedActivity.title,
      description: normalizedActivity.description ?? '',
      minimumMinutes: normalizedActivity.minimumMinutes,
      maximumMinutes: normalizedActivity.maximumMinutes,
      energyCost: normalizedActivity.energyCost,
      contexts: normalizedActivity.contexts ?? [],
      minimumRestHours: normalizedActivity.minimumRestHours ?? null,
      suggestedCadenceDays: normalizedActivity.suggestedCadenceDays ?? null,
      rewardWeight: normalizedActivity.rewardWeight ?? 1,
    });
    await this.commit(next);
  }

  async archiveActivity(goalId: string, activityId: string): Promise<void> {
    const next = this.getSnapshot();
    const activity = this.findActivityForGoal(next, goalId, activityId);
    if (activity.archivedAt !== null) return;
    activity.archivedAt = this.clock.now();
    await this.commit(next);
  }

  async restoreActivity(goalId: string, activityId: string): Promise<void> {
    const next = this.getSnapshot();
    const activity = this.findActivityForGoal(next, goalId, activityId);
    if (activity.archivedAt === null) return;
    activity.archivedAt = null;
    await this.commit(next);
  }

  async roll(context: RollContext): Promise<RollResult> {
    const snapshot = this.current();
    const result = runRollEngine({
      runId: this.ids.next(),
      now: this.clock.now(),
      context,
      goals: snapshot.goals,
      activities: snapshot.activities,
      sessions: snapshot.sessions,
      previousRuns: snapshot.recommendationRuns,
    });
    const next = this.getSnapshot();
    next.recommendationRuns.push(result.run);
    await this.commit(next);
    return result;
  }

  async dismissRecommendation(runId: string, activityId: string): Promise<void> {
    const next = this.getSnapshot();
    const run = next.recommendationRuns.find((candidate) => candidate.id === runId);
    if (!run || !run.candidates.some((candidate) => candidate.activityTemplateId === activityId)) {
      throw new ValidationError('推荐记录不存在');
    }
    if (!run.dismissedActivityTemplateIds.includes(activityId)) run.dismissedActivityTemplateIds.push(activityId);
    await this.commit(next);
  }

  async startSession(input: {
    runId: string;
    activityId: string;
    timerMode: TimerMode;
    plannedMinutes: number | null;
  }): Promise<Session> {
    const next = this.getSnapshot();
    if (next.sessions.some((session) => session.status === 'running' || session.status === 'paused')) {
      throw new ValidationError('已有进行中的专注');
    }
    const run = next.recommendationRuns.find((candidate) => candidate.id === input.runId);
    const candidate = run?.candidates.find((item) => item.activityTemplateId === input.activityId);
    const activity = next.activities.find((item) => item.id === input.activityId);
    const goal = activity ? next.goals.find((item) => item.id === activity.goalId) : null;
    if (!run || !candidate || !activity || !goal || goal.status !== 'active' || activity.archivedAt !== null) {
      throw new ValidationError('所选推荐已不可用');
    }
    if (run.chosenActivityTemplateId !== null) throw new ValidationError('这次推荐已经开始过，请重新 Roll');
    const session = createSession({
      id: this.ids.next(),
      goalId: activity.goalId,
      activityTemplateId: activity.id,
      recommendationRunId: run.id,
      timerMode: input.timerMode,
      plannedMinutes: input.timerMode === 'countdown' ? (input.plannedMinutes ?? candidate.suggestedMinutes) : null,
      now: this.clock.now(),
    });
    run.chosenActivityTemplateId = activity.id;
    next.sessions.push(session);
    await this.commit(next);
    if (session.targetDurationMs !== null && next.settings.notificationsEnabled) {
      void this.notifications.scheduleCountdown(session.id, activity.title, session.startedAt + session.targetDurationMs).catch(() => undefined);
    }
    return structuredClone(session);
  }

  private findSession(next: AppSnapshot, sessionId: string): Session {
    const session = next.sessions.find((candidate) => candidate.id === sessionId);
    if (!session) throw new ValidationError('专注记录不存在');
    return session;
  }

  async pause(sessionId: string): Promise<Session> {
    const next = this.getSnapshot();
    const index = next.sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) throw new ValidationError('专注记录不存在');
    const updated = pauseSession(next.sessions[index]!, this.clock.now());
    next.sessions[index] = updated;
    await this.commit(next);
    return structuredClone(updated);
  }

  async resume(sessionId: string): Promise<Session> {
    const next = this.getSnapshot();
    const index = next.sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) throw new ValidationError('专注记录不存在');
    const updated = resumeSession(next.sessions[index]!, this.clock.now());
    next.sessions[index] = updated;
    await this.commit(next);
    return structuredClone(updated);
  }

  async end(sessionId: string, action: SessionEndAction): Promise<Session> {
    const next = this.getSnapshot();
    const index = next.sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) throw new ValidationError('专注记录不存在');
    const updated = endSession(next.sessions[index]!, this.clock.now(), action);
    next.sessions[index] = updated;
    await this.commit(next);
    void this.notifications.cancelCountdown(sessionId).catch(() => undefined);
    return structuredClone(updated);
  }

  async recoverActiveSession(): Promise<{ session: Session | null; needsTimeConfirmation: boolean }> {
    const active = this.current().sessions.find((session) => session.status === 'running');
    if (!active) return { session: null, needsTimeConfirmation: false };
    const result = recoverSession(active, this.clock.now());
    if (result.session !== active) {
      const next = this.getSnapshot();
      next.sessions[next.sessions.findIndex((session) => session.id === active.id)] = result.session;
      await this.commit(next);
      if (result.session.status === 'ended') void this.notifications.cancelCountdown(active.id).catch(() => undefined);
    }
    return { session: structuredClone(result.session), needsTimeConfirmation: result.needsTimeConfirmation };
  }

  async settle(sessionId: string, draft: SettlementInput): Promise<RewardLedgerEntry> {
    const existing = this.current().rewardEntries.find((entry) => entry.idempotencyKey === `settle:${sessionId}:v1`);
    if (existing) return structuredClone(existing);

    const next = this.getSnapshot();
    const session = this.findSession(next, sessionId);
    if (session.status !== 'ended') throw new ValidationError('只有已结束的专注可以结算');
    let settlement = normalizeSettlement(draft);
    const goal = next.goals.find((candidate) => candidate.id === session.goalId);
    const activity = next.activities.find((candidate) => candidate.id === session.activityTemplateId);
    if (!goal || !activity) throw new ValidationError('结算关联的目标或活动不存在');
    if (goal.feedback.type === 'progress' && session.endType === 'completed' && settlement.completionRatio >= 0.5 && settlement.quantity === null) {
      throw new ValidationError(`请填写本次完成的${goal.feedback.unit}数量`);
    }
    if (goal.feedback.type === 'progress') settlement = { ...settlement, quantityUnit: goal.feedback.unit };
    const now = this.clock.now();
    const settledSession: Session = { ...session, status: 'settled', settlement, settledAt: now };
    const repeatIndex = next.sessions.filter((candidate) =>
      candidate.activityTemplateId === session.activityTemplateId &&
      candidate.status === 'settled' &&
      candidate.endType !== 'abandoned' &&
      (candidate.settlement?.completionRatio ?? 0) > 0 &&
      candidate.settledAt !== null &&
      candidate.settledAt >= now - 30 * 60_000,
    ).length;
    const xp = calculateXp(settledSession, activity.rewardWeight, repeatIndex);
    const entry: RewardLedgerEntry = {
      id: this.ids.next(),
      sessionId,
      goalId: session.goalId,
      entryType: 'settlement',
      globalXpDelta: xp,
      goalXpDelta: xp,
      ruleVersion: 1,
      idempotencyKey: `settle:${sessionId}:v1`,
      reversalOfEntryId: null,
      createdAt: now,
    };
    next.sessions[next.sessions.findIndex((candidate) => candidate.id === sessionId)] = settledSession;
    next.rewardEntries.push(entry);
    next.companionProjection = rebuildCompanionProjection(next.rewardEntries, now);
    await this.commit(next);
    return structuredClone(entry);
  }

  async undoSettlement(sessionId: string): Promise<RewardLedgerEntry> {
    const next = this.getSnapshot();
    const settlementEntry = next.rewardEntries.find((entry) => entry.sessionId === sessionId && entry.entryType === 'settlement');
    if (!settlementEntry) throw new ValidationError('该记录没有可撤销的结算');
    const existing = next.rewardEntries.find((entry) => entry.reversalOfEntryId === settlementEntry.id);
    if (existing) return structuredClone(existing);
    const session = this.findSession(next, sessionId);
    if (session.status !== 'settled') throw new ValidationError('该记录已撤销或状态不允许撤销');
    const now = this.clock.now();
    const reversalCreatedAt = Math.max(now, settlementEntry.createdAt);
    const reversal: RewardLedgerEntry = {
      id: this.ids.next(),
      sessionId,
      goalId: settlementEntry.goalId,
      entryType: 'reversal',
      globalXpDelta: -settlementEntry.globalXpDelta,
      goalXpDelta: -settlementEntry.goalXpDelta,
      ruleVersion: 1,
      idempotencyKey: `reverse:${settlementEntry.id}`,
      reversalOfEntryId: settlementEntry.id,
      createdAt: reversalCreatedAt,
    };
    session.status = 'voided';
    next.rewardEntries.push(reversal);
    next.companionProjection = rebuildCompanionProjection(next.rewardEntries, now);
    await this.commit(next);
    return structuredClone(reversal);
  }

  async updateSessionNote(sessionId: string, note: string): Promise<void> {
    if (note.trim().length > 2_000) throw new ValidationError('备注不能超过 2000 个字符');
    const next = this.getSnapshot();
    const session = this.findSession(next, sessionId);
    if (!session.settlement) throw new ValidationError('未结算记录不能编辑备注');
    session.settlement.userNote = note.trim();
    await this.commit(next);
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    const next = this.getSnapshot();
    next.settings = normalizeAppSettings(settings);
    await this.commit(next);
  }

  private currentProviderBinding(): ProviderBinding {
    const provider = this.current().settings.ai.provider;
    return { protocol: provider.protocol, baseUrl: provider.baseUrl };
  }

  async saveProviderCredentials(credentials: ProviderCredentials): Promise<void> {
    await this.secretStore.writeProviderCredentials(this.currentProviderBinding(), credentials);
  }

  async hasProviderCredentials(): Promise<boolean> {
    return this.secretStore.hasProviderCredentials(this.currentProviderBinding());
  }

  async deleteProviderCredentials(): Promise<void> {
    await this.secretStore.deleteProviderCredentials();
  }

  exportData(): string {
    return JSON.stringify(buildExportEnvelope(this.current(), this.clock.now()));
  }

  async exportToFile(): Promise<void> {
    const filename = `self-improvement-tracker-${new Date(this.clock.now()).toISOString().slice(0, 10)}.json`;
    await this.exportFiles.save(this.exportData(), filename);
  }

  getRecoveryExportStatus(): Pick<RecoveryExport, 'sourceVersion' | 'settingsRecovered'> | null {
    if (!this.recoveryExport) return null;
    return {
      sourceVersion: this.recoveryExport.sourceVersion,
      settingsRecovered: this.recoveryExport.settingsRecovered,
    };
  }

  async exportRecoveryToFile(): Promise<void> {
    if (!this.recoveryExport) throw new ValidationError('当前没有可安全导出的恢复数据');
    const filename = `self-improvement-tracker-recovery-${new Date(this.clock.now()).toISOString().slice(0, 10)}.json`;
    await this.exportFiles.save(this.recoveryExport.contents, filename);
  }

  private prepareImport(serialized: string): { sourceVersion: 1 | 2 | 3; snapshot: AppSnapshot } {
    try {
      assertEnvelopeTextWithinBudget(serialized);
    } catch {
      throw new ValidationError('导入文件超过 20 MiB 上限');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      throw new ValidationError('导入文件不是有效 JSON');
    }
    const validated = validateImportEnvelope(parsed);
    const migrated = migrateSnapshot(validated.snapshot).snapshot;
    return {
      sourceVersion: validated.sourceVersion,
      snapshot: {
        ...migrated,
        companionProjection: rebuildCompanionProjection(migrated.rewardEntries, this.clock.now()),
      },
    };
  }

  previewImport(serialized: string): ImportPreview {
    const prepared = this.prepareImport(serialized);
    return summarizeImport(prepared.sourceVersion, prepared.snapshot);
  }

  async confirmImport(serialized: string): Promise<void> {
    const prepared = this.prepareImport(serialized);
    await this.commit(prepared.snapshot);
  }

  async clearAllData(): Promise<void> {
    await this.commit(this.emptySnapshot());
  }

  async installDevelopmentSeed(): Promise<{ goals: number; activities: number }> {
    const next = this.getSnapshot();
    if (hasDevelopmentSeedFacts(next)) throw new ValidationError('开发种子保留 ID 已存在，请先清除开发种子');
    const seed = createDevelopmentSeedFacts(this.clock.now());
    next.goals.push(...seed.goals);
    next.activities.push(...seed.activities);
    await this.commit(next);
    return { goals: seed.goals.length, activities: seed.activities.length };
  }

  async clearDevelopmentSeed(): Promise<DevelopmentSeedRemovedCounts> {
    const result = clearDevelopmentSeedFacts(this.current(), this.clock.now());
    if (result.changed) await this.commit(result.snapshot);
    return result.removed;
  }

  getElapsedMinutes(sessionId: string): number {
    const session = this.findSession(this.current(), sessionId);
    return elapsedMs(session, this.clock.now()) / 60_000;
  }
}
