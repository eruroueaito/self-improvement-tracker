/**
 * 模块名称：Settlement 页面
 * 职责描述：收集用户确认的实际时长、完成比例、投入、难度、数量和备注
 * 输入/输出：接收 ended Session，输出经过应用层事务提交的 SettlementDraft
 * 依赖关系：React、Goal/Session 领域类型
 * 注意事项：用户确认前不写奖励，页面不能更改 endType
 */
import { useState, type FormEvent } from 'react';
import type { Goal } from '../../modules/goals/types';
import type { Session, SettlementDraft } from '../../modules/sessions/types';

export function SettlementScreen(props: {
  session: Session;
  goal: Goal | undefined;
  busy: boolean;
  onSettle: (draft: SettlementDraft) => Promise<void>;
}) {
  const [actualMinutes, setActualMinutes] = useState(Math.round(props.session.accumulatedMs / 60_000 * 10) / 10);
  const [completionRatio, setCompletionRatio] = useState(props.session.endType === 'completed' ? 1 : props.session.endType === 'abandoned' ? 0 : 0.5);
  const [effort, setEffort] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const progressUnit = props.goal?.feedback.type === 'progress' ? props.goal.feedback.unit : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void props.onSettle({ actualMinutes, completionRatio, effort, difficulty, quantity: quantity === '' ? null : Number(quantity), quantityUnit: progressUnit, userNote: note });
  };

  return (
    <form className="card settlement" onSubmit={submit}>
      <p className="eyebrow">由你确认事实</p><h2>这次进展如何？</h2>
      <label>实际分钟<input type="number" min="0" max="1440" step="0.1" value={actualMinutes} onChange={(event) => setActualMinutes(Number(event.target.value))} /></label>
      <label>完成比例 <strong>{Math.round(completionRatio * 100)}%</strong><input type="range" min="0" max="1" step="0.1" value={completionRatio} onChange={(event) => setCompletionRatio(Number(event.target.value))} /></label>
      <label>投入程度<select value={effort} onChange={(event) => setEffort(Number(event.target.value) as typeof effort)}>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label>难度<select value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as typeof difficulty)}>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      {progressUnit && <label>完成数量（{progressUnit}）<input type="number" min="0" max="1000000" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required={props.session.endType === 'completed' && completionRatio >= 0.5} /></label>}
      <label>备注<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="可选：记下感受或下一步" /></label>
      <button className="button primary" disabled={props.busy}>确认结算</button>
    </form>
  );
}
