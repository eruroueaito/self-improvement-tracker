/**
 * 模块名称：ActivityStateEngine v1 单元测试
 * 职责描述：验证 UTC 活动窗口、去重、广度上限与无奖励偏置规则
 * 输入/输出：构造 Session 事实并断言版本化活动状态
 * 依赖关系：Vitest、ActivityStateEngine、Session 类型
 * 注意事项：边界使用精确 epoch 毫秒，不能依赖测试机时区
 */
import { describe, expect, it } from 'vitest';
import type { Session } from '../sessions/types';
import { calculateActivityState } from './activityStateEngine';

const DAY_MS = 86_400_000;
const NOW = 20 * DAY_MS + 12 * 60 * 60_000;

const completed = (id: string, goalId: string, settledAt: number, overrides: Partial<Session> = {}): Session => ({
  id,
  goalId,
  activityTemplateId: `activity-${goalId}`,
  recommendationRunId: null,
  timerMode: 'flowtime',
  status: 'settled',
  plannedMinutes: null,
  startedAt: settledAt - 60_000,
  runningSince: null,
  accumulatedMs: 60_000,
  targetDurationMs: null,
  lastHeartbeatAt: settledAt,
  endedAt: settledAt,
  endType: 'completed',
  settlement: {
    actualMinutes: 1,
    completionRatio: 1,
    difficulty: null,
    effort: null,
    quantity: null,
    quantityUnit: null,
    userNote: '',
  },
  createdAt: settledAt - 60_000,
  settledAt,
  ...overrides,
});

describe('ActivityStateEngine v1', () => {
  it('uses exact inclusive UTC day windows', () => {
    const state = calculateActivityState({
      now: NOW,
      sessions: [
        completed('today', 'g1', 20 * DAY_MS),
        completed('d-6', 'g1', 14 * DAY_MS),
        completed('d-7', 'g2', 13 * DAY_MS),
        completed('d-13', 'g3', 7 * DAY_MS),
        completed('d-14', 'g4', 6 * DAY_MS),
      ],
    });

    expect(state).toEqual({
      version: 1,
      score: 50,
      activeDays7: 2,
      distinctGoals14: 3,
      recentActivityPoints: 20,
      breadthPoints: 30,
    });
  });

  it('deduplicates same-day activity and caps breadth at three goals', () => {
    const state = calculateActivityState({
      now: NOW,
      sessions: [
        completed('a', 'g1', 20 * DAY_MS + 1),
        completed('b', 'g1', 20 * DAY_MS + 2),
        completed('c', 'g2', 20 * DAY_MS + 3),
        completed('d', 'g3', 19 * DAY_MS),
        completed('e', 'g4', 18 * DAY_MS),
      ],
    });

    expect(state.activeDays7).toBe(3);
    expect(state.distinctGoals14).toBe(3);
    expect(state.score).toBe(60);
  });

  it('excludes future, voided, interrupted, abandoned and low-completion facts', () => {
    const state = calculateActivityState({
      now: NOW,
      sessions: [
        completed('valid', 'valid', NOW),
        completed('future', 'future', NOW + 1),
        completed('voided', 'voided', NOW, { status: 'voided' }),
        completed('interrupted', 'interrupted', NOW, { endType: 'interrupted' }),
        completed('abandoned', 'abandoned', NOW, { endType: 'abandoned' }),
        completed('low', 'low', NOW, { settlement: { ...completed('x', 'x', NOW).settlement!, completionRatio: 0.49 } }),
      ],
    });

    expect(state).toMatchObject({ activeDays7: 1, distinctGoals14: 1, score: 20 });
  });

  it('does not accept XP, reward weight or repeated short work as scoring inputs', () => {
    const once = calculateActivityState({ now: NOW, sessions: [completed('one-minute', 'g1', NOW)] });
    const repeated = calculateActivityState({
      now: NOW,
      sessions: Array.from({ length: 20 }, (_, index) => completed(`repeat-${index}`, 'g1', NOW)),
    });

    expect(once).toEqual(repeated);
    expect(Object.keys(once)).not.toContain('xp');
    expect(Object.keys(once)).not.toContain('rewardWeight');
  });

  it('rejects a non-finite explicit clock', () => {
    expect(() => calculateActivityState({ now: Number.NaN, sessions: [] })).toThrow(/now/);
  });
});
