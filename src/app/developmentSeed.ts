/**
 * 模块名称：确定性开发种子
 * 职责描述：生成固定 Goal/Activity 演示事实，并从混合快照安全清理其引用图
 * 输入/输出：接收时间或 AppSnapshot，返回 seed facts 或原子替换所需的新快照与移除摘要
 * 依赖关系：应用快照、Goal/Activity 类型、奖励投影重建器
 * 注意事项：只识别 dev-seed: 保留命名空间，不使用随机数、网络、AI 或持久化端口
 */
import type { ActivityTemplate, FeedbackConfig, Goal } from '../modules/goals/types';
import { rebuildCompanionProjection } from '../modules/rewards/rewardEngine';
import type { AppSnapshot } from './ports';

export const DEVELOPMENT_SEED_PREFIX = 'dev-seed:';

export interface DevelopmentSeedFacts {
  goals: Goal[];
  activities: ActivityTemplate[];
}

export interface DevelopmentSeedRemovedCounts {
  goals: number;
  activities: number;
  sessions: number;
  rewards: number;
  recommendationRuns: number;
}

export interface DevelopmentSeedCleanup {
  snapshot: AppSnapshot;
  changed: boolean;
  removed: DevelopmentSeedRemovedCounts;
}

const isDevelopmentSeedId = (id: string | null): boolean => id?.startsWith(DEVELOPMENT_SEED_PREFIX) ?? false;

const buildGoal = (
  id: string,
  title: string,
  feedback: FeedbackConfig,
  defaultEnergyCost: Goal['defaultEnergyCost'],
  now: number,
): Goal => ({
  id,
  title,
  description: '仅用于本机开发和测试，可从开发种子面板清除。',
  status: 'active',
  importance: 3,
  feedback,
  desiredCadenceDays: null,
  minimumRestHours: 0,
  defaultEnergyCost,
  createdAt: now,
  updatedAt: now,
});

const buildActivity = (
  id: string,
  goalId: string,
  title: string,
  minimumMinutes: number,
  maximumMinutes: number,
  energyCost: ActivityTemplate['energyCost'],
  contexts: string[],
  now: number,
): ActivityTemplate => ({
  id,
  goalId,
  title,
  description: '',
  minimumMinutes,
  maximumMinutes,
  energyCost,
  contexts,
  minimumRestHours: null,
  suggestedCadenceDays: null,
  rewardWeight: 1,
  createdAt: now,
  archivedAt: null,
});

