/**
 * 模块名称：Goals 页面
 * 职责描述：创建/编辑目标与首个活动，切换状态并管理完整本地数据
 * 输入/输出：接收应用快照与命令回调，输出目标表单、卡片和设置入口
 * 依赖关系：React、目标领域类型、应用选择器
 * 注意事项：文件导入先由应用层完整校验；清空需要二次确认
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { AppSnapshot } from '../../app/ports';
import { selectGoalFeedback } from '../../app/selectors';
import type { ActivityDraft, FeedbackConfig, GoalDraft, GoalStatus } from '../../modules/goals/types';

export function GoalsScreen(props: {
  snapshot: AppSnapshot;
  busy: boolean;
  onCreate: (goal: GoalDraft, activity: ActivityDraft) => Promise<void>;
  onUpdate: (goalId: string, goal: GoalDraft, activityId: string, activity: ActivityDraft) => Promise<void>;
  onStatus: (id: string, status: GoalStatus) => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (contents: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [open, setOpen] = useState(props.snapshot.goals.length === 0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [minimumMinutes, setMinimumMinutes] = useState(10);
  const [maximumMinutes, setMaximumMinutes] = useState(30);
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [feedbackType, setFeedbackType] = useState<'times' | 'minutes' | 'progress' | 'experience'>('times');
  const [target, setTarget] = useState(100);
  const [baseline, setBaseline] = useState(0);
  const [unit, setUnit] = useState('页');
  const [contexts, setContexts] = useState('');
  const [goalCadence, setGoalCadence] = useState('');
  const [goalRest, setGoalRest] = useState(0);
  const [activityCadence, setActivityCadence] = useState('');
  const [activityRest, setActivityRest] = useState('');
  const [rewardWeight, setRewardWeight] = useState(1);
  const [editing, setEditing] = useState<{ goalId: string; activityId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const feedback: FeedbackConfig = feedbackType === 'progress'
    ? { type: 'progress', baseline, target, unit }
    : feedbackType === 'experience'
      ? { type: 'experience' }
      : { type: 'cumulative', unit: feedbackType };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const goalDraft: GoalDraft = {
      title, description, importance, feedback, defaultEnergyCost: energy,
      desiredCadenceDays: goalCadence === '' ? null : Number(goalCadence),
      minimumRestHours: goalRest,
    };
    const activityDraft: ActivityDraft = {
      title: activityTitle, description: activityDescription, minimumMinutes, maximumMinutes, energyCost: energy,
      contexts: contexts.split(','), minimumRestHours: activityRest === '' ? null : Number(activityRest),
      suggestedCadenceDays: activityCadence === '' ? null : Number(activityCadence), rewardWeight,
    };
    if (editing) await props.onUpdate(editing.goalId, goalDraft, editing.activityId, activityDraft);
    else await props.onCreate(goalDraft, activityDraft);
    setTitle('');
    setDescription('');
    setActivityTitle('');
    setActivityDescription('');
    setEditing(null);
    setOpen(false);
  };

  const editGoal = (goalId: string): void => {
    const goal = props.snapshot.goals.find((candidate) => candidate.id === goalId);
    const activity = props.snapshot.activities.find((candidate) => candidate.goalId === goalId && candidate.archivedAt === null);
    if (!goal || !activity) return;
    setEditing({ goalId, activityId: activity.id });
    setTitle(goal.title);
    setDescription(goal.description);
    setActivityTitle(activity.title);
    setActivityDescription(activity.description);
    setMinimumMinutes(activity.minimumMinutes);
    setMaximumMinutes(activity.maximumMinutes);
    setImportance(goal.importance);
    setEnergy(activity.energyCost);
    setContexts(activity.contexts.join(', '));
    setGoalCadence(goal.desiredCadenceDays?.toString() ?? '');
    setGoalRest(goal.minimumRestHours);
    setActivityCadence(activity.suggestedCadenceDays?.toString() ?? '');
    setActivityRest(activity.minimumRestHours?.toString() ?? '');
    setRewardWeight(activity.rewardWeight);
    if (goal.feedback.type === 'progress') {
      setFeedbackType('progress');
      setTarget(goal.feedback.target);
      setBaseline(goal.feedback.baseline);
      setUnit(goal.feedback.unit);
    } else if (goal.feedback.type === 'experience') setFeedbackType('experience');
    else setFeedbackType(goal.feedback.unit);
    setOpen(true);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await props.onImport(await file.text());
    event.target.value = '';
  };

  return (
    <div className="stack">
      <section className="section-heading">
        <div><h2>长期方向</h2><p>每个目标从一个可以立即开始的活动起步。</p></div>
        <button className="button secondary" onClick={() => {
          if (open) {
            setEditing(null);
            setOpen(false);
          } else {
            setEditing(null);
            setTitle('');
            setDescription('');
            setActivityTitle('');
            setActivityDescription('');
            setOpen(true);
          }
        }}>{open ? '收起' : '新建目标'}</button>
      </section>

      {open && (
        <form className="card form-grid" onSubmit={(event) => void submit(event)}>
          <label>目标名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：更稳定地阅读" required maxLength={80} /></label>
          <label>目标说明<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="可选" maxLength={2000} /></label>
          <label>第一个活动<input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="例如：读 10 页" required maxLength={80} /></label>
          <label>活动说明<input value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} placeholder="可选" maxLength={2000} /></label>
          <label>最短分钟<input type="number" min="1" max="480" value={minimumMinutes} onChange={(event) => setMinimumMinutes(Number(event.target.value))} /></label>
          <label>最长分钟<input type="number" min={minimumMinutes} max="480" value={maximumMinutes} onChange={(event) => setMaximumMinutes(Number(event.target.value))} /></label>
          <label>重要性<select value={importance} onChange={(event) => setImportance(Number(event.target.value) as typeof importance)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>精力消耗<select value={energy} onChange={(event) => setEnergy(Number(event.target.value) as typeof energy)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>反馈方式<select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value as typeof feedbackType)}><option value="times">累计次数</option><option value="minutes">累计分钟</option><option value="progress">数值进度</option><option value="experience">经验值</option></select></label>
          {feedbackType === 'progress' && <><label>当前起点<input type="number" min="0" max={target} value={baseline} onChange={(event) => setBaseline(Number(event.target.value))} /></label><label>目标值<input type="number" min="0.01" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><label>单位<input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={24} /></label></>}
          <label>目标节奏（天，可空）<input type="number" min="0.01" step="any" value={goalCadence} onChange={(event) => setGoalCadence(event.target.value)} /></label>
          <label>目标最短休息（小时）<input type="number" min="0" step="any" value={goalRest} onChange={(event) => setGoalRest(Number(event.target.value))} /></label>
          <label>活动节奏（天，优先，可空）<input type="number" min="0.01" step="any" value={activityCadence} onChange={(event) => setActivityCadence(event.target.value)} /></label>
          <label>活动最短休息（小时，可空）<input type="number" min="0" step="any" value={activityRest} onChange={(event) => setActivityRest(event.target.value)} /></label>
          <label>奖励权重<input type="number" min="0.25" max="3" step="0.05" value={rewardWeight} onChange={(event) => setRewardWeight(Number(event.target.value))} /></label>
          <label className="wide">所需场景（逗号分隔，可空）<input value={contexts} onChange={(event) => setContexts(event.target.value)} placeholder="家, 安静" /></label>
          <button className="button primary wide" disabled={props.busy}>{editing ? '保存修改' : '保存到本机'}</button>
        </form>
      )}

      <div className="goal-list">
        {props.snapshot.goals.length === 0 && !open && <div className="empty">还没有目标。创建一个小而明确的起点吧。</div>}
        {props.snapshot.goals.map((goal) => {
          const feedbackView = selectGoalFeedback(props.snapshot, goal);
          const activities = props.snapshot.activities.filter((activity) => activity.goalId === goal.id && activity.archivedAt === null);
          return (
            <article className="card goal-card" key={goal.id}>
              <div><span className={`status ${goal.status}`}>{goal.status === 'active' ? '进行中' : goal.status === 'paused' ? '已暂停' : '已归档'}</span><h3>{goal.title}</h3><p className="feedback">{feedbackView.primary}</p><small>{activities.map((activity) => activity.title).join(' · ')}</small></div>
              <div className="actions">
                <button onClick={() => editGoal(goal.id)}>编辑</button>
                {goal.status === 'active' && <button onClick={() => void props.onStatus(goal.id, 'paused')}>暂停</button>}
                {goal.status === 'paused' && <button onClick={() => void props.onStatus(goal.id, 'active')}>恢复</button>}
                {goal.status !== 'archived' && <button onClick={() => void props.onStatus(goal.id, 'archived')}>归档</button>}
                {goal.status === 'archived' && <button onClick={() => void props.onStatus(goal.id, 'active')}>重新启用</button>}
              </div>
            </article>
          );
        })}
      </div>

      <details className="card settings">
        <summary>本地数据与设置</summary>
        <p>导出包含全部目标、专注、历史和奖励，不包含密钥。</p>
        <div className="actions">
          <button onClick={() => void props.onExport()}>导出 JSON</button>
          <button onClick={() => fileRef.current?.click()}>导入 JSON</button>
          <button className="danger" onClick={() => void props.onClear()}>清空全部本地数据</button>
          <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event)} />
        </div>
      </details>
    </div>
  );
}
