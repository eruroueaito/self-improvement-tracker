/**
 * 模块名称：版本化导入校验
 * 职责描述：在替换本地数据前完整校验 V1/V2 导出格式、字段边界、引用和账本一致性
 * 输入/输出：接收未知 JSON 值，返回经过校验的版本化快照或抛出 ValidationError
 * 依赖关系：领域校验器、版本化快照、应用设置与领域类型
 * 注意事项：宠物投影仅验证存在，调用方必须从奖励账本重建而非信任缓存
 */
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import { normalizeActivityDraft, normalizeGoalDraft, ValidationError } from '../modules/goals/validation';
import type { RecommendationRun } from '../modules/recommendations/types';
import type { CompanionProjection, RewardLedgerEntry } from '../modules/rewards/types';
import { normalizeSettlement } from '../modules/sessions/sessionMachine';
import type { Session } from '../modules/sessions/types';
import { normalizeAppSettings } from '../modules/settings/settings';
import type { PersistedSnapshot } from './snapshots';

export interface ValidatedImportData {
  goals: Goal[];
  activities: ActivityTemplate[];
  recommendationRuns: RecommendationRun[];
  sessions: Session[];
  rewardEntries: RewardLedgerEntry[];
  companionProjection: CompanionProjection;
}

type RecordValue = Record<string, unknown>;

const FACT_KEYS = ['goals', 'activities', 'recommendationRuns', 'sessions', 'rewardEntries', 'companionProjection'] as const;
const SCORE_PART_KEYS = [
  'importance',
  'cadenceNeed',
  'recencyNeed',
  'timeFit',
  'energyFit',
  'varietyBonus',
  'explicitDismissPenalty',
  'recentCompletionPenalty',
] as const;

