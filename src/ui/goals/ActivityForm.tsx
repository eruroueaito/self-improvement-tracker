/**
 * 模块名称：Activity 创建与编辑表单
 * 职责描述：编辑一个 ActivityTemplate 的完整用户可配置字段
 * 输入/输出：接收可选 Activity 初值，提交 ActivityDraft
 * 依赖关系：React、Activity 领域类型
 * 注意事项：提交失败时保留输入；createdAt、archivedAt 与 goalId 不由表单修改
 */
import { useState, type FormEvent } from 'react';
import type { ActivityDraft, ActivityTemplate } from '../../modules/goals/types';

export function ActivityForm(props: {
  activity?: ActivityTemplate;
  busy: boolean;
  onSubmit: (draft: ActivityDraft) => Promise<boolean>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(props.activity?.title ?? '');
  const [description, setDescription] = useState(props.activity?.description ?? '');
  const [minimumMinutes, setMinimumMinutes] = useState(props.activity?.minimumMinutes ?? 10);
  const [maximumMinutes, setMaximumMinutes] = useState(props.activity?.maximumMinutes ?? 30);
  const [energyCost, setEnergyCost] = useState<1 | 2 | 3 | 4 | 5>(props.activity?.energyCost ?? 3);
  const [contexts, setContexts] = useState(props.activity?.contexts.join(', ') ?? '');
  const [minimumRestHours, setMinimumRestHours] = useState(props.activity?.minimumRestHours?.toString() ?? '');
  const [suggestedCadenceDays, setSuggestedCadenceDays] = useState(props.activity?.suggestedCadenceDays?.toString() ?? '');
  const [rewardWeight, setRewardWeight] = useState(props.activity?.rewardWeight ?? 1);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const succeeded = await props.onSubmit({
      title,
      description,
      minimumMinutes,
      maximumMinutes,
      energyCost,
      contexts: contexts.split(','),
      minimumRestHours: minimumRestHours === '' ? null : Number(minimumRestHours),
      suggestedCadenceDays: suggestedCadenceDays === '' ? null : Number(suggestedCadenceDays),
      rewardWeight,
    });
    if (succeeded) props.onDone();
  };

  return (
    <form className="card form-grid" onSubmit={(event) => void submit(event)}>
      <label>活动名称<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} /></label>
      <label>活动说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} /></label>
      <label>最短分钟<input type="number" min="1" max="480" value={minimumMinutes} onChange={(event) => setMinimumMinutes(Number(event.target.value))} /></label>
      <label>最长分钟<input type="number" min={minimumMinutes} max="480" value={maximumMinutes} onChange={(event) => setMaximumMinutes(Number(event.target.value))} /></label>
      <label>精力消耗<select value={energyCost} onChange={(event) => setEnergyCost(Number(event.target.value) as typeof energyCost)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>奖励权重<input type="number" min="0.25" max="3" step="0.05" value={rewardWeight} onChange={(event) => setRewardWeight(Number(event.target.value))} /></label>
      <label>活动节奏（天，可空）<input type="number" min="0.01" step="any" value={suggestedCadenceDays} onChange={(event) => setSuggestedCadenceDays(event.target.value)} /></label>
      <label>活动最短休息（小时，可空）<input type="number" min="0" step="any" value={minimumRestHours} onChange={(event) => setMinimumRestHours(event.target.value)} /></label>
      <label className="wide">所需场景（逗号分隔，可空）<input value={contexts} onChange={(event) => setContexts(event.target.value)} placeholder="家, 安静" /></label>
      <div className="actions wide">
        <button className="button primary" disabled={props.busy}>{props.activity ? '保存修改' : '保存活动'}</button>
        <button type="button" disabled={props.busy} onClick={props.onCancel}>取消</button>
      </div>
    </form>
  );
}
