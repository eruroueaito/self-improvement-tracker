/**
 * 模块名称：确定性 RollEngine
 * 职责描述：依据结构化上下文、目标配置和有效完成历史筛选并稳定排序行动
 * 输入/输出：接收领域快照与 RollContext，返回最多三个候选及无候选原因
 * 依赖关系：Goals、Sessions、Recommendations 领域类型
 * 注意事项：不得使用随机数、网络或 AI；相同输入必须产生相同排序
 */
import type { ActivityTemplate, Goal } from '../goals/types';
import { normalizeContexts, ValidationError } from '../goals/validation';
import type { Session } from '../sessions/types';
import type { EmptyRollReason, RecommendationCandidate, RecommendationRun, RollContext, RollResult } from './types';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const isEffectiveCompletion = (session: Session): boolean =>
  session.status === 'settled' &&
  session.endType === 'completed' &&
  (session.settlement?.completionRatio ?? 0) >= 0.5;

const rounded = (value: number): number => Math.round(value * 1_000) / 1_000;
const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const lastCompletion = (sessions: Session[], predicate: (session: Session) => boolean): Session | undefined =>
  sessions
    .filter((session) => isEffectiveCompletion(session) && predicate(session))
    .sort((left, right) => (right.settledAt ?? 0) - (left.settledAt ?? 0) || left.id.localeCompare(right.id))[0];

const hasRequiredContexts = (activity: ActivityTemplate, context: RollContext): boolean =>
  context.contexts.length === 0 || activity.contexts.every((value) => context.contexts.includes(value));

const restSatisfied = (activity: ActivityTemplate, goal: Goal, sessions: Session[], now: number): boolean => {
  const previous = lastCompletion(sessions, (session) => session.activityTemplateId === activity.id);
  if (!previous) return true;
  const requiredHours = activity.minimumRestHours ?? goal.minimumRestHours;
  return now - (previous.settledAt ?? previous.endedAt ?? 0) >= requiredHours * HOUR_MS;
};

const buildCandidate = (
  activity: ActivityTemplate,
  goal: Goal,
  sessions: Session[],
  runs: RecommendationRun[],
  context: RollContext,
  now: number,
): RecommendationCandidate => {
  const suggestedMinutes = clamp(context.availableMinutes, activity.minimumMinutes, activity.maximumMinutes);
  const activityLast = lastCompletion(sessions, (session) => session.activityTemplateId === activity.id);
  const cadence = activity.suggestedCadenceDays ?? goal.desiredCadenceDays;
  const cadenceLast = activity.suggestedCadenceDays !== null
    ? activityLast
    : lastCompletion(sessions, (session) => session.goalId === goal.id);
  const cadenceElapsed = cadenceLast ? Math.max(0, now - (cadenceLast.settledAt ?? 0)) / DAY_MS : null;
  const recencyElapsed = activityLast ? Math.max(0, now - (activityLast.settledAt ?? 0)) / DAY_MS : null;
  const recentGoals = sessions
    .filter(isEffectiveCompletion)
    .sort((left, right) => (right.settledAt ?? 0) - (left.settledAt ?? 0) || left.id.localeCompare(right.id))
    .slice(0, 2)
    .map((session) => session.goalId);
  const dismissed = runs.some(
    (run) => run.requestedAt >= now - DAY_MS && run.dismissedActivityTemplateIds.includes(activity.id),
  );
  const completedRecently = Boolean(activityLast && now - (activityLast.settledAt ?? 0) <= DAY_MS);

  const rawParts = {
    importance: goal.importance * 10,
    cadenceNeed: cadence === null ? 0 : cadenceElapsed === null ? 20 : clamp((cadenceElapsed / cadence) * 20, 0, 20),
    recencyNeed: recencyElapsed === null ? 10 : clamp((recencyElapsed / 30) * 10, 0, 10),
    timeFit: clamp((suggestedMinutes / context.availableMinutes) * 15, 0, 15),
    energyFit: context.energy === null ? 5 : clamp(10 - 2.5 * Math.abs(context.energy - activity.energyCost), 0, 10),
    varietyBonus: recentGoals.includes(goal.id) ? 0 : 6,
    explicitDismissPenalty: dismissed ? -12 : 0,
    recentCompletionPenalty: completedRecently ? -15 : 0,
  };
  const scoreParts = Object.fromEntries(Object.entries(rawParts).map(([key, value]) => [key, rounded(value)]));
  const reasonCodes = [
    rawParts.cadenceNeed >= 15 ? 'cadence-due' : null,
    rawParts.timeFit >= 12 ? 'fits-time' : null,
    rawParts.energyFit >= 7.5 ? 'fits-energy' : null,
    rawParts.varietyBonus > 0 ? 'adds-variety' : null,
    dismissed ? 'recently-dismissed' : null,
    completedRecently ? 'recently-completed' : null,
  ].filter((value): value is string => value !== null);

  return {
    activityTemplateId: activity.id,
    goalId: goal.id,
    suggestedMinutes,
    score: rounded(Object.values(scoreParts).reduce((sum, value) => sum + value, 0)),
    scoreParts,
    reasonCodes,
  };
};

export const runRollEngine = (input: {
  runId: string;
  now: number;
  context: RollContext;
  goals: Goal[];
  activities: ActivityTemplate[];
  sessions: Session[];
  previousRuns: RecommendationRun[];
}): RollResult => {
  if (!Number.isInteger(input.context.availableMinutes) || input.context.availableMinutes < 1 || input.context.availableMinutes > 480) {
    throw new ValidationError('可用时间必须是 1–480 的整数分钟');
  }
  const context: RollContext = { ...input.context, contexts: normalizeContexts(input.context.contexts) };
  const activeGoals = input.goals.filter((goal) => goal.status === 'active');
  const activeGoalIds = new Set(activeGoals.map((goal) => goal.id));
  const available = input.activities.filter((activity) => activity.archivedAt === null && activeGoalIds.has(activity.goalId));
  const fitsTime = available.filter((activity) => activity.minimumMinutes <= context.availableMinutes);
  const fitsContext = fitsTime.filter((activity) => hasRequiredContexts(activity, context));
  const fitsRest = fitsContext.filter((activity) => {
    const goal = activeGoals.find((candidate) => candidate.id === activity.goalId);
    return goal ? restSatisfied(activity, goal, input.sessions, input.now) : false;
  });
  const candidates = fitsRest
    .map((activity) => buildCandidate(
      activity,
      activeGoals.find((goal) => goal.id === activity.goalId)!,
      input.sessions,
      input.previousRuns,
      context,
      input.now,
    ))
    .sort((left, right) => right.score - left.score || left.activityTemplateId.localeCompare(right.activityTemplateId))
    .slice(0, 3);

  let emptyReason: EmptyRollReason | null = null;
  if (candidates.length === 0) {
    emptyReason = activeGoals.length === 0
      ? 'no-active-goals'
      : available.length === 0
        ? 'no-active-activities'
        : fitsTime.length === 0
          ? 'time-too-short'
          : fitsContext.length === 0
            ? 'context-mismatch'
            : 'resting';
  }

  return {
    run: {
      id: input.runId,
      requestedAt: input.now,
      context,
      candidates,
      chosenActivityTemplateId: null,
      dismissedActivityTemplateIds: [],
    },
    emptyReason,
  };
};