const record = (value: unknown, label: string): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${label}必须是对象`);
  return value as RecordValue;
};

const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new ValidationError(`${label}必须是数组`);
  return value;
};

const assertExactKeys = (value: RecordValue, expected: readonly string[], label: string): void => {
  const unknown = Object.keys(value).filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0) throw new ValidationError(`${label}包含不受支持的字段：${unknown.join(', ')}`);
  if (missing.length > 0) throw new ValidationError(`${label}缺少字段：${missing.join(', ')}`);
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) throw new ValidationError(`${label}必须是非空字符串`);
  return value;
};

const finite = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(`${label}必须是有限数字`);
  return value;
};

const nullableFinite = (value: unknown, label: string): number | null =>
  value === null ? null : finite(value, label);

const boundedString = (value: unknown, label: string, maximum: number): string => {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new ValidationError(`${label}必须是最多 ${maximum} 个字符的字符串`);
  }
  return value;
};

const rating = (value: unknown, label: string): void => {
  if (typeof value !== 'number' || ![1, 2, 3, 4, 5].includes(value)) {
    throw new ValidationError(`${label}必须是 1–5 的整数`);
  }
};

const nullableRating = (value: unknown, label: string): void => {
  if (value !== null) rating(value, label);
};

const assertUniqueIds = (items: RecordValue[], label: string): Set<string> => {
  const ids = items.map((item, index) => text(item.id, `${label}[${index}].id`));
  const unique = new Set(ids);
  if (unique.size !== ids.length) throw new ValidationError(`${label}包含重复 ID`);
  return unique;
};

export const validateSnapshotFacts = (value: unknown): ValidatedImportData => {
  const data = record(value, 'data');
  const goalRows = array(data.goals, 'goals').map((item, index) => record(item, `goals[${index}]`));
  const activityRows = array(data.activities, 'activities').map((item, index) => record(item, `activities[${index}]`));
  const runRows = array(data.recommendationRuns, 'recommendationRuns').map((item, index) => record(item, `recommendationRuns[${index}]`));
  const sessionRows = array(data.sessions, 'sessions').map((item, index) => record(item, `sessions[${index}]`));
  const rewardRows = array(data.rewardEntries, 'rewardEntries').map((item, index) => record(item, `rewardEntries[${index}]`));
  const projection = record(data.companionProjection, 'companionProjection');
  assertExactKeys(projection, ['globalXp', 'level', 'evolutionStage', 'mood', 'lastUpdatedAt'], 'companionProjection');
  finite(projection.globalXp, 'companionProjection.globalXp');
  finite(projection.level, 'companionProjection.level');
  finite(projection.lastUpdatedAt, 'companionProjection.lastUpdatedAt');
  if (!['seed', 'sprout', 'companion'].includes(String(projection.evolutionStage))) {
    throw new ValidationError('companionProjection.evolutionStage 无效');
  }
  if (!['idle', 'working', 'celebrating', 'sleeping'].includes(String(projection.mood))) {
    throw new ValidationError('companionProjection.mood 无效');
  }

  const goalIds = assertUniqueIds(goalRows, 'goals');
  const activityIds = assertUniqueIds(activityRows, 'activities');
  const runIds = assertUniqueIds(runRows, 'recommendationRuns');
  const sessionIds = assertUniqueIds(sessionRows, 'sessions');
  const rewardIds = assertUniqueIds(rewardRows, 'rewardEntries');

  goalRows.forEach((goal, index) => {
    assertExactKeys(goal, ['id', 'title', 'description', 'status', 'importance', 'feedback', 'desiredCadenceDays', 'minimumRestHours', 'defaultEnergyCost', 'createdAt', 'updatedAt'], `goals[${index}]`);
    if (!['active', 'paused', 'archived'].includes(String(goal.status))) throw new ValidationError(`goals[${index}].status 无效`);
    rating(goal.importance, `goals[${index}].importance`);
    rating(goal.defaultEnergyCost, `goals[${index}].defaultEnergyCost`);
    const feedback = record(goal.feedback, `goals[${index}].feedback`);
    const type = feedback.type;
    assertExactKeys(
      feedback,
      type === 'progress' ? ['type', 'baseline', 'target', 'unit'] : type === 'cumulative' ? ['type', 'unit'] : ['type'],
      `goals[${index}].feedback`,
    );
    const normalizedFeedback = type === 'progress'
      ? { type: 'progress' as const, baseline: finite(feedback.baseline, 'baseline'), target: finite(feedback.target, 'target'), unit: text(feedback.unit, 'unit') }
      : type === 'cumulative' && (feedback.unit === 'minutes' || feedback.unit === 'times')
        ? { type: 'cumulative' as const, unit: feedback.unit as 'minutes' | 'times' }
        : type === 'experience'
          ? { type: 'experience' as const }
          : null;
    if (!normalizedFeedback) throw new ValidationError(`goals[${index}].feedback 无效`);
    normalizeGoalDraft({
      title: text(goal.title, `goals[${index}].title`),
      description: boundedString(goal.description, `goals[${index}].description`, 2_000),
      importance: finite(goal.importance, 'importance') as Goal['importance'],
      feedback: normalizedFeedback,
      desiredCadenceDays: goal.desiredCadenceDays as number | null,
      minimumRestHours: finite(goal.minimumRestHours, 'minimumRestHours'),
      defaultEnergyCost: finite(goal.defaultEnergyCost, 'defaultEnergyCost') as Goal['defaultEnergyCost'],
    });
    finite(goal.createdAt, 'createdAt');
    finite(goal.updatedAt, 'updatedAt');
  });

  activityRows.forEach((activity, index) => {
    assertExactKeys(activity, ['id', 'goalId', 'title', 'description', 'minimumMinutes', 'maximumMinutes', 'energyCost', 'contexts', 'minimumRestHours', 'suggestedCadenceDays', 'rewardWeight', 'createdAt', 'archivedAt'], `activities[${index}]`);
    rating(activity.energyCost, `activities[${index}].energyCost`);
    if (!goalIds.has(text(activity.goalId, `activities[${index}].goalId`))) throw new ValidationError('活动引用了不存在的目标');
    const contexts = array(activity.contexts, `activities[${index}].contexts`).map((item) => text(item, 'context'));
    normalizeActivityDraft({
      title: text(activity.title, `activities[${index}].title`),
      description: boundedString(activity.description, `activities[${index}].description`, 2_000),
      minimumMinutes: finite(activity.minimumMinutes, 'minimumMinutes'),
      maximumMinutes: finite(activity.maximumMinutes, 'maximumMinutes'),
      energyCost: finite(activity.energyCost, 'energyCost') as ActivityTemplate['energyCost'],
      contexts,
      minimumRestHours: activity.minimumRestHours as number | null,
      suggestedCadenceDays: activity.suggestedCadenceDays as number | null,
      rewardWeight: finite(activity.rewardWeight, 'rewardWeight'),
    });
    finite(activity.createdAt, 'createdAt');
    if (activity.archivedAt !== null) finite(activity.archivedAt, 'archivedAt');
  });

  runRows.forEach((run, index) => {
    assertExactKeys(run, ['id', 'requestedAt', 'context', 'candidates', 'chosenActivityTemplateId', 'dismissedActivityTemplateIds'], `recommendationRuns[${index}]`);
    finite(run.requestedAt, `recommendationRuns[${index}].requestedAt`);
    const context = record(run.context, 'RollContext');
    assertExactKeys(context, ['availableMinutes', 'energy', 'contexts'], `recommendationRuns[${index}].context`);
    const minutes = finite(context.availableMinutes, 'availableMinutes');
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) throw new ValidationError('Roll 可用分钟无效');
    if (context.energy !== null && (typeof context.energy !== 'number' || ![1, 2, 3, 4, 5].includes(context.energy))) {
      throw new ValidationError('Roll 精力无效');
    }
    array(context.contexts, 'Roll contexts').forEach((item) => text(item, 'context'));
    array(run.candidates, 'candidates').forEach((item, candidateIndex) => {
      const candidate = record(item, 'candidate');
      assertExactKeys(candidate, ['activityTemplateId', 'goalId', 'suggestedMinutes', 'score', 'scoreParts', 'reasonCodes'], `recommendationRuns[${index}].candidates[${candidateIndex}]`);
      if (!activityIds.has(text(candidate.activityTemplateId, 'candidate.activityTemplateId'))) throw new ValidationError('候选引用了不存在的活动');
      if (!goalIds.has(text(candidate.goalId, 'candidate.goalId'))) throw new ValidationError('候选引用了不存在的目标');
      finite(candidate.suggestedMinutes, 'suggestedMinutes');
      finite(candidate.score, 'score');
      const scoreParts = record(candidate.scoreParts, 'scoreParts');
      assertExactKeys(scoreParts, SCORE_PART_KEYS, `recommendationRuns[${index}].candidates[${candidateIndex}].scoreParts`);
      SCORE_PART_KEYS.forEach((key) => finite(scoreParts[key], `scoreParts.${key}`));
      array(candidate.reasonCodes, 'reasonCodes').forEach((item) => text(item, 'reasonCode'));
    });
    if (run.chosenActivityTemplateId !== null && !activityIds.has(text(run.chosenActivityTemplateId, 'chosenActivityTemplateId'))) throw new ValidationError('chosen 活动不存在');
    array(run.dismissedActivityTemplateIds, 'dismissedActivityTemplateIds').forEach((id) => {
      if (!activityIds.has(text(id, 'dismissedActivityTemplateId'))) throw new ValidationError('dismissed 活动不存在');
    });
  });

  sessionRows.forEach((session, index) => {
    assertExactKeys(session, ['id', 'goalId', 'activityTemplateId', 'recommendationRunId', 'timerMode', 'status', 'plannedMinutes', 'startedAt', 'runningSince', 'accumulatedMs', 'targetDurationMs', 'lastHeartbeatAt', 'endedAt', 'endType', 'settlement', 'createdAt', 'settledAt'], `sessions[${index}]`);
    if (!goalIds.has(text(session.goalId, `sessions[${index}].goalId`))) throw new ValidationError('Session 引用了不存在的目标');
    if (!activityIds.has(text(session.activityTemplateId, `sessions[${index}].activityTemplateId`))) throw new ValidationError('Session 引用了不存在的活动');
    if (session.recommendationRunId !== null && !runIds.has(text(session.recommendationRunId, 'recommendationRunId'))) throw new ValidationError('Session 引用了不存在的 Roll');
    if (!['flowtime', 'countdown'].includes(String(session.timerMode))) throw new ValidationError('Session timerMode 无效');
    if (!['running', 'paused', 'ended', 'settled', 'voided'].includes(String(session.status))) throw new ValidationError('Session status 无效');
    if (session.endType !== null && !['completed', 'interrupted', 'abandoned'].includes(String(session.endType))) throw new ValidationError('Session endType 无效');
    ['startedAt', 'accumulatedMs', 'lastHeartbeatAt', 'createdAt'].forEach((field) => finite(session[field], field));
    const plannedMinutes = nullableFinite(session.plannedMinutes, `sessions[${index}].plannedMinutes`);
    if (plannedMinutes !== null && (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 480)) {
      throw new ValidationError(`sessions[${index}].plannedMinutes 必须是 1–480 的整数或 null`);
    }
    nullableFinite(session.runningSince, `sessions[${index}].runningSince`);
    const targetDurationMs = nullableFinite(session.targetDurationMs, `sessions[${index}].targetDurationMs`);
    if (targetDurationMs !== null && targetDurationMs <= 0) {
      throw new ValidationError(`sessions[${index}].targetDurationMs 必须大于 0 或为 null`);
    }
    if (session.settledAt !== null) finite(session.settledAt, 'settledAt');
    if (session.endedAt !== null) finite(session.endedAt, 'endedAt');
    if (session.settlement !== null) {
      const settlement = record(session.settlement, 'settlement');
      assertExactKeys(settlement, ['actualMinutes', 'completionRatio', 'difficulty', 'effort', 'quantity', 'quantityUnit', 'userNote'], `sessions[${index}].settlement`);
      nullableRating(settlement.difficulty, `sessions[${index}].settlement.difficulty`);
      nullableRating(settlement.effort, `sessions[${index}].settlement.effort`);
      normalizeSettlement(settlement as unknown as Parameters<typeof normalizeSettlement>[0]);
    }
    if ((session.status === 'settled' || session.status === 'voided') && (session.settlement === null || session.settledAt === null || session.endType === null)) {
      throw new ValidationError('已结算 Session 缺少结算事实');
    }
  });
  if (sessionRows.filter((session) => session.status === 'running' || session.status === 'paused').length > 1) throw new ValidationError('导入数据包含多个进行中 Session');

  const idempotencyKeys = new Set<string>();
  rewardRows.forEach((entry, index) => {
    assertExactKeys(entry, ['id', 'sessionId', 'goalId', 'entryType', 'globalXpDelta', 'goalXpDelta', 'ruleVersion', 'idempotencyKey', 'reversalOfEntryId', 'createdAt'], `rewardEntries[${index}]`);
    if (!sessionIds.has(text(entry.sessionId, `rewardEntries[${index}].sessionId`))) throw new ValidationError('奖励引用了不存在的 Session');
    if (!goalIds.has(text(entry.goalId, `rewardEntries[${index}].goalId`))) throw new ValidationError('奖励引用了不存在的目标');
    if (!['settlement', 'reversal'].includes(String(entry.entryType)) || entry.ruleVersion !== 1) throw new ValidationError('奖励类型或规则版本无效');
    if (entry.reversalOfEntryId !== null) text(entry.reversalOfEntryId, `rewardEntries[${index}].reversalOfEntryId`);
    const key = text(entry.idempotencyKey, 'idempotencyKey');
    if (idempotencyKeys.has(key)) throw new ValidationError('奖励包含重复幂等键');
    idempotencyKeys.add(key);
    finite(entry.globalXpDelta, 'globalXpDelta');
    finite(entry.goalXpDelta, 'goalXpDelta');
    finite(entry.createdAt, 'createdAt');
    if (entry.entryType === 'reversal' && (entry.reversalOfEntryId === null || !rewardIds.has(text(entry.reversalOfEntryId, 'reversalOfEntryId')))) {
      throw new ValidationError('反向奖励缺少原始账目');
    }
  });

  const rewardsById = new Map(rewardRows.map((entry) => [String(entry.id), entry]));
  rewardRows.filter((entry) => entry.entryType === 'reversal').forEach((reversal) => {
    const original = rewardsById.get(String(reversal.reversalOfEntryId));
    if (!original || original.entryType !== 'settlement') throw new ValidationError('反向奖励必须引用原始结算账目');
    if (
      reversal.sessionId !== original.sessionId ||
      reversal.goalId !== original.goalId ||
      reversal.globalXpDelta !== -Number(original.globalXpDelta) ||
      reversal.goalXpDelta !== -Number(original.goalXpDelta)
    ) {
      throw new ValidationError('反向奖励与原始账目不一致');
    }
  });

  return {
    goals: structuredClone(goalRows) as unknown as Goal[],
    activities: structuredClone(activityRows) as unknown as ActivityTemplate[],
    recommendationRuns: structuredClone(runRows) as unknown as RecommendationRun[],
    sessions: structuredClone(sessionRows) as unknown as Session[],
    rewardEntries: structuredClone(rewardRows) as unknown as RewardLedgerEntry[],
    companionProjection: structuredClone(projection) as unknown as CompanionProjection,
  };
};

export interface ValidatedImportEnvelope {
  sourceVersion: 1 | 2;
  snapshot: PersistedSnapshot;
}

export const validateImportEnvelope = (value: unknown): ValidatedImportEnvelope => {
  const envelope = record(value, '导入文件');
  assertExactKeys(envelope, ['format', 'version', 'exportedAt', 'data'], '导入文件');
  if (envelope.format !== 'self-improvement-tracker' || (envelope.version !== 1 && envelope.version !== 2)) {
    throw new ValidationError('导入文件格式或版本不受支持');
  }
  finite(envelope.exportedAt, '导入文件.exportedAt');
  const data = record(envelope.data, '导入文件.data');
  const sourceVersion = envelope.version;
  assertExactKeys(data, sourceVersion === 1 ? FACT_KEYS : [...FACT_KEYS, 'settings'], '导入文件.data');
  const facts = validateSnapshotFacts(data);
  const snapshot: PersistedSnapshot = sourceVersion === 1
    ? { schemaVersion: 1, ...facts }
    : { schemaVersion: 2, ...facts, settings: normalizeAppSettings(data.settings) };
  return { sourceVersion, snapshot };
};
