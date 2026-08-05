/**
 * 模块名称：Goal 详情页
 * 职责描述：编排 Goal 状态、派生反馈、多 Activity 管理和最近结算记录
 * 输入/输出：接收应用快照与独立命令回调，输出单个 Goal 的完整本地详情
 * 依赖关系：React、应用选择器、GoalForm、ActivityForm、GoalFeedbackCard
 * 注意事项：允许归档最后一个 Activity，但必须持续显示修复提示和恢复入口
 */
import { useState } from 'react';
import type { AppSnapshot } from '../../app/ports';
import { selectGoalDetail } from '../../app/selectors';
import type { ActivityDraft, GoalDraft, GoalStatus } from '../../modules/goals/types';
import { ActivityForm } from './ActivityForm';
import { GoalFeedbackCard } from './GoalFeedbackCard';
import { GoalForm } from './GoalForm';

export function GoalDetailScreen(props: {
  snapshot: AppSnapshot;
  goalId: string;
  busy: boolean;
  onBack: () => void;
  onUpdateGoal: (goalId: string, draft: GoalDraft) => Promise<boolean>;
  onStatus: (goalId: string, status: GoalStatus) => Promise<void>;
  onCreateActivity: (goalId: string, draft: ActivityDraft) => Promise<boolean>;
  onUpdateActivity: (goalId: string, activityId: string, draft: ActivityDraft) => Promise<boolean>;
  onArchiveActivity: (goalId: string, activityId: string) => Promise<void>;
  onRestoreActivity: (goalId: string, activityId: string) => Promise<void>;
  onOpenHistory: (goalId: string) => void;
}) {
  const detail = selectGoalDetail(props.snapshot, props.goalId);
  const [editingGoal, setEditingGoal] = useState(false);
  const [activityEditor, setActivityEditor] = useState<{ activityId: string | null } | null>(null);

  if (!detail) {
    return (
      <div className="stack">
        <div className="empty">这个目标已不存在。</div>
        <button onClick={props.onBack}>返回目标列表</button>
      </div>
    );
  }

  const editedActivity = activityEditor?.activityId
    ? detail.activeActivities.concat(detail.archivedActivities).find((activity) => activity.id === activityEditor.activityId)
    : undefined;
  const renderActivity = (activity: (typeof detail.activeActivities)[number], archived: boolean) => (
    <article className={`card activity-card ${archived ? 'archived-activity' : ''}`} key={activity.id}>
      <div>
        <h3>{activity.title}</h3>
        <p>{activity.minimumMinutes}–{activity.maximumMinutes} 分钟 · 精力 {activity.energyCost}</p>
        <small>{activity.contexts.length > 0 ? `场景：${activity.contexts.join('、')}` : '无场景限制'}</small>
      </div>
      <div className="actions">
        <button disabled={props.busy} onClick={() => setActivityEditor({ activityId: activity.id })}>编辑活动</button>
        {archived
          ? <button disabled={props.busy} onClick={() => void props.onRestoreActivity(detail.goal.id, activity.id)}>恢复活动</button>
          : <button className="danger" disabled={props.busy} onClick={() => void props.onArchiveActivity(detail.goal.id, activity.id)}>归档活动</button>}
      </div>
    </article>
  );

  return (
    <div className="stack goal-detail">
      <section className="section-heading detail-heading">
        <div>
          <button className="back-button" onClick={props.onBack}>← 返回目标列表</button>
          <span className={`status ${detail.goal.status}`}>{detail.goal.status === 'active' ? '进行中' : detail.goal.status === 'paused' ? '已暂停' : '已归档'}</span>
          <h2>{detail.goal.title}</h2>
          {detail.goal.description && <p>{detail.goal.description}</p>}
        </div>
        <div className="actions">
          <button disabled={props.busy} onClick={() => setEditingGoal(true)}>编辑目标</button>
          {detail.goal.status === 'active' && <button disabled={props.busy} onClick={() => void props.onStatus(detail.goal.id, 'paused')}>暂停目标</button>}
          {detail.goal.status === 'paused' && <button disabled={props.busy} onClick={() => void props.onStatus(detail.goal.id, 'active')}>恢复目标</button>}
          {detail.goal.status !== 'archived' && <button className="danger" disabled={props.busy} onClick={() => void props.onStatus(detail.goal.id, 'archived')}>归档目标</button>}
          {detail.goal.status === 'archived' && <button disabled={props.busy} onClick={() => void props.onStatus(detail.goal.id, 'active')}>重新启用目标</button>}
        </div>
      </section>

      {editingGoal && (
        <GoalForm
          key={detail.goal.updatedAt}
          mode="edit"
          goal={detail.goal}
          busy={props.busy}
          onSubmit={(draft) => props.onUpdateGoal(detail.goal.id, draft)}
          onCancel={() => setEditingGoal(false)}
          onDone={() => setEditingGoal(false)}
        />
      )}

      <GoalFeedbackCard feedback={detail.feedback} />

      <section className="stack" aria-labelledby="active-activities-title">
        <div className="section-heading">
          <div><h2 id="active-activities-title">可用活动</h2><p>{detail.activeActivities.length} 个活动可参与 Roll。</p></div>
          <button className="button secondary" disabled={props.busy} onClick={() => setActivityEditor({ activityId: null })}>添加活动</button>
        </div>
        {detail.goal.status === 'active' && detail.activeActivities.length === 0 && (
          <div className="message warning" role="status">这个进行中的目标需要至少一个可用活动。</div>
        )}
        {activityEditor && (
          <ActivityForm
            key={activityEditor.activityId ?? 'new'}
            activity={editedActivity}
            busy={props.busy}
            onSubmit={(draft) => activityEditor.activityId === null
              ? props.onCreateActivity(detail.goal.id, draft)
              : props.onUpdateActivity(detail.goal.id, activityEditor.activityId, draft)}
            onCancel={() => setActivityEditor(null)}
            onDone={() => setActivityEditor(null)}
          />
        )}
        <div className="activity-list">
          {detail.activeActivities.map((activity) => renderActivity(activity, false))}
        </div>
      </section>

      {detail.archivedActivities.length > 0 && (
        <details className="card archived-list">
          <summary>已归档活动（{detail.archivedActivities.length}）</summary>
          <div className="activity-list">{detail.archivedActivities.map((activity) => renderActivity(activity, true))}</div>
        </details>
      )}

      <section className="stack" aria-labelledby="recent-activities-title">
        <div className="section-heading">
          <div><h2 id="recent-activities-title">最近记录</h2><p>显示最近五条已结算或已撤销记录。</p></div>
          <button onClick={() => props.onOpenHistory(detail.goal.id)}>查看此目标的全部历史</button>
        </div>
        {detail.recentActivities.length === 0 && <div className="empty">这个目标还没有结算记录。</div>}
        {detail.recentActivities.map((entry) => (
          <article className={`card recent-activity ${entry.status === 'voided' ? 'voided' : ''}`} key={entry.sessionId}>
            <div className="history-meta"><time>{new Date(entry.settledAt).toLocaleString()}</time><span>{entry.status === 'voided' ? '已撤销' : '已结算'}</span></div>
            <h3>{entry.activityTitle}</h3>
            <p>{entry.actualMinutes} 分钟 · 完成 {Math.round(entry.completionRatio * 100)}%</p>
          </article>
        ))}
      </section>
    </div>
  );
}
