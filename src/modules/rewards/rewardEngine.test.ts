/**
 * 模块名称：RewardEngine 单元测试
 * 职责描述：验证 XP 分段、重复折扣、放弃规则与不掉级投影
 * 输入/输出：构造已结算 Session/账目并断言 XP 和宠物投影
 * 依赖关系：Vitest、RewardEngine
 * 注意事项：精确期望保护 ruleVersion 1 的用户可解释性
 */
import { describe, expect, it } from 'vitest';
import type { Session } from '../sessions/types';
import { calculateXp, rebuildCompanionProjection } from './rewardEngine';

const session = (minutes: number, endType: Session['endType'] = 'completed'): Session => ({
  id: 's', goalId: 'g', activityTemplateId: 'a', recommendationRunId: null, timerMode: 'flowtime', status: 'settled',
  plannedMinutes: null, startedAt: 0, runningSince: null, accumulatedMs: minutes * 60_000, targetDurationMs: null,
  lastHeartbeatAt: minutes * 60_000, endedAt: minutes * 60_000, endType,
  settlement: { actualMinutes: minutes, completionRatio: 1, difficulty: 3, effort: 3, quantity: null, quantityUnit: null, userNote: '' },
  createdAt: 0, settledAt: minutes * 60_000,
});

describe('reward engine', () => {
  it('applies brackets, effort and repeat discounts', () => {
    expect(calculateXp(session(25), 1, 0)).toBe(21);
    expect(calculateXp(session(25), 1, 1)).toBe(11);
    expect(calculateXp(session(25), 1, 2)).toBe(0);
    expect(calculateXp(session(25, 'abandoned'), 1, 0)).toBe(0);
  });

  it('keeps historical level and evolution after reversal', () => {
    const projection = rebuildCompanionProjection([
      { id: '1', sessionId: 's', goalId: 'g', entryType: 'settlement', globalXpDelta: 310, goalXpDelta: 310, ruleVersion: 1, idempotencyKey: 'a', reversalOfEntryId: null, createdAt: 1 },
      { id: '2', sessionId: 's', goalId: 'g', entryType: 'reversal', globalXpDelta: -310, goalXpDelta: -310, ruleVersion: 1, idempotencyKey: 'b', reversalOfEntryId: '1', createdAt: 2 },
    ], 3);
    expect(projection.globalXp).toBe(0);
    expect(projection.level).toBe(7);
    expect(projection.evolutionStage).toBe('companion');
  });
});
