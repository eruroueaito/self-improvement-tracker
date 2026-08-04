/**
 * 模块名称：版本化导入校验
 * 职责描述：在替换本地数据前完整校验 V1 导出格式、字段边界、引用和账本一致性
 * 输入/输出：接收未知 JSON 值，返回经过校验的领域事实集合或抛出 ValidationError
 * 依赖关系：领域校验器、应用快照与领域类型
 * 注意事项：宠物投影仅验证存在，调用方必须从奖励账本重建而非信任缓存
 */
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import { normalizeActivityDraft, normalizeGoalDraft, ValidationError } from '../modules/goals/validation';
import type { RecommendationRun } from '../modules/recommendations/types';
import type { RewardLedgerEntry } from '../modules/rewards/types';
import { normalizeSettlement } from '../modules/sessions/sessionMachine';
import type { Session } from '../modules/sessions/types';

export interface ValidatedImportData {
  goals: Goal[];
  activities: ActivityTemplate[];
  recommendationRuns: RecommendationRun[];
  sessions: Session[];
  rewardEntries: RewardLedgerEntry[];
}

type RecordValue = Record<string, unknown>;

const record = (value: unknown, label: string): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${label}必须是对象`);
  return value as RecordValue;
};

const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new ValidationError(`${label}必须是数组`);
  return value;
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) throw new ValidationError(`${label}必须是非空字符串`);
  return value;
};

const finite = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(`${label}必须是有限数字`);
  return value;
};

const assertUniqueIds = (items: RecordValue[], label: string): Set<string> => {
  const ids = items.map((item, index) => text(item.id, `${label}[${index}].id`));
  const unique = new Set(ids);
  if (unique.size !== ids.length) throw new ValidationError(`${label}包含重复 ID`);
  return unique;
};

export const validateImportEnvelope = (value: unknown): ValidatedImportData => {
  const envelope = record(value, '导入文件');
  if (envelope.format !== 'self-improvement-tracker' || envelope.version !== 1) {
    throw new ValidationError('导入文件格式或版本不受支持');
  }
  const data = record(envelope.data, 'data');
  const goalRows = array(data.goals, 'goals').map((item, index) => record(item, `goals[${index}]`));
  const activityRows = array(data.activities, 'activities').map((item, index) => record(item, `activities[${index}]`));
  const runRows = array(data.recommendationRuns, 'recommendationRuns').map((item, index) => record(item, `recommendationRuns[${index}]`));
  const sessionRows = array(data.sessions, 'sessions').map((item, index) => record(item, `sessions[${index}]`));
  const rewardRows = array(data.rewardEntries, 'rewardEntries').map((item, index) => record(item, `rewardEntries[${index}]`));
  record(data.companionProjection, 'companionProjection');

  const goalIds = assertUniqueIds(goalRows, 'goals');
  const activityIds = assertUniqueIds(activityRows, 'activities');
  const runIds = assertUniqueIds(runRows, 'recommendationRuns');
  const sessionIds = assertUniqueIds(sessionRows, 'sessions');
  const rewardIds = assertUniqueIds(rewardRows, 'rewardEntries');

  goalRows.forEach((goal, index) => {
    if (!['active', 'paused', 'archived'].includes(String(goal.status))) throw new ValidationError(`goals[${index}].status 无效`);
    const feedback = record(goal.feedback, `goals[${index}].feedback`);
    const type = feedback.type;
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
      description: typeof goal.description === 'string' ? goal.description : '',
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
    if (!goalIds.has(text(activity.goalId, `activities[${index}].goalId`))) throw new ValidationError('活动引用了不存在的目标');
    const contexts = array(activity.contexts, `activities[${index}].contexts`).map((item) => text(item, 'context'));
    normalizeActivityDraft({
      title: text(activity.title, `activities[${index}].title`),
      description: typeof activity.description === 'string' ? activity.description : '',
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
    finite(run.requestedAt, `recommendationRuns[${index}].requestedAt`);
    const context = record(run.context, 'RollContext');
    const minutes = finite(context.availableMinutes, 'availableMinutes');
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) throw new ValidationError('Roll 可用分钟无效');
    if (context.energy !== null && ![1, 2, 3, 4, 5].includes(Number(context.energy))) throw new ValidationError('Roll 精力无效');
    array(context.contexts, 'Roll contexts').forEach((item) => text(item, 'context'));
    array(run.candidates, 'candidates').forEach((item) => {
      const candidate = record(item, 'candidate');
      if (!activityIds.has(text(candidate.activityTemplateId, 'candidate.activityTemplateId'))) throw new ValidationError('候选引用了不存在的活动');
      if (!goalIds.has(text(candidate.goalId, 'candidate.goalId'))) throw new ValidationError('候选引用了不存在的目标');
      finite(candidate.suggestedMinutes, 'suggestedMinutes');
      finite(candidate.score, 'score');
      record(candidate.scoreParts, 'scoreParts');
      array(candidate.reasonCodes, 'reasonCodes');
    });
    if (run.chosenActivityTemplateId !== null && !activityIds.has(text(run.chosenActivityTemplateId, 'chosenActivityTemplateId'))) throw new ValidationError('chosen 活动不存在');
    array(run.dismissedActivityTemplateIds, 'dismissedActivityTemplateIds').forEach((id) => {
      if (!activityIds.has(text(id, 'dismissedActivityTemplateId'))) throw new ValidationError('dismissed 活动不存在');
    });
  });

  sessionRows.forEach((session, index) => {
    if (!goalIds.has(text(session.goalId, `sessions[${index}].goalId`))) throw new ValidationError('Session 引用了不存在的目标');
    if (!activityIds.has(text(session.activityTemplateId, `sessions[${index}].activityTemplateId`))) throw new ValidationError('Session 引用了不存在的活动');
    if (session.recommendationRunId !== null && !runIds.has(text(session.recommendationRunId, 'recommendationRunId'))) throw new ValidationError('Session 引用了不存在的 Roll');
    if (!['flowtime', 'countdown'].includes(String(session.timerMode))) throw new ValidationError('Session timerMode 无效');
    if (!['running', 'paused', 'ended', 'settled', 'voided'].includes(String(session.status))) throw new ValidationError('Session status 无效');
    if (session.endType !== null && !['completed', 'interrupted', 'abandoned'].includes(String(session.endType))) throw new ValidationError('Session endType 无效');
    ['startedAt', 'accumulatedMs', 'lastHeartbeatAt', 'createdAt'].forEach((field) => finite(session[field], field));
    if (session.settledAt !== null) finite(session.settledAt, 'settledAt');
    if (session.endedAt !== null) finite(session.endedAt, 'endedAt');
    if (session.settlement !== null) normalizeSettlement(record(session.settlement, 'settlement') as unknown as Parameters<typeof normalizeSettlement>[0]);
    if ((session.status === 'settled' || session.status === 'voided') && (session.settlement === null || session.settledAt === null || session.endType === null)) {
      throw new ValidationError('已结算 Session 缺少结算事实');
    }
  });
  if (sessionRows.filter((session) => session.status === 'running' || session.status === 'paused').length > 1) throw new ValidationError('导入数据包含多个进行中 Session');

  const idempotencyKeys = new Set<string>();
  rewardRows.forEach((entry, index) => {
    if (!sessionIds.has(text(entry.sessionId, `rewardEntries[${index}].sessionId`))) throw new ValidationError('奖励引用了不存在的 Session');
    if (!goalIds.has(text(entry.goalId, `rewardEntries[${index}].goalId`))) throw new ValidationError('奖励引用了不存在的目标');
    if (!['settlement', 'reversal'].includes(String(entry.entryType)) || entry.ruleVersion !== 1) throw new ValidationError('奖励类型或规则版本无效');
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
  };
};
