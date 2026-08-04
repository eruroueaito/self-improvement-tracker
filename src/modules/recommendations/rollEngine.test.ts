/**
 * 模块名称：RollEngine 单元测试
 * 职责描述：验证确定性评分、稳定排序、过滤和历史惩罚
 * 输入/输出：构造领域事实，断言候选顺序、分项分数和空态原因
 * 依赖关系：Vitest、RollEngine、领域类型
 * 注意事项：权重变化必须同步更新明确的期望值
 */
import { describe, expect, it } from 'vitest';
import type { ActivityTemplate, Goal } from '../goals/types';
import type { Session } from '../sessions/types';
import { runRollEngine } from './rollEngine';

const now = 2_000_000_000_000;
const goal = (id: string, importance: Goal['importance'] = 3): Goal => ({
  id, title: id, description: '', status: 'active', importance,
  feedback: { type: 'cumulative', unit: 'times' }, desiredCadenceDays: null,
  minimumRestHours: 0, defaultEnergyCost: 3, createdAt: now, updatedAt: now,
});
const activity = (id: string, goalId: string, overrides: Partial<ActivityTemplate> = {}): ActivityTemplate => ({
  id, goalId, title: id, description: '', minimumMinutes: 10, maximumMinutes: 30,
  energyCost: 3, contexts: [], minimumRestHours: null, suggestedCadenceDays: null,
  rewardWeight: 1, createdAt: now, archivedAt: null, ...overrides,
});
const completedSession = (id: string, activityTemplateId: string, goalId: string, settledAt: number): Session => ({
  id, activityTemplateId, goalId, recommendationRunId: null, timerMode: 'flowtime', status: 'settled',
  plannedMinutes: null, startedAt: settledAt - 600_000, runningSince: null, accumulatedMs: 600_000,
  targetDurationMs: null, lastHeartbeatAt: settledAt, endedAt: settledAt, endType: 'completed',
  settlement: { actualMinutes: 10, completionRatio: 1, difficulty: 3, effort: 3, quantity: null, quantityUnit: null, userNote: '' },
  createdAt: settledAt - 600_000, settledAt,
});

describe('runRollEngine', () => {
  it('uses exact score parts and stable id tie-breaking', () => {
    const result = runRollEngine({
      runId: 'run', now, context: { availableMinutes: 25, energy: 3, contexts: [] },
      goals: [goal('g')], activities: [activity('b', 'g'), activity('a', 'g')], sessions: [], previousRuns: [],
    });
    expect(result.run.candidates.map((candidate) => candidate.activityTemplateId)).toEqual(['a', 'b']);
    expect(result.run.candidates[0]?.scoreParts).toMatchObject({ importance: 30, cadenceNeed: 0, recencyNeed: 10, timeFit: 15, energyFit: 10, varietyBonus: 6 });
    expect(result.run.candidates[0]?.score).toBe(71);
  });

  it('filters time, context and rest using effective completion only', () => {
    const recent = completedSession('s', 'rest', 'g', now - 60_000);
    const result = runRollEngine({
      runId: 'run', now, context: { availableMinutes: 15, energy: null, contexts: ['home'] },
      goals: [goal('g')],
      activities: [
        activity('long', 'g', { minimumMinutes: 30 }),
        activity('context', 'g', { contexts: ['gym'] }),
        activity('rest', 'g', { contexts: ['home'], minimumRestHours: 2 }),
      ],
      sessions: [recent], previousRuns: [],
    });
    expect(result.run.candidates).toEqual([]);
    expect(result.emptyReason).toBe('resting');
  });

  it('applies one dismiss and recent-completion penalty', () => {
    const result = runRollEngine({
      runId: 'new', now, context: { availableMinutes: 25, energy: null, contexts: [] },
      goals: [goal('g')], activities: [activity('a', 'g')],
      sessions: [completedSession('s', 'a', 'g', now - 3_600_000)],
      previousRuns: [{ id: 'old', requestedAt: now - 1_000, context: { availableMinutes: 25, energy: null, contexts: [] }, candidates: [], chosenActivityTemplateId: null, dismissedActivityTemplateIds: ['a'] }],
    });
    expect(result.run.candidates[0]?.scoreParts.explicitDismissPenalty).toBe(-12);
    expect(result.run.candidates[0]?.scoreParts.recentCompletionPenalty).toBe(-15);
  });
});
