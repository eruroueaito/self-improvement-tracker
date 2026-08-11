/**
 * 模块名称：RollEngine 30 天公平性回归
 * 职责描述：用固定闭环输入验证推荐分布、暂停排除与现有惩罚规则
 * 输入/输出：逐日执行首选候选并写入完成事实，输出冻结序列与统计断言
 * 依赖关系：Vitest、RollEngine、Goal/Activity/Session 类型
 * 注意事项：测试不得传入 ActivityState 或伙伴字段，也不得用随机数
 */
import { describe, expect, it } from 'vitest';
import type { ActivityTemplate, Goal } from '../goals/types';
import type { Session } from '../sessions/types';
import type { RecommendationRun } from './types';
import { runRollEngine } from './rollEngine';

const DAY_MS = 86_400_000;
const START = Date.parse('2026-01-01T12:00:00Z');
const SPECS = [
  ['study', 5, 1],
  ['fitness', 4, 2],
  ['photo', 3, 7],
] as const;
const EXPECTED = [
  'study', 'fitness', 'study', 'photo', 'study', 'fitness', 'study', 'fitness', 'study', 'fitness',
  'study', 'fitness', 'study', 'fitness', 'study', 'fitness', 'study', 'fitness', 'study', 'photo',
  'study', 'fitness', 'study', 'fitness', 'study', 'fitness', 'study', 'fitness', 'study', 'fitness',
];

const goals: Goal[] = SPECS.map(([id, importance, desiredCadenceDays]) => ({
  id, title: id, description: '', status: 'active', importance, feedback: { type: 'experience' },
  desiredCadenceDays, minimumRestHours: 0, defaultEnergyCost: 3, createdAt: START, updatedAt: START,
}));
const activities: ActivityTemplate[] = SPECS.map(([id]) => ({
  id: `${id}-activity`, goalId: id, title: id, description: '', minimumMinutes: 15, maximumMinutes: 30,
  energyCost: 3, contexts: [], minimumRestHours: 0, suggestedCadenceDays: null, rewardWeight: 1,
  createdAt: START, archivedAt: null,
}));

const completedSession = (day: number, goalId: string, activityTemplateId: string, runId: string, now: number): Session => ({
  id: `session-${day}`, goalId, activityTemplateId, recommendationRunId: runId, timerMode: 'flowtime',
  status: 'settled', plannedMinutes: null, startedAt: now, runningSince: null, accumulatedMs: 1_800_000,
  targetDurationMs: null, lastHeartbeatAt: now, endedAt: now, endType: 'completed',
  settlement: { actualMinutes: 30, completionRatio: 1, difficulty: null, effort: null, quantity: null, quantityUnit: null, userNote: '' },
  createdAt: now, settledAt: now,
});

describe('RollEngine fixed 30-day fairness simulation', () => {
  it('keeps all eligible goals represented and paused photography excluded', () => {
    const sessions: Session[] = [];
    const previousRuns: RecommendationRun[] = [];
    const sequence: string[] = [];

    for (let day = 1; day <= 30; day += 1) {
      const now = START + (day - 1) * DAY_MS;
      const dailyGoals = goals.map((goal) => ({
        ...goal,
        status: goal.id === 'photo' && day >= 10 && day <= 16 ? 'paused' as const : 'active' as const,
      }));
      const result = runRollEngine({
        runId: `run-${day}`,
        now,
        context: { availableMinutes: 30, energy: 3, contexts: [] },
        goals: dailyGoals,
        activities,
        sessions,
        previousRuns,
      });
      if (day >= 10 && day <= 16) expect(result.run.candidates.map((candidate) => candidate.goalId)).not.toContain('photo');
      const first = result.run.candidates[0]!;
      result.run.chosenActivityTemplateId = first.activityTemplateId;
      previousRuns.push(result.run);
      sequence.push(first.goalId);
      sessions.push(completedSession(day, first.goalId, first.activityTemplateId, result.run.id, now));
    }

    const counts = Object.fromEntries(SPECS.map(([id]) => [id, sequence.filter((goalId) => goalId === id).length]));
    const longestRun = sequence.reduce((state, goalId) => ({
      previous: goalId,
      current: goalId === state.previous ? state.current + 1 : 1,
      maximum: Math.max(state.maximum, goalId === state.previous ? state.current + 1 : 1),
    }), { previous: '', current: 0, maximum: 0 }).maximum;

    expect(sequence).toEqual(EXPECTED);
    expect(counts).toEqual({ study: 15, fitness: 13, photo: 2 });
    expect(Math.max(...Object.values(counts)) / sequence.length).toBeLessThanOrEqual(0.6);
    expect(Math.min(...Object.values(counts))).toBeGreaterThanOrEqual(2);
    expect(longestRun).toBeLessThanOrEqual(3);
  });
});