export const createDevelopmentSeedFacts = (now: number): DevelopmentSeedFacts => {
  const japaneseGoalId = `${DEVELOPMENT_SEED_PREFIX}goal:japanese`;
  const fitnessGoalId = `${DEVELOPMENT_SEED_PREFIX}goal:fitness`;
  const photographyGoalId = `${DEVELOPMENT_SEED_PREFIX}goal:photography`;
  return {
    goals: [
      buildGoal(japaneseGoalId, '日语学习', { type: 'progress', baseline: 0, target: 1000, unit: '词' }, 2, now),
      buildGoal(fitnessGoalId, '健身', { type: 'cumulative', unit: 'minutes' }, 3, now),
      buildGoal(photographyGoalId, '摄影', { type: 'experience' }, 2, now),
    ],
    activities: [
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:japanese-review`, japaneseGoalId, '十分钟复习', 10, 15, 1, ['home'], now),
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:japanese-reading`, japaneseGoalId, '二十五分钟阅读', 25, 40, 2, ['quiet'], now),
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:fitness-mobility`, fitnessGoalId, '十分钟活动度', 10, 20, 2, ['home'], now),
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:fitness-strength`, fitnessGoalId, '三十分钟力量', 30, 45, 4, ['gym'], now),
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:photography-walk`, photographyGoalId, '十五分钟拍摄散步', 15, 30, 3, ['outdoors'], now),
      buildActivity(`${DEVELOPMENT_SEED_PREFIX}activity:photography-organize`, photographyGoalId, '二十五分钟整理照片', 25, 45, 2, ['home'], now),
    ],
  };
};

export const hasDevelopmentSeedFacts = (snapshot: AppSnapshot): boolean =>
  snapshot.goals.some((goal) => isDevelopmentSeedId(goal.id)) ||
  snapshot.activities.some((activity) => isDevelopmentSeedId(activity.id) || isDevelopmentSeedId(activity.goalId)) ||
  snapshot.sessions.some((session) =>
    isDevelopmentSeedId(session.id) || isDevelopmentSeedId(session.goalId) || isDevelopmentSeedId(session.activityTemplateId)) ||
  snapshot.rewardEntries.some((entry) =>
    isDevelopmentSeedId(entry.id) || isDevelopmentSeedId(entry.sessionId) || isDevelopmentSeedId(entry.goalId) || isDevelopmentSeedId(entry.reversalOfEntryId)) ||
  snapshot.recommendationRuns.some((run) =>
    isDevelopmentSeedId(run.chosenActivityTemplateId) ||
    run.dismissedActivityTemplateIds.some(isDevelopmentSeedId) ||
    run.candidates.some((candidate) => isDevelopmentSeedId(candidate.goalId) || isDevelopmentSeedId(candidate.activityTemplateId)));

const emptyRemovedCounts = (): DevelopmentSeedRemovedCounts => ({
  goals: 0,
  activities: 0,
  sessions: 0,
  rewards: 0,
  recommendationRuns: 0,
});

export const clearDevelopmentSeedFacts = (snapshot: AppSnapshot, now: number): DevelopmentSeedCleanup => {
  if (!hasDevelopmentSeedFacts(snapshot)) {
    return { snapshot, changed: false, removed: emptyRemovedCounts() };
  }

  const next = structuredClone(snapshot);
  const goalsBefore = next.goals.length;
  const activitiesBefore = next.activities.length;
  const sessionsBefore = next.sessions.length;
  const rewardsBefore = next.rewardEntries.length;
  const runsBefore = next.recommendationRuns.length;

  next.goals = next.goals.filter((goal) => !isDevelopmentSeedId(goal.id));
  next.activities = next.activities.filter(
    (activity) => !isDevelopmentSeedId(activity.id) && !isDevelopmentSeedId(activity.goalId),
  );
  const removedSessionIds = new Set(
    next.sessions
      .filter((session) =>
        isDevelopmentSeedId(session.id) || isDevelopmentSeedId(session.goalId) || isDevelopmentSeedId(session.activityTemplateId))
      .map((session) => session.id),
  );
  next.sessions = next.sessions.filter((session) => !removedSessionIds.has(session.id));

  const removedRewardIds = new Set(
    next.rewardEntries
      .filter((entry) =>
        isDevelopmentSeedId(entry.id) ||
        isDevelopmentSeedId(entry.goalId) ||
        isDevelopmentSeedId(entry.sessionId) ||
        isDevelopmentSeedId(entry.reversalOfEntryId) ||
        removedSessionIds.has(entry.sessionId))
      .map((entry) => entry.id),
  );
  let foundDependentReversal = true;
  while (foundDependentReversal) {
    foundDependentReversal = false;
    for (const entry of next.rewardEntries) {
      if (entry.reversalOfEntryId && removedRewardIds.has(entry.reversalOfEntryId) && !removedRewardIds.has(entry.id)) {
        removedRewardIds.add(entry.id);
        foundDependentReversal = true;
      }
    }
  }
  next.rewardEntries = next.rewardEntries.filter((entry) => !removedRewardIds.has(entry.id));

  const referencedRunIds = new Set(next.sessions.flatMap((session) => session.recommendationRunId ? [session.recommendationRunId] : []));
  next.recommendationRuns = next.recommendationRuns.flatMap((run) => {
    const candidates = run.candidates.filter(
      (candidate) => !isDevelopmentSeedId(candidate.goalId) && !isDevelopmentSeedId(candidate.activityTemplateId),
    );
    const dismissedActivityTemplateIds = run.dismissedActivityTemplateIds.filter((id) => !isDevelopmentSeedId(id));
    const chosenActivityTemplateId = isDevelopmentSeedId(run.chosenActivityTemplateId) ? null : run.chosenActivityTemplateId;
    const affected =
      candidates.length !== run.candidates.length ||
      dismissedActivityTemplateIds.length !== run.dismissedActivityTemplateIds.length ||
      chosenActivityTemplateId !== run.chosenActivityTemplateId;
    if (affected && candidates.length === 0 && !referencedRunIds.has(run.id)) return [];
    return [{ ...run, candidates, dismissedActivityTemplateIds, chosenActivityTemplateId }];
  });

  next.companionProjection = rebuildCompanionProjection(next.rewardEntries, now);
  return {
    snapshot: next,
    changed: true,
    removed: {
      goals: goalsBefore - next.goals.length,
      activities: activitiesBefore - next.activities.length,
      sessions: sessionsBefore - next.sessions.length,
      rewards: rewardsBefore - next.rewardEntries.length,
      recommendationRuns: runsBefore - next.recommendationRuns.length,
    },
  };
};
