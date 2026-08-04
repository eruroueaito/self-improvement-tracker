/**
 * 模块名称：Focus 页面
 * 职责描述：显示 Flowtime/Countdown 当前时长并转发暂停、继续与结束动作
 * 输入/输出：接收 Session 和当前派生时长，输出专注控制界面
 * 依赖关系：Session 领域类型
 * 注意事项：计时事实由应用层持久字段决定，页面 tick 不写数据库
 */
import type { Session } from '../../modules/sessions/types';

export function FocusScreen(props: {
  session: Session;
  tick: number;
  elapsedMinutes: number;
  activityTitle: string;
  busy: boolean;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onEnd: (action: 'finish' | 'interrupt' | 'abandon') => Promise<void>;
}) {
  const elapsedSeconds = Math.floor(props.elapsedMinutes * 60);
  const targetSeconds = (props.session.targetDurationMs ?? 0) / 1_000;
  const displaySeconds = props.session.timerMode === 'countdown' ? Math.max(0, targetSeconds - elapsedSeconds) : elapsedSeconds;
  const formatted = `${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(Math.floor(displaySeconds % 60)).padStart(2, '0')}`;
  void props.tick;

  return (
    <section className="focus-card">
      <p className="eyebrow">{props.session.timerMode === 'countdown' ? 'COUNTDOWN' : 'FLOWTIME'}</p>
      <h2>{props.activityTitle}</h2>
      <output className="timer" aria-live="off">{formatted}</output>
      <p>{props.session.status === 'paused' ? '已暂停，时间不会继续累计。' : '只做眼前这一件事。'}</p>
      <div className="focus-actions">
        {props.session.status === 'running' ? <button className="button secondary" disabled={props.busy} onClick={() => void props.onPause()}>暂停</button> : <button className="button secondary" disabled={props.busy} onClick={() => void props.onResume()}>继续</button>}
        <button className="button primary" disabled={props.busy} onClick={() => void props.onEnd('finish')}>{props.session.timerMode === 'flowtime' ? '完成' : displaySeconds === 0 ? '去结算' : '提前结束'}</button>
        <button disabled={props.busy} onClick={() => void props.onEnd('interrupt')}>中断并结算</button>
        <button className="danger" disabled={props.busy} onClick={() => void props.onEnd('abandon')}>放弃本次</button>
      </div>
    </section>
  );
}
