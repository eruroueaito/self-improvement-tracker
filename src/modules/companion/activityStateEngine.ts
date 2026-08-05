/**
 * 模块名称：ActivityStateEngine v1
 * 职责描述：从有效 Session 完成事实派生跨平台一致的近期活动状态
 * 输入/输出：接收 sessions 与显式 now，输出 0–100 的版本化正向视觉信号
 * 依赖关系：有效完成判定、Session 类型、领域 ValidationError
 * 注意事项：只按 UTC 日期和不同 Goal 去重，不读取 XP、奖励权重、系统时区或伙伴状态
 */
import { ValidationError } from '../goals/validation';
import { isEffectiveCompletion } from '../sessions/completion';
import type { Session } from '../sessions/types';
import type { ActivityStateV1 } from './types';

const DAY_MS = 86_400_000;

export const calculateActivityState = (input: { sessions: Session[]; now: number }): ActivityStateV1 => {
  if (!Number.isFinite(input.now)) throw new ValidationError('ActivityState now 必须是有限数字');

  const currentOrdinal = Math.floor(input.now / DAY_MS);
  const activeDays = new Set<number>();
  const distinctGoals = new Set<string>();

  for (const session of input.sessions) {
    if (!isEffectiveCompletion(session) || session.settledAt === null || session.settledAt > input.now) continue;
    const settledOrdinal = Math.floor(session.settledAt / DAY_MS);
    if (settledOrdinal >= currentOrdinal - 6 && settledOrdinal <= currentOrdinal) activeDays.add(settledOrdinal);
    if (settledOrdinal >= currentOrdinal - 13 && settledOrdinal <= currentOrdinal) distinctGoals.add(session.goalId);
  }

  const activeDays7 = Math.min(7, activeDays.size);
  const distinctGoals14 = Math.min(3, distinctGoals.size);
  const recentActivityPoints = activeDays7 * 10;
  const breadthPoints = distinctGoals14 * 10;

  return {
    version: 1,
    score: Math.min(100, recentActivityPoints + breadthPoints),
    activeDays7,
    distinctGoals14,
    recentActivityPoints,
    breadthPoints,
  };
};
