/**
 * 模块名称：版本化导入导出
 * 职责描述：构造 v3 白名单备份、导入预览摘要与按来源版本的安全恢复导出
 * 输入/输出：接收已校验快照或未知持久化值，返回版本化 envelope、摘要或安全恢复结果
 * 依赖关系：快照类型、事实校验、应用设置与领域类型
 * 注意事项：所有输出逐字段重建；未知键、Provider 凭据和临时 UI 状态不得透传
 */
import type { FeedbackConfig } from '../modules/goals/types';
import { normalizeAiInteractionHistory } from '../modules/ai/interactionLog';
import {
  createDefaultAppSettings,
  createDefaultAppSettingsV2,
  normalizeAppSettings,
  normalizeAppSettingsV2,
  type AppSettings,
  type AppSettingsV2,
} from '../modules/settings/settings';
import { validateSnapshotFacts } from './importValidation';
import { assertEnvelopeTextWithinBudget, assertSnapshotWithinBudget } from './snapshotBudget';
import type { CurrentAppSnapshot, SnapshotFacts } from './snapshots';

export interface ExportEnvelopeV3 {
  format: 'self-improvement-tracker';
  version: 3;
  exportedAt: number;
  aiHistoryIncluded: boolean;
  data: Omit<CurrentAppSnapshot, 'schemaVersion'>;
}

interface ExportEnvelopeV1 {
  format: 'self-improvement-tracker';
  version: 1;
  exportedAt: number;
  data: SnapshotFacts;
}

interface ExportEnvelopeV2 {
  format: 'self-improvement-tracker';
  version: 2;
  exportedAt: number;
  data: SnapshotFacts & { settings: AppSettingsV2 };
}

export interface ImportPreview {
  sourceVersion: 1 | 2 | 3;
  goalCount: number;
  activityCount: number;
  sessionCount: number;
  rewardCount: number;
  hasActiveSession: boolean;
  settings: AppSettings;
}

export interface RecoveryExport {
  sourceVersion: 1 | 2 | 3;
  settingsRecovered: boolean | null;
  contents: string;
}

const copyFeedback = (feedback: FeedbackConfig): FeedbackConfig => {
  if (feedback.type === 'progress') {
    return { type: 'progress', baseline: feedback.baseline, target: feedback.target, unit: feedback.unit };
  }
  if (feedback.type === 'cumulative') return { type: 'cumulative', unit: feedback.unit };
  return { type: 'experience' };
};

const copySettings = (settings: AppSettings): AppSettings => ({
  theme: settings.theme,
  motion: settings.motion,
  hapticsEnabled: settings.hapticsEnabled,
  notificationsEnabled: settings.notificationsEnabled,
  ai: {
    enabled: settings.ai.enabled,
    goalDraftEnabled: settings.ai.goalDraftEnabled,
    historyEnabled: settings.ai.historyEnabled,
    provider: {
      protocol: settings.ai.provider.protocol,
      baseUrl: settings.ai.provider.baseUrl,
      model: settings.ai.provider.model,
      requestTimeoutMs: settings.ai.provider.requestTimeoutMs,
      structuredOutputMode: settings.ai.provider.structuredOutputMode,
    },
  },
});

const copySettingsV2 = (settings: AppSettingsV2): AppSettingsV2 => ({
  theme: settings.theme,
  motion: settings.motion,
  hapticsEnabled: settings.hapticsEnabled,
  notificationsEnabled: settings.notificationsEnabled,
  ai: {
    enabled: settings.ai.enabled,
    historyEnabled: settings.ai.historyEnabled,
  },
});

export const buildWhitelistedFacts = (snapshot: SnapshotFacts): SnapshotFacts => ({
  goals: snapshot.goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    importance: goal.importance,
    feedback: copyFeedback(goal.feedback),
    desiredCadenceDays: goal.desiredCadenceDays,
    minimumRestHours: goal.minimumRestHours,
    defaultEnergyCost: goal.defaultEnergyCost,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  })),
  activities: snapshot.activities.map((activity) => ({
    id: activity.id,
    goalId: activity.goalId,
    title: activity.title,
    description: activity.description,
    minimumMinutes: activity.minimumMinutes,
    maximumMinutes: activity.maximumMinutes,
    energyCost: activity.energyCost,
    contexts: [...activity.contexts],
    minimumRestHours: activity.minimumRestHours,
    suggestedCadenceDays: activity.suggestedCadenceDays,
    rewardWeight: activity.rewardWeight,
    createdAt: activity.createdAt,
    archivedAt: activity.archivedAt,
  })),
  recommendationRuns: snapshot.recommendationRuns.map((run) => ({
    id: run.id,
    requestedAt: run.requestedAt,
    context: {
      availableMinutes: run.context.availableMinutes,
      energy: run.context.energy,
      contexts: [...run.context.contexts],
    },
    candidates: run.candidates.map((candidate) => ({
      activityTemplateId: candidate.activityTemplateId,
      goalId: candidate.goalId,
      suggestedMinutes: candidate.suggestedMinutes,
      score: candidate.score,
      scoreParts: {
        importance: candidate.scoreParts.importance!,
        cadenceNeed: candidate.scoreParts.cadenceNeed!,
        recencyNeed: candidate.scoreParts.recencyNeed!,
        timeFit: candidate.scoreParts.timeFit!,
        energyFit: candidate.scoreParts.energyFit!,
        varietyBonus: candidate.scoreParts.varietyBonus!,
        explicitDismissPenalty: candidate.scoreParts.explicitDismissPenalty!,
        recentCompletionPenalty: candidate.scoreParts.recentCompletionPenalty!,
      },
      reasonCodes: [...candidate.reasonCodes],
    })),
    chosenActivityTemplateId: run.chosenActivityTemplateId,
    dismissedActivityTemplateIds: [...run.dismissedActivityTemplateIds],
  })),
  sessions: snapshot.sessions.map((session) => ({
    id: session.id,
    goalId: session.goalId,
    activityTemplateId: session.activityTemplateId,
    recommendationRunId: session.recommendationRunId,
    timerMode: session.timerMode,
    status: session.status,
    plannedMinutes: session.plannedMinutes,
    startedAt: session.startedAt,
    runningSince: session.runningSince,
    accumulatedMs: session.accumulatedMs,
    targetDurationMs: session.targetDurationMs,
    lastHeartbeatAt: session.lastHeartbeatAt,
    endedAt: session.endedAt,
    endType: session.endType,
    settlement: session.settlement === null ? null : {
      actualMinutes: session.settlement.actualMinutes,
      completionRatio: session.settlement.completionRatio,
      difficulty: session.settlement.difficulty,
      effort: session.settlement.effort,
      quantity: session.settlement.quantity,
      quantityUnit: session.settlement.quantityUnit,
      userNote: session.settlement.userNote,
    },
    createdAt: session.createdAt,
    settledAt: session.settledAt,
  })),
  rewardEntries: snapshot.rewardEntries.map((entry) => ({
    id: entry.id,
    sessionId: entry.sessionId,
    goalId: entry.goalId,
    entryType: entry.entryType,
    globalXpDelta: entry.globalXpDelta,
    goalXpDelta: entry.goalXpDelta,
    ruleVersion: entry.ruleVersion,
    idempotencyKey: entry.idempotencyKey,
    reversalOfEntryId: entry.reversalOfEntryId,
    createdAt: entry.createdAt,
  })),
  companionProjection: {
    globalXp: snapshot.companionProjection.globalXp,
    level: snapshot.companionProjection.level,
    evolutionStage: snapshot.companionProjection.evolutionStage,
    mood: snapshot.companionProjection.mood,
    lastUpdatedAt: snapshot.companionProjection.lastUpdatedAt,
  },
});

