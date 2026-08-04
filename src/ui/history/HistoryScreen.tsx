/**
 * 模块名称：History 页面
 * 职责描述：按时间展示已结算事实，支持目标筛选、备注编辑与反向撤销
 * 输入/输出：接收应用快照与操作回调，输出本地历史列表
 * 依赖关系：React、应用快照类型
 * 注意事项：撤销不删除历史，voided 状态必须保持可见
 */
import { useState } from 'react';
import type { AppSnapshot } from '../../app/ports';

export function HistoryScreen(props: {
  snapshot: AppSnapshot;
  busy: boolean;
  onUndo: (sessionId: string) => Promise<void>;
  onNote: (sessionId: string, note: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const sessions = props.snapshot.sessions
    .filter((session) => session.settlement && (filter === 'all' || session.goalId === filter))
    .sort((left, right) => (right.settledAt ?? 0) - (left.settledAt ?? 0));

  return (
    <div className="stack">
      <label className="filter">筛选目标<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">全部</option>{props.snapshot.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
      {sessions.length === 0 && <div className="empty">完成并结算一次专注后，记录会出现在这里。</div>}
      {sessions.map((session) => {
        const activity = props.snapshot.activities.find((item) => item.id === session.activityTemplateId);
        const goal = props.snapshot.goals.find((item) => item.id === session.goalId);
        const reward = props.snapshot.rewardEntries.find((entry) => entry.sessionId === session.id && entry.entryType === 'settlement');
        const note = notes[session.id] ?? session.settlement?.userNote ?? '';
        return (
          <article className={`card history-card ${session.status === 'voided' ? 'voided' : ''}`} key={session.id}>
            <div className="history-meta"><time>{new Date(session.settledAt ?? session.endedAt ?? session.startedAt).toLocaleString()}</time><span>{session.status === 'voided' ? '已撤销' : `+${reward?.globalXpDelta ?? 0} XP`}</span></div>
            <h3>{activity?.title ?? '已删除活动'}</h3><p>{goal?.title ?? '已删除目标'} · {session.settlement?.actualMinutes} 分钟 · 完成 {Math.round((session.settlement?.completionRatio ?? 0) * 100)}%</p>
            <label>备注<textarea value={note} onChange={(event) => setNotes((current) => ({ ...current, [session.id]: event.target.value }))} maxLength={2000} /></label>
            <div className="actions"><button disabled={props.busy} onClick={() => void props.onNote(session.id, note)}>保存备注</button>{session.status === 'settled' && <button className="danger" disabled={props.busy} onClick={() => void props.onUndo(session.id)}>撤销结算</button>}</div>
          </article>
        );
      })}
    </div>
  );
}
