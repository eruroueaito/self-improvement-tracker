/**
 * 模块名称：开发种子纯函数测试
 * 职责描述：验证确定性 seed fixture、保留 ID 和安全清理引用图
 * 输入/输出：构造混合应用快照，断言生成或清理后的事实集合与移除摘要
 * 依赖关系：Vitest、developmentSeed、应用快照与领域事实类型
 * 注意事项：非 demo 事实必须等价保留，混合 RecommendationRun 不得被粗暴删除
 */
import { describe, expect, it, vi } from 'vitest';
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import type { RecommendationCandidate, RecommendationRun } from '../modules/recommendations/types';
import type { RewardLedgerEntry } from '../modules/rewards/types';
import type { Session } from '../modules/sessions/types';
import { createDefaultAppSettings } from '../modules/settings/settings';
import {
  clearDevelopmentSeedFacts,
  createDevelopmentSeedFacts,
  hasDevelopmentSeedFacts,
} from './developmentSeed';
import type { AppSnapshot } from './ports';

const userGoal: Goal = {
  id: 'user-goal', title: '用户目标', description: '', status: 'active', importance: 3,
  feedback: { type: 'experience' }, desiredCadenceDays: null, minimumRestHours: 0,
  defaultEnergyCost: 2, createdAt: 10, updatedAt: 10,
};
const userActivity: ActivityTemplate = {
  id: 'user-activity', goalId: userGoal.id, title: '用户活动', description: '', minimumMinutes: 10,
  maximumMinutes: 20, energyCost: 2, contexts: [], minimumRestHours: null,
  suggestedCadenceDays: null, rewardWeight: 1, createdAt: 10, archivedAt: null,
};
const candidate = (activityTemplateId: string, goalId: string): RecommendationCandidate => ({
  activityTemplateId, goalId, suggestedMinutes: 10, score: 1, scoreParts: {}, reasonCodes: [],
});
const run = (id: string, candidates: RecommendationCandidate[], overrides: Partial<RecommendationRun> = {}): RecommendationRun => ({
  id, requestedAt: 20, context: { availableMinutes: 20, energy: null, contexts: [] }, candidates,
  chosenActivityTemplateId: null, dismissedActivityTemplateIds: [], ...overrides,
});
const session = (id: string, goalId: string, activityTemplateId: string, recommendationRunId: string): Session => ({
  id, goalId, activityTemplateId, recommendationRunId, timerMode: 'flowtime', status: 'settled',
  plannedMinutes: null, startedAt: 10, runningSince: null, accumulatedMs: 600_000,
  targetDurationMs: null, lastHeartbeatAt: 20, endedAt: 20, endType: 'completed',
  settlement: { actualMinutes: 10, completionRatio: 1, difficulty: 3, effort: 3, quantity: null, quantityUnit: null, userNote: '' },
  createdAt: 10, settledAt: 20,
});
const reward = (id: string, sessionId: string, goalId: string, delta: number): RewardLedgerEntry => ({
  id, sessionId, goalId, entryType: 'settlement', globalXpDelta: delta, goalXpDelta: delta,
  ruleVersion: 1, idempotencyKey: id, reversalOfEntryId: null, createdAt: 20,
});
const snapshot = (overrides: Partial<AppSnapshot> = {}): AppSnapshot => ({
  schemaVersion: 3,
  goals: [], activities: [], recommendationRuns: [], sessions: [], rewardEntries: [],
  companionProjection: { globalXp: 0, level: 1, evolutionStage: 'seed', mood: 'idle', lastUpdatedAt: 1 },
  settings: createDefaultAppSettings(),
  aiInteractions: [],
  ...overrides,
});