const assertEnvelopeObjectWithinBudget = (envelope: unknown): void => {
  assertEnvelopeTextWithinBudget(JSON.stringify(envelope));
};

export const buildExportEnvelope = (
  snapshot: CurrentAppSnapshot,
  exportedAt: number,
  options: { includeAiHistory?: boolean } = {},
): ExportEnvelopeV3 => {
  assertSnapshotWithinBudget(snapshot);
  const aiHistoryIncluded = options.includeAiHistory === true;
  const envelope: ExportEnvelopeV3 = {
    format: 'self-improvement-tracker',
    version: 3,
    exportedAt,
    aiHistoryIncluded,
    data: {
      ...buildWhitelistedFacts(snapshot),
      settings: copySettings(snapshot.settings),
      aiInteractions: aiHistoryIncluded ? normalizeAiInteractionHistory(snapshot.aiInteractions) : [],
    },
  };
  assertEnvelopeObjectWithinBudget(envelope);
  return envelope;
};

export const summarizeImport = (
  sourceVersion: 1 | 2 | 3,
  snapshot: CurrentAppSnapshot,
): ImportPreview => ({
  sourceVersion,
  goalCount: snapshot.goals.length,
  activityCount: snapshot.activities.length,
  sessionCount: snapshot.sessions.length,
  rewardCount: snapshot.rewardEntries.length,
  hasActiveSession: snapshot.sessions.some((session) => session.status === 'running' || session.status === 'paused'),
  settings: copySettings(snapshot.settings),
});

export const buildRecoveryExport = (value: unknown, exportedAt: number): RecoveryExport | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.schemaVersion !== 1 && snapshot.schemaVersion !== 2 && snapshot.schemaVersion !== 3) return null;

  let facts: SnapshotFacts;
  try {
    facts = buildWhitelistedFacts(validateSnapshotFacts(snapshot));
  } catch {
    return null;
  }

  if (snapshot.schemaVersion === 1) {
    const envelope: ExportEnvelopeV1 = {
      format: 'self-improvement-tracker',
      version: 1,
      exportedAt,
      data: facts,
    };
    const contents = JSON.stringify(envelope);
    try { assertEnvelopeTextWithinBudget(contents); } catch { return null; }
    return { sourceVersion: 1, settingsRecovered: null, contents };
  }

  if (snapshot.schemaVersion === 2) {
    let settings: AppSettingsV2;
    let settingsRecovered = true;
    try {
      settings = normalizeAppSettingsV2(snapshot.settings);
    } catch {
      settings = createDefaultAppSettingsV2();
      settingsRecovered = false;
    }
    const envelope: ExportEnvelopeV2 = {
      format: 'self-improvement-tracker',
      version: 2,
      exportedAt,
      data: { ...facts, settings: copySettingsV2(settings) },
    };
    const contents = JSON.stringify(envelope);
    try { assertEnvelopeTextWithinBudget(contents); } catch { return null; }
    return { sourceVersion: 2, settingsRecovered, contents };
  }

  let settings: AppSettings;
  let settingsRecovered = true;
  try {
    settings = normalizeAppSettings(snapshot.settings);
  } catch {
    settings = createDefaultAppSettings();
    settingsRecovered = false;
  }
  const envelope: ExportEnvelopeV3 = {
    format: 'self-improvement-tracker',
    version: 3,
    exportedAt,
    aiHistoryIncluded: false,
    data: { ...facts, settings: copySettings(settings), aiInteractions: [] },
  };
  const contents = JSON.stringify(envelope);
  try { assertEnvelopeTextWithinBudget(contents); } catch { return null; }
  return { sourceVersion: 3, settingsRecovered, contents };
};
