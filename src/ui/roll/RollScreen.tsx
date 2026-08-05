/**
 * 模块名称：Roll 页面
 * 职责描述：收集可用时间、精力和场景，展示确定性候选并启动专注
 * 输入/输出：接收应用快照/回调，输出结构化 Roll 表单与候选卡
 * 依赖关系：React、推荐类型、共享展示映射
 * 注意事项：页面不自行评分，也不使用随机数或网络
 */
import { useState } from 'react';
import type { AppSnapshot } from '../../app/ports';
import type { CompanionView } from '../../modules/companion/types';
import type { RecommendationRun } from '../../modules/recommendations/types';
import { CompanionAvatar } from '../companion/CompanionAvatar';
import { activityStateLabel, companionMoodLabel, companionUnlockLabel, reasonLabel } from '../shared/presentation';

export function RollScreen(props: {
  snapshot: AppSnapshot;
  companionView: CompanionView;
  currentRun: RecommendationRun | null;
  busy: boolean;
  onRoll: (minutes: number, energy: 1 | 2 | 3 | 4 | 5 | null, contexts: string[]) => Promise<void>;
  onDismiss: (runId: string, activityId: string) => Promise<void>;
  onStart: (runId: string, activityId: string, mode: 'flowtime' | 'countdown', minutes: number | null) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(25);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [contexts, setContexts] = useState('');
  const moodLabel = companionMoodLabel(props.companionView.mood);
  const activityLabel = activityStateLabel(props.companionView.activityState.score);
  const stateSummary = moodLabel === activityLabel ? moodLabel : `${moodLabel} · ${activityLabel}`;

  return (
    <div className="stack">
      <section className="hero card">
        <div className="companion-hero-scene">
          <CompanionAvatar
            stage={props.companionView.projection.evolutionStage}
            mood={props.companionView.mood}
            size="expanded"
            motion={props.snapshot.settings.motion}
          />
          <ul className="room-unlocks" aria-label="已解锁房间物品">
            {props.companionView.unlocks.length === 0
              ? <li className="room-unlock-empty">继续行动会自然布置小房间</li>
              : props.companionView.unlocks.map((unlock) => <li className={`room-unlock unlock-${unlock}`} key={unlock}>{companionUnlockLabel(unlock)}</li>)}
          </ul>
        </div>
        <div className="hero-copy">
          <p className="companion-state-copy">{stateSummary}</p>
          <h2>给现在一个合适的动作</h2>
          <p>排序完全在本机完成。伙伴只回应已有记录，不会改变 Roll。</p>
        </div>
      </section>
      <form className="card roll-form" onSubmit={(event) => { event.preventDefault(); void props.onRoll(minutes, energy, contexts.split(',')); }}>
        <fieldset><legend>可用时间</legend><div className="chips">{[10, 15, 25, 45, 60].map((value) => <button type="button" className={minutes === value ? 'selected' : ''} key={value} onClick={() => setMinutes(value)}>{value} 分</button>)}</div><label>自定义<input type="number" min="1" max="480" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></fieldset>
        <fieldset><legend>当前精力（可选）</legend><div className="chips"><button type="button" className={energy === null ? 'selected' : ''} onClick={() => setEnergy(null)}>不限制</button>{[1, 2, 3, 4, 5].map((value) => <button type="button" className={energy === value ? 'selected' : ''} key={value} onClick={() => setEnergy(value as typeof energy)}>{value}</button>)}</div></fieldset>
        <label>当前场景（可选，逗号分隔）<input value={contexts} onChange={(event) => setContexts(event.target.value)} placeholder="家, 安静" /></label>
        <button className="button primary" disabled={props.busy}>给我三个行动</button>
      </form>

      {props.currentRun && (
        <section className="recommendations" aria-live="polite">
          {props.currentRun.candidates.length === 0 && <div className="empty">没有合适候选。可以调整时间/场景，或去目标页检查状态。</div>}
          {props.currentRun.candidates.map((candidate, index) => {
            const activity = props.snapshot.activities.find((item) => item.id === candidate.activityTemplateId);
            const goal = props.snapshot.goals.find((item) => item.id === candidate.goalId);
            const dismissed = props.currentRun?.dismissedActivityTemplateIds.includes(candidate.activityTemplateId);
            return (
              <article className={`card recommendation ${dismissed ? 'dismissed' : ''}`} key={candidate.activityTemplateId}>
                <span className="rank">{index + 1}</span><div className="recommendation-body"><p className="eyebrow">{goal?.title}</p><h3>{activity?.title}</h3><p>{candidate.suggestedMinutes} 分钟 · {candidate.reasonCodes.map(reasonLabel).join(' · ')}</p><div className="actions"><button className="button primary" disabled={dismissed} onClick={() => void props.onStart(props.currentRun!.id, candidate.activityTemplateId, 'flowtime', null)}>开始 Flowtime</button><button disabled={dismissed} onClick={() => void props.onStart(props.currentRun!.id, candidate.activityTemplateId, 'countdown', candidate.suggestedMinutes)}>倒计时 {candidate.suggestedMinutes} 分</button><button disabled={dismissed} onClick={() => void props.onDismiss(props.currentRun!.id, candidate.activityTemplateId)}>{dismissed ? '已略过' : '暂不想做'}</button></div></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
