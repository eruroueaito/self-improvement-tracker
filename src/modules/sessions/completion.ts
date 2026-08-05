/**
 * 模块名称：有效完成判定
 * 职责描述：统一判断 Session 是否构成 Goal、Roll 与活动状态可使用的有效完成事实
 * 输入/输出：接收 Session，输出布尔判定
 * 依赖关系：Session 领域类型
 * 注意事项：只有已结算、主动完成且完成率至少 50% 的 Session 才成立
 */
import type { Session } from './types';

export const isEffectiveCompletion = (session: Session): boolean =>
  session.status === 'settled' &&
  session.endType === 'completed' &&
  (session.settlement?.completionRatio ?? 0) >= 0.5;
