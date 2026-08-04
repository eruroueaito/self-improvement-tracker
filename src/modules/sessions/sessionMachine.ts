/**
 * 模块名称：Session 状态机
 * 职责描述：以纯函数实现计时开始、暂停、恢复、结束、恢复检查和结算校验
 * 输入/输出：接收 Session 与时间，返回不可变的新 Session
 * 依赖关系：Session 领域类型、目标校验错误
 * 注意事项：时间回拨不产生负时长，超 24 小时跳变由应用层要求人工确认
 */
import { ValidationError } from '../goals/validation';
import type { Session, SessionEndAction, Settlement, SettlementDraft, TimerMode } from './types';

const DAY_MS = 86_400_000;

export const elapsedMs = (session: Session, now: number): number =>
  session.accumulatedMs + (session.runningSince === null ? 0 : Math.max(0, now - session.runningSince));

export const createSession = (input: {
  id: string;
  goalId: string;
  activityTemplateId: string;
  recommendationRunId: string | null;
  timerMode: TimerMode;
  plannedMinutes: number | null;
  now: number;
}): Session => {
  if (input.timerMode === 'countdown' && (!input.plannedMinutes || input.plannedMinutes < 1)) {
    throw new ValidationError('倒计时必须提供至少 1 分钟的目标时长');
  }

  const plannedMinutes = input.timerMode === 'countdown' ? input.plannedMinutes : null;
  return {
    id: input.id,
    goalId: input.goalId,
    activityTemplateId: input.activityTemplateId,
    recommendationRunId: input.recommendationRunId,
    timerMode: input.timerMode,
    status: 'running',
    plannedMinutes,
    startedAt: input.now,
    runningSince: input.now,
    accumulatedMs: 0,
    targetDurationMs: plannedMinutes === null ? null : plannedMinutes * 60_000,
    lastHeartbeatAt: input.now,
    endedAt: null,
    endType: null,
    settlement: null,
    createdAt: input.now,
    settledAt: null,
  };
};

export const pauseSession = (session: Session, now: number): Session => {
  if (session.status !== 'running') throw new ValidationError('只有进行中的专注可以暂停');
  return {
    ...session,
    status: 'paused',
    accumulatedMs: elapsedMs(session, now),
    runningSince: null,
    lastHeartbeatAt: now,
  };
};

export const resumeSession = (session: Session, now: number): Session => {
  if (session.status !== 'paused') throw new ValidationError('只有已暂停的专注可以继续');
  return { ...session, status: 'running', runningSince: now, lastHeartbeatAt: now };
};

const endTypeFor = (session: Session, action: SessionEndAction, actualMs: number): Session['endType'] => {
  if (action === 'abandon') return 'abandoned';
  if (action === 'interrupt') return 'interrupted';
  if (session.timerMode === 'countdown' && actualMs < (session.targetDurationMs ?? 0)) return 'interrupted';
  return 'completed';
};

export const endSession = (session: Session, now: number, action: SessionEndAction): Session => {
  if (session.status !== 'running' && session.status !== 'paused') {
    throw new ValidationError('只有进行中或暂停的专注可以结束');
  }
  const actualMs = elapsedMs(session, now);
  return {
    ...session,
    status: 'ended',
    accumulatedMs: actualMs,
    runningSince: null,
    lastHeartbeatAt: now,
    endedAt: now,
    endType: endTypeFor(session, action, actualMs),
  };
};

export interface RecoveryResult {
  session: Session;
  needsTimeConfirmation: boolean;
}

export const recoverSession = (session: Session, now: number): RecoveryResult => {
  if (session.status !== 'running') return { session, needsTimeConfirmation: false };
  const jump = session.runningSince === null ? 0 : now - session.runningSince;
  if (jump > DAY_MS) return { session, needsTimeConfirmation: true };
  if (session.timerMode === 'countdown' && elapsedMs(session, now) >= (session.targetDurationMs ?? Infinity)) {
    return { session: endSession(session, now, 'finish'), needsTimeConfirmation: false };
  }
  return { session, needsTimeConfirmation: jump < 0 };
};

export const normalizeSettlement = (draft: SettlementDraft): Settlement => {
  if (!Number.isFinite(draft.actualMinutes) || draft.actualMinutes < 0 || draft.actualMinutes > 1440) {
    throw new ValidationError('实际时长必须在 0–1440 分钟之间');
  }
  if (!Number.isFinite(draft.completionRatio) || draft.completionRatio < 0 || draft.completionRatio > 1) {
    throw new ValidationError('完成比例必须在 0–1 之间');
  }
  const quantity = draft.quantity ?? null;
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000)) {
    throw new ValidationError('完成数量必须在 0–1,000,000 之间');
  }
  const note = (draft.userNote ?? '').trim();
  if (note.length > 2_000) throw new ValidationError('备注不能超过 2000 个字符');
  const quantityUnit = draft.quantityUnit?.trim() || null;
  if (quantityUnit !== null && quantityUnit.length > 24) throw new ValidationError('数量单位不能超过 24 个字符');

  return {
    actualMinutes: Math.round(draft.actualMinutes * 100) / 100,
    completionRatio: draft.completionRatio,
    difficulty: draft.difficulty ?? null,
    effort: draft.effort ?? null,
    quantity,
    quantityUnit,
    userNote: note,
  };
};