describe('development seed facts', () => {
  it('creates the same three Goals and six Activities for the same time without randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('random is forbidden'); });
    const first = createDevelopmentSeedFacts(1_000);
    const second = createDevelopmentSeedFacts(1_000);
    random.mockRestore();

    expect(first).toEqual(second);
    expect(first.goals).toHaveLength(3);
    expect(first.activities).toHaveLength(6);
    expect([...first.goals, ...first.activities].every((fact) => fact.id.startsWith('dev-seed:'))).toBe(true);
    expect(first.goals.map((entry) => entry.feedback)).toEqual([
      { type: 'progress', baseline: 0, target: 1000, unit: '词' },
      { type: 'cumulative', unit: 'minutes' },
      { type: 'experience' },
    ]);
    expect(first.activities.map((entry) => [entry.title, entry.minimumMinutes, entry.energyCost, entry.contexts])).toEqual([
      ['十分钟复习', 10, 1, ['home']],
      ['二十五分钟阅读', 25, 2, ['quiet']],
      ['十分钟活动度', 10, 2, ['home']],
      ['三十分钟力量', 30, 4, ['gym']],
      ['十五分钟拍摄散步', 15, 3, ['outdoors']],
      ['二十五分钟整理照片', 25, 2, ['home']],
    ]);
    expect([...first.goals, ...first.activities].every((fact) => fact.createdAt === 1_000)).toBe(true);
  });

  it('cleans demo facts while sanitizing mixed runs and preserving user references', () => {
    const seed = createDevelopmentSeedFacts(1_000);
    const demoGoal = seed.goals[0]!;
    const demoActivity = seed.activities[0]!;
    const mixedRun = run('mixed-run', [candidate(demoActivity.id, demoGoal.id), candidate(userActivity.id, userGoal.id)], {
      chosenActivityTemplateId: demoActivity.id,
      dismissedActivityTemplateIds: [demoActivity.id, userActivity.id],
    });
    const demoOnlyRun = run('demo-only-run', [candidate(demoActivity.id, demoGoal.id)]);
    const referencedRun = run('referenced-run', [candidate(demoActivity.id, demoGoal.id)], {
      chosenActivityTemplateId: demoActivity.id,
    });
    const userSession = session('user-session', userGoal.id, userActivity.id, 'mixed-run');
    const referencedUserSession = session('referenced-user-session', userGoal.id, userActivity.id, 'referenced-run');
    const demoSession = session('demo-session', demoGoal.id, demoActivity.id, 'demo-only-run');
    const userReward = reward('user-reward', userSession.id, userGoal.id, 20);
    const demoReward = reward('demo-reward', demoSession.id, demoGoal.id, 15);
    const danglingReversal: RewardLedgerEntry = {
      ...reward('dependent-reversal', userSession.id, userGoal.id, -5),
      entryType: 'reversal',
      reversalOfEntryId: 'dev-seed:reward:removed',
    };
    const input = snapshot({
      goals: [userGoal, ...seed.goals],
      activities: [userActivity, ...seed.activities],
      recommendationRuns: [mixedRun, demoOnlyRun, referencedRun],
      sessions: [userSession, referencedUserSession, demoSession],
      rewardEntries: [userReward, demoReward, danglingReversal],
      companionProjection: { globalXp: 35, level: 1, evolutionStage: 'seed', mood: 'celebrating', lastUpdatedAt: 20 },
    });

    const result = clearDevelopmentSeedFacts(input, 5_000);

    expect(result.changed).toBe(true);
    expect(result.removed).toEqual({ goals: 3, activities: 6, sessions: 1, rewards: 2, recommendationRuns: 1 });
    expect(result.snapshot.goals).toEqual([userGoal]);
    expect(result.snapshot.activities).toEqual([userActivity]);
    expect(result.snapshot.sessions).toEqual([userSession, referencedUserSession]);
    expect(result.snapshot.rewardEntries).toEqual([userReward]);
    expect(result.snapshot.recommendationRuns.map((entry) => entry.id)).toEqual(['mixed-run', 'referenced-run']);
    expect(result.snapshot.recommendationRuns[0]).toEqual({
      ...mixedRun,
      candidates: [candidate(userActivity.id, userGoal.id)],
      chosenActivityTemplateId: null,
      dismissedActivityTemplateIds: [userActivity.id],
    });
    expect(result.snapshot.recommendationRuns[1]).toEqual({
      ...referencedRun,
      candidates: [],
      chosenActivityTemplateId: null,
    });
    expect(result.snapshot.companionProjection).toEqual({
      globalXp: 20,
      level: 1,
      evolutionStage: 'seed',
      mood: 'idle',
      lastUpdatedAt: 5_000,
    });
    expect(hasDevelopmentSeedFacts(result.snapshot)).toBe(false);
  });

  it('is idempotent when no development seed references exist', () => {
    const input = snapshot({ goals: [userGoal], activities: [userActivity] });
    const result = clearDevelopmentSeedFacts(input, 5_000);
    expect(result).toEqual({
      snapshot: input,
      changed: false,
      removed: { goals: 0, activities: 0, sessions: 0, rewards: 0, recommendationRuns: 0 },
    });
  });
});
