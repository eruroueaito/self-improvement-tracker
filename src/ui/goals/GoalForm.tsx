/**
 * 模块名称：Goal 创建与编辑表单
 * 职责描述：提供紧凑 Goal 输入、首 Activity 快速创建和可展开高级设置
 * 输入/输出：接收可选 Goal 初值，输出标准化前的 GoalInput 与首 ActivityInput
 * 依赖关系：React、Goal/Activity 领域类型
 * 注意事项：只有提交命令成功后才调用 onDone，失败时必须保留全部受控输入
 */
import { useState, type FormEvent } from 'react';
import type { ActivityInput, FeedbackConfig, Goal, GoalInput } from '../../modules/goals/types';

type FeedbackChoice = 'times' | 'minutes' | 'progress' | 'experience';

type GoalFormProps = {
  busy: boolean;
  onCancel: () => void;
  onDone: () => void;
} & (
  | { mode: 'create'; onSubmit: (goal: GoalInput, activity: ActivityInput) => Promise<boolean> }
  | { mode: 'edit'; goal: Goal; onSubmit: (goal: GoalInput) => Promise<boolean> }
);

const feedbackChoice = (goal: Goal | null): FeedbackChoice => {
  if (!goal) return 'times';
  if (goal.feedback.type === 'experience') return 'experience';
  if (goal.feedback.type === 'progress') return 'progress';
  return goal.feedback.unit;
};

export function GoalForm(props: GoalFormProps) {
  const initialGoal = props.mode === 'edit' ? props.goal : null;
  const [title, setTitle] = useState(initialGoal?.title ?? '');
  const [description, setDescription] = useState(initialGoal?.description ?? '');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [minimumMinutes, setMinimumMinutes] = useState(10);
  const [maximumMinutes, setMaximumMinutes] = useState(30);
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(initialGoal?.importance ?? 3);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(initialGoal?.defaultEnergyCost ?? 3);
  const [feedbackType, setFeedbackType] = useState<FeedbackChoice>(feedbackChoice(initialGoal));
  const [target, setTarget] = useState(initialGoal?.feedback.type === 'progress' ? initialGoal.feedback.target : 100);
  const [baseline, setBaseline] = useState(initialGoal?.feedback.type === 'progress' ? initialGoal.feedback.baseline : 0);
  const [unit, setUnit] = useState(initialGoal?.feedback.type === 'progress' ? initialGoal.feedback.unit : '页');
  const [contexts, setContexts] = useState('');
  const [goalCadence, setGoalCadence] = useState(initialGoal?.desiredCadenceDays?.toString() ?? '');
  const [goalRest, setGoalRest] = useState(initialGoal?.minimumRestHours ?? 0);
  const [activityCadence, setActivityCadence] = useState('');
  const [activityRest, setActivityRest] = useState('');
  const [rewardWeight, setRewardWeight] = useState(1);

  const feedback: FeedbackConfig = feedbackType === 'progress'
    ? { type: 'progress', baseline, target, unit }
    : feedbackType === 'experience'
      ? { type: 'experience' }
      : { type: 'cumulative', unit: feedbackType };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const goalInput: GoalInput = {
      title,
      description,
      importance,
      feedback,
      defaultEnergyCost: energy,
      desiredCadenceDays: goalCadence === '' ? null : Number(goalCadence),
      minimumRestHours: goalRest,
    };
    const succeeded = props.mode === 'create'
      ? await props.onSubmit(goalInput, {
          title: activityTitle,
          description: activityDescription,
          minimumMinutes,
          maximumMinutes,
          energyCost: energy,
          contexts: contexts.split(','),
          minimumRestHours: activityRest === '' ? null : Number(activityRest),
          suggestedCadenceDays: activityCadence === '' ? null : Number(activityCadence),
          rewardWeight,
        })
      : await props.onSubmit(goalInput);
    if (succeeded) props.onDone();
  };

  return (
    <form className="card form-grid" onSubmit={(event) => void submit(event)}>
      <label>目标名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：更稳定地阅读" required maxLength={80} /></label>
      {props.mode === 'create' && <label>第一个活动<input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="例如：读 10 页" required maxLength={80} /></label>}
      {props.mode === 'create' && <label>最短分钟<input type="number" min="1" max="480" value={minimumMinutes} onChange={(event) => setMinimumMinutes(Number(event.target.value))} /></label>}
      {props.mode === 'create' && <label>最长分钟<input type="number" min={minimumMinutes} max="480" value={maximumMinutes} onChange={(event) => setMaximumMinutes(Number(event.target.value))} /></label>}
      <label>精力消耗<select value={energy} onChange={(event) => setEnergy(Number(event.target.value) as typeof energy)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>

      <details className="advanced-fields wide">
        <summary>高级设置</summary>
        <div className="form-grid">
          <label className="wide">目标说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="可选" maxLength={2000} /></label>
          <label>重要性<select value={importance} onChange={(event) => setImportance(Number(event.target.value) as typeof importance)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>反馈方式<select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value as FeedbackChoice)}><option value="times">累计次数</option><option value="minutes">累计分钟</option><option value="progress">数值进度</option><option value="experience">经验值</option></select></label>
          {feedbackType === 'progress' && <><label>当前起点<input type="number" min="0" max={target} step="any" value={baseline} onChange={(event) => setBaseline(Number(event.target.value))} /></label><label>目标值<input type="number" min="0.01" step="any" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><label>单位<input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={24} /></label></>}
          <label>目标节奏（天，可空）<input type="number" min="0.01" step="any" value={goalCadence} onChange={(event) => setGoalCadence(event.target.value)} /></label>
          <label>目标最短休息（小时）<input type="number" min="0" step="any" value={goalRest} onChange={(event) => setGoalRest(Number(event.target.value))} /></label>
          {props.mode === 'create' && <>
            <label className="wide">活动说明<textarea value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} placeholder="可选" maxLength={2000} /></label>
            <label>活动节奏（天，可空）<input type="number" min="0.01" step="any" value={activityCadence} onChange={(event) => setActivityCadence(event.target.value)} /></label>
            <label>活动最短休息（小时，可空）<input type="number" min="0" step="any" value={activityRest} onChange={(event) => setActivityRest(event.target.value)} /></label>
            <label>奖励权重<input type="number" min="0.25" max="3" step="0.05" value={rewardWeight} onChange={(event) => setRewardWeight(Number(event.target.value))} /></label>
            <label className="wide">所需场景（逗号分隔，可空）<input value={contexts} onChange={(event) => setContexts(event.target.value)} placeholder="家, 安静" /></label>
          </>}
        </div>
      </details>

      <div className="actions wide">
        <button className="button primary" disabled={props.busy}>{props.mode === 'create' ? '保存到本机' : '保存目标修改'}</button>
        <button type="button" disabled={props.busy} onClick={props.onCancel}>取消</button>
      </div>
    </form>
  );
}
