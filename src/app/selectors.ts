/**
 * 模块名称：应用只读选择器
 * 职责描述：从事实快照派生目标反馈、活动名称和历史显示数据
 * 输入/输出：接收 AppSnapshot，返回不持久化的 UI 视图值
 * 依赖关系：应用端口、有效完成规则
 * 注意事项：不得在选择器中修改快照或写存储
 */
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import { isEffectiveCompletion } from '../modules/recommendations/rollEngine';
import type { Session } from '../modules/sessions/types';
import type { AppSnapshot } from './ports';

export interface GoalFeedbackView {
  primary: string;
  type: Goal['feedback']['type'];
  baseline: number | null;
  value: number;
  target: number | null;
  unit: string;
  ratio: number | null;
}

export interface GoalCatalogItemView {
  goal: Goal;
  feedback: GoalFeedbackView;
  activeActivityCount: number;
  needsActivity: boolean;
}

export interface GoalRecentActivityView {
  sessionId: string;
  activityTemplateId: string;
  activityTitle: string;
  settledAt: number;
  actualMinutes: number;
  completionRatio: number;
  status: 'settled' | 'voided';
}

export interface GoalDetailView {
  goal: Goal;
  feedback: GoalFeedbackView;
  activeActivities: ActivityTemplate[];
  archivedActivities: ActivityTemplate[];
  recentActivities: GoalRecentActivityView[];
}

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

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
    const ratio = goal.feedback.baseline === goal.feedback.target
      ? 1
      : clamp((value - goal.feedback.baseline) / (goal.feedback.target - goal.feedback.baseline), 0, 1);
    return {
      primary: `${value} / ${goal.feedback.target} ${goal.feedback.unit}`,
      type: goal.feedback.type,
      baseline: goal.feedback.baseline,
      value,
      target: goal.feedback.target,
      unit: goal.feedback.unit,
      ratio,
    };
  }
  if (goal.feedback.type === 'cumulative') {
    const value = goal.feedback.unit === 'times'
      ? sessions.filter(isEffectiveCompletion).length
      : sessions
          .filter((session) => session.status === 'settled' && session.endType !== 'abandoned')
          .reduce((sum, session) => sum + (session.settlement?.actualMinutes ?? 0), 0);
    return {
      primary: goal.feedback.unit === 'times' ? `${value} 次` : `${Math.round(value)} 分钟`,
      type: goal.feedback.type,
      baseline: null,
      value,
      target: null,
      unit: goal.feedback.unit,
      ratio: null,
    };
  }

  const value = Math.max(0, snapshot.rewardEntries
    .filter((entry) => entry.goalId === goal.id)
    .reduce((sum, entry) => sum + entry.goalXpDelta, 0));
  return {
    primary: `${value} XP · Lv.${Math.floor(value / 50) + 1}`,
    type: goal.feedback.type,
    baseline: null,
    value,
    target: null,
    unit: 'xp',
    ratio: null,
  };
};

export const selectGoalCatalogItems = (snapshot: AppSnapshot): GoalCatalogItemView[] =>
  snapshot.goals.map((goal) => {
    const activeActivityCount = snapshot.activities.filter(
      (activity) => activity.goalId === goal.id && activity.archivedAt === null,
    ).length;
    return {
      goal,
      feedback: selectGoalFeedback(snapshot, goal),
      activeActivityCount,
      needsActivity: goal.status === 'active' && activeActivityCount === 0,
    };
  });

const byCreatedAtThenId = (left: ActivityTemplate, right: ActivityTemplate): number =>
  left.createdAt - right.createdAt || left.id.localeCompare(right.id);

const hasCompletedSettlement = (
  session: Session,
): session is Session & { status: 'settled' | 'voided'; settledAt: number; settlement: NonNullable<Session['settlement']> } =>
  (session.status === 'settled' || session.status === 'voided') &&
  session.settledAt !== null &&
  session.settlement !== null;

export const selectGoalDetail = (snapshot: AppSnapshot, goalId: string): GoalDetailView | null => {
  const goal = snapshot.goals.find((candidate) => candidate.id === goalId);
  if (!goal) return null;

  const goalActivities = snapshot.activities.filter((activity) => activity.goalId === goalId);
  const activityTitles = new Map(goalActivities.map((activity) => [activity.id, activity.title]));
  const recentActivities = snapshot.sessions
    .filter(hasCompletedSettlement)
    .filter((session) => session.goalId === goalId)
    .sort((left, right) => right.settledAt - left.settledAt || left.id.localeCompare(right.id))
    .slice(0, 5)
    .map((session): GoalRecentActivityView => ({
      sessionId: session.id,
      activityTemplateId: session.activityTemplateId,
      activityTitle: activityTitles.get(session.activityTemplateId) ?? '未知活动',
      settledAt: session.settledAt,
      actualMinutes: session.settlement.actualMinutes,
      completionRatio: session.settlement.completionRatio,
      status: session.status,
    }));

  return {
    goal,
    feedback: selectGoalFeedback(snapshot, goal),
    activeActivities: goalActivities.filter((activity) => activity.archivedAt === null).sort(byCreatedAtThenId),
    archivedActivities: goalActivities.filter((activity) => activity.archivedAt !== null).sort(byCreatedAtThenId),
    recentActivities,
  };
};
