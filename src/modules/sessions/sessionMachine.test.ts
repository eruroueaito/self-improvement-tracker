/**
 * 模块名称：Session 状态机单元测试
 * 职责描述：验证暂停恢复、时间异常、倒计时结束类型和结算边界
 * 输入/输出：构造 Session 事件序列并断言不可变状态转换
 * 依赖关系：Vitest、Session 状态机
 * 注意事项：测试不依赖真实系统时间或通知
 */
import { describe, expect, it } from 'vitest';
import { createSession, endSession, normalizeSettlement, pauseSession, recoverSession } from './sessionMachine';

const start = 1_000_000;

describe('session state machine', () => {
  it('never adds negative time when the clock moves backward', () => {
    const session = createSession({ id: 's', goalId: 'g', activityTemplateId: 'a', recommendationRunId: null, timerMode: 'flowtime', plannedMinutes: null, now: start });
    const paused = pauseSession(session, start - 5_000);
    expect(paused.accumulatedMs).toBe(0);
    expect(paused.status).toBe('paused');
  });

  it('maps early countdown end to interrupted and expiry to completed', () => {
    const session = createSession({ id: 's', goalId: 'g', activityTemplateId: 'a', recommendationRunId: null, timerMode: 'countdown', plannedMinutes: 10, now: start });
    expect(endSession(session, start + 300_000, 'finish').endType).toBe('interrupted');
    expect(recoverSession(session, start + 600_000).session.endType).toBe('completed');
  });

  it('requires confirmation for a jump over 24 hours', () => {
    const session = createSession({ id: 's', goalId: 'g', activityTemplateId: 'a', recommendationRunId: null, timerMode: 'flowtime', plannedMinutes: null, now: start });
    expect(recoverSession(session, start + 86_400_001).needsTimeConfirmation).toBe(true);
  });

  it('validates settlement bounds', () => {
    expect(normalizeSettlement({ actualMinutes: 12.345, completionRatio: 0.8 })).toMatchObject({ actualMinutes: 12.35, completionRatio: 0.8 });
    expect(() => normalizeSettlement({ actualMinutes: 1, completionRatio: 1.2 })).toThrow(/完成比例/);
  });
});
