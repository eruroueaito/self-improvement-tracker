/**
 * 模块名称：应用只读选择器
 * 职责描述：从事实快照派生目标反馈、活动名称和历史显示数据
 * 输入/输出：接收 AppSnapshot，返回不持久化的 UI 视图值
 * 依赖关系：应用端口、有效完成规则
 * 注意事项：不得在选择器中修改快照或写存储
 */
import { isEffectiveCompletion } from '../modules/recommendations/rollEngine';
import type { Goal } from '../modules/goals/types';
import type { AppSnapshot } from './ports';

export interface GoalFeedbackView {
  primary: string;
  value: number;
  target: number | null;
}

export const selectGoalFeedback = (snapshot: AppSnapshot, goal: Goal): GoalFeedbackView => {
  const sessions = snapshot.sessions.filter((session) => session.goalId === goal.id);
  if (goal.feedback.type === 'progress') {
    const value = Math.min(
      goal.feedback.target,
      goal.feedback.baseline + sessions.filter(isEffectiveCompletion).reduce(
        (sum, session) => sum + (session.settlement?.quantity ?? 0),
        0,
      ),
    );
    return { primary: `${value} / ${goal.feedback.target} ${goal.feedback.unit}`, value, target: goal.feedback.target };
  }
  if (goal.feedback.type === 'cumulative') {
    const value = goal.feedback.unit === 'times'
      ? sessions.filter(isEffectiveCompletion).length
      : sessions
          .filter((session) => session.status === 'settled' && session.endType !== 'abandoned')
          .reduce((sum, session) => sum + (session.settlement?.actualMinutes ?? 0), 0);
    return { primary: goal.feedback.unit === 'times' ? `${value} 次` : `${Math.round(value)} 分钟`, value, target: null };
  }

  const value = snapshot.rewardEntries
    .filter((entry) => entry.goalId === goal.id)
    .reduce((sum, entry) => sum + entry.goalXpDelta, 0);
  return { primary: `${Math.max(0, value)} XP · Lv.${Math.floor(Math.max(0, value) / 50) + 1}`, value, target: null };
};
