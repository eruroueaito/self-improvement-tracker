/**
 * 模块名称：MVP React 应用壳
 * 职责描述：装配五个页面、处理导航和把 UI 命令转发给 MvpApplication
 * 输入/输出：接收用户操作，输出当前本地快照对应的页面
 * 依赖关系：React、应用门面、Goals/Roll/Focus/Settlement/History 页面
 * 注意事项：UI 不直接访问数据库；跨模块状态只通过应用门面改变
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createMvpApplication } from '../../app/composition';
import type { AppSnapshot } from '../../app/ports';
import { FocusScreen } from '../focus/FocusScreen';
import { GoalsScreen } from '../goals/GoalsScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { RollScreen } from '../roll/RollScreen';
import { SettlementScreen } from '../settlement/SettlementScreen';
import { companionEmoji } from '../shared/presentation';

type Tab = 'goals' | 'roll' | 'history';
type Screen = Tab | 'focus' | 'settlement';

const EMPTY_REASON: Record<string, string> = {
  'no-active-goals': '先创建并启用一个目标与活动。',
  'time-too-short': '当前时间少于所有活动的最短时长。',
  'context-mismatch': '当前场景不满足活动要求。',
  resting: '匹配的活动仍在恢复期，稍后再试。',
};

export function App() {
  const application = useMemo(() => createMvpApplication(), []);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>('roll');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const recoveryInFlight = useRef(false);

  const refresh = (): void => setSnapshot(application.getSnapshot());

  useEffect(() => {
    void application.initialize().then((initial) => {
      setSnapshot(initial);
      const active = initial.sessions.find((session) => session.status === 'running' || session.status === 'paused');
      const ended = initial.sessions.find((session) => session.status === 'ended');
      if (active) {
        setActiveSessionId(active.id);
        setScreen('focus');
      } else if (ended) {
        setActiveSessionId(ended.id);
        setScreen('settlement');
      }
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '应用初始化失败'));
  }, [application]);

  useEffect(() => {
    if (screen !== 'focus') return;
    const id = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => window.clearInterval(id);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'focus' || !snapshot || !activeSessionId || recoveryInFlight.current) return;
    const active = snapshot.sessions.find((candidate) => candidate.id === activeSessionId);
    if (!active || active.status !== 'running' || active.timerMode !== 'countdown' || active.targetDurationMs === null) return;
    if (application.getElapsedMinutes(active.id) * 60_000 < active.targetDurationMs) return;
    recoveryInFlight.current = true;
    void application.recoverActiveSession().then((result) => {
      setSnapshot(application.getSnapshot());
      if (result.session?.status === 'ended') setScreen('settlement');
      if (result.needsTimeConfirmation) setNotice('检测到系统时间异常，请确认结束时间后再结算。');
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '倒计时恢复失败'))
      .finally(() => { recoveryInFlight.current = false; });
  }, [activeSessionId, application, screen, snapshot, tick]);

  const execute = async (operation: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) return <main className="loading" aria-live="polite">正在打开本地数据…</main>;

  const currentRun = currentRunId
    ? snapshot.recommendationRuns.find((run) => run.id === currentRunId) ?? null
    : null;
  const session = activeSessionId
    ? snapshot.sessions.find((candidate) => candidate.id === activeSessionId) ?? null
    : null;
  const navigate = (tab: Tab): void => {
    setScreen(tab);
    setError(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SELF IMPROVEMENT TRACKER</p>
          <h1>{screen === 'focus' ? '专注' : screen === 'settlement' ? '结算' : screen === 'goals' ? '目标' : screen === 'history' ? '历史' : '现在做什么？'}</h1>
        </div>
        <div className="companion" aria-label={`伙伴等级 ${snapshot.companionProjection.level}，${snapshot.companionProjection.globalXp} XP`}>
          <span aria-hidden="true">{companionEmoji(snapshot.companionProjection.evolutionStage)}</span>
          <b>Lv.{snapshot.companionProjection.level}</b>
          <small>{snapshot.companionProjection.globalXp} XP</small>
        </div>
      </header>

      {error && <div className="message error" role="alert">{error}</div>}
      {notice && <div className="message notice" role="status">{notice}</div>}

      <main className="content">
        {screen === 'goals' && (
          <GoalsScreen
            snapshot={snapshot}
            busy={busy}
            onCreate={(goal, activity) => execute(async () => {
              await application.createGoal(goal, activity);
              setNotice('目标和第一个活动已保存在本机。');
            })}
            onUpdate={(goalId, goal, activityId, activity) => execute(async () => {
              await application.updateGoal(goalId, goal, activityId, activity);
              setNotice('目标和活动已更新。');
            })}
            onStatus={(id, status) => execute(() => application.setGoalStatus(id, status))}
            onExport={() => execute(() => application.exportToFile())}
            onImport={(contents) => execute(async () => {
              await application.importData(contents);
              setNotice('导入完成，宠物进度已从奖励账本重建。');
            })}
            onClear={() => execute(async () => {
              if (!window.confirm('确定清空全部本地目标、专注、历史和奖励吗？此操作不能撤销。')) return;
              await application.clearAllData();
              setCurrentRunId(null);
              setNotice('全部本地数据已清空。');
            })}
          />
        )}

        {screen === 'roll' && (
          <RollScreen
            snapshot={snapshot}
            currentRun={currentRun}
            busy={busy}
            onRoll={(availableMinutes, energy, contexts) => execute(async () => {
              const result = await application.roll({ availableMinutes, energy, contexts });
              setCurrentRunId(result.run.id);
              setNotice(result.emptyReason ? (EMPTY_REASON[result.emptyReason] ?? '当前没有合适候选。') : null);
            })}
            onDismiss={(runId, activityId) => execute(async () => {
              await application.dismissRecommendation(runId, activityId);
              setNotice('已记录“暂不想做”，24 小时内会降低它的排序。');
            })}
            onStart={(runId, activityId, mode, minutes) => execute(async () => {
              const started = await application.startSession({ runId, activityId, timerMode: mode, plannedMinutes: minutes });
              setActiveSessionId(started.id);
              setScreen('focus');
              setNotice(null);
            })}
          />
        )}

        {screen === 'focus' && session && (
          <FocusScreen
            session={session}
            tick={tick}
            elapsedMinutes={application.getElapsedMinutes(session.id)}
            activityTitle={snapshot.activities.find((activity) => activity.id === session.activityTemplateId)?.title ?? '专注活动'}
            busy={busy}
            onPause={() => execute(async () => { await application.pause(session.id); })}
            onResume={() => execute(async () => { await application.resume(session.id); })}
            onEnd={(action) => execute(async () => {
              await application.end(session.id, action);
              refresh();
              setScreen('settlement');
            })}
          />
        )}

        {screen === 'settlement' && session && (
          <SettlementScreen
            session={session}
            goal={snapshot.goals.find((goal) => goal.id === session.goalId)}
            busy={busy}
            onSettle={(draft) => execute(async () => {
              const reward = await application.settle(session.id, draft);
              setNotice(`结算完成：+${reward.globalXpDelta} XP`);
              setActiveSessionId(null);
              setScreen('history');
            })}
          />
        )}

        {screen === 'history' && (
          <HistoryScreen
            snapshot={snapshot}
            busy={busy}
            onUndo={(sessionId) => execute(async () => {
              await application.undoSettlement(sessionId);
              setNotice('已撤销结算并写入反向奖励账目，历史记录仍保留。');
            })}
            onNote={(sessionId, note) => execute(() => application.updateSessionNote(sessionId, note))}
          />
        )}
      </main>

      {(screen === 'goals' || screen === 'roll' || screen === 'history') && (
        <nav className="bottom-nav" aria-label="主导航">
          <button className={screen === 'goals' ? 'active' : ''} onClick={() => navigate('goals')}>目标</button>
          <button className={screen === 'roll' ? 'active primary-tab' : 'primary-tab'} onClick={() => navigate('roll')}>Roll</button>
          <button className={screen === 'history' ? 'active' : ''} onClick={() => navigate('history')}>历史</button>
        </nav>
      )}
    </div>
  );
}
