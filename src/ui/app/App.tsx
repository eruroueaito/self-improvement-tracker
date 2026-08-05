/**
 * 模块名称：MVP React 应用壳
 * 职责描述：装配五个页面、处理导航和把 UI 命令转发给 MvpApplication
 * 输入/输出：接收用户操作，输出当前本地快照对应的页面
 * 依赖关系：React、应用门面、Goals/Roll/Focus/Settlement/History 页面
 * 注意事项：UI 不直接访问数据库；跨模块状态只通过应用门面改变
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { selectCompanionRefreshDelay, selectCompanionView } from '../../app/companionSelectors';
import { createMvpApplication } from '../../app/composition';
import { hasDevelopmentSeedFacts } from '../../app/developmentSeed';
import type { AppSnapshot } from '../../app/ports';
import type { EmptyRollReason } from '../../modules/recommendations/types';
import { CompanionAvatar } from '../companion/CompanionAvatar';
import { FocusScreen } from '../focus/FocusScreen';
import { GoalDetailScreen } from '../goals/GoalDetailScreen';
import { GoalsScreen } from '../goals/GoalsScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { RollScreen } from '../roll/RollScreen';
import { SettlementScreen } from '../settlement/SettlementScreen';
import { RecoveryScreen } from './RecoveryScreen';

type Tab = 'goals' | 'roll' | 'history';
type Screen = Tab | 'goal-detail' | 'focus' | 'settlement';

const EMPTY_REASON: Record<EmptyRollReason, string> = {
  'no-active-goals': '先创建并启用一个目标与活动。',
  'no-active-activities': '当前目标没有可用活动，请先添加或恢复一个活动。',
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
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [initialHistoryGoalId, setInitialHistoryGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [tick, setTick] = useState(0);
  const [, setCompanionTick] = useState(0);
  const recoveryInFlight = useRef(false);
  const commandInFlight = useRef(false);

  const refresh = (): void => setSnapshot(application.getSnapshot());

  const openApplication = useCallback(async (): Promise<void> => {
    setInitializing(true);
    setError(null);
    try {
      const initial = await application.initialize();
      setSnapshot(initial);
      const active = initial.sessions.find((session) => session.status === 'running' || session.status === 'paused');
      const ended = initial.sessions.find((session) => session.status === 'ended');
      setActiveSessionId(active?.id ?? ended?.id ?? null);
      setCurrentRunId(null);
      setSelectedGoalId(null);
      setInitialHistoryGoalId(null);
      setScreen(active ? 'focus' : ended ? 'settlement' : 'roll');
    } catch (cause) {
      setSnapshot(null);
      setError(cause instanceof Error ? cause.message : '应用初始化失败');
    } finally {
      setInitializing(false);
    }
  }, [application]);

  useEffect(() => { void openApplication(); }, [openApplication]);

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

  useEffect(() => {
    if (!snapshot || !selectedGoalId || snapshot.goals.some((goal) => goal.id === selectedGoalId)) return;
    setSelectedGoalId(null);
    if (screen === 'goal-detail') setScreen('goals');
  }, [screen, selectedGoalId, snapshot]);

  const companionNow = Date.now();
  const companionView = snapshot
    ? selectCompanionView(snapshot, { now: companionNow, localHour: new Date(companionNow).getHours() })
    : null;
  const companionRefreshDelay = selectCompanionRefreshDelay(companionView?.celebratingUntil ?? null, companionNow);

  useEffect(() => {
    if (companionRefreshDelay === null) return;
    const timeoutId = window.setTimeout(() => setCompanionTick((value) => value + 1), companionRefreshDelay);
    return () => window.clearTimeout(timeoutId);
  }, [companionRefreshDelay, companionView?.celebratingUntil]);

  const execute = async (operation: () => Promise<void>): Promise<boolean> => {
    if (commandInFlight.current) return false;
    commandInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await operation();
      refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败');
      return false;
    } finally {
      commandInFlight.current = false;
      setBusy(false);
    }
  };
  const executeCommand = async (operation: () => Promise<void>): Promise<void> => {
    await execute(operation);
  };

  if (!snapshot) {
    if (initializing) return <main className="loading" aria-live="polite">正在打开本地数据…</main>;
    return (
      <RecoveryScreen
        error={error ?? '应用初始化失败'}
        recovery={application.getRecoveryExportStatus()}
        busy={busy}
        onRetry={openApplication}
        onExportRecovery={async () => {
          setBusy(true);
          try {
            await application.exportRecoveryToFile();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '恢复数据导出失败');
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  const currentRun = currentRunId
    ? snapshot.recommendationRuns.find((run) => run.id === currentRunId) ?? null
    : null;
  const session = activeSessionId
    ? snapshot.sessions.find((candidate) => candidate.id === activeSessionId) ?? null
    : null;
  const navigate = (tab: Tab): void => {
    setSelectedGoalId(null);
    if (tab === 'history') setInitialHistoryGoalId(null);
    setScreen(tab);
    setError(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SELF IMPROVEMENT TRACKER</p>
          <h1>{screen === 'focus' ? '专注' : screen === 'settlement' ? '结算' : screen === 'goal-detail' ? '目标详情' : screen === 'goals' ? '目标' : screen === 'history' ? '历史' : '现在做什么？'}</h1>
        </div>
        <div className="companion-summary">
          <CompanionAvatar
            stage={companionView!.projection.evolutionStage}
            mood={companionView!.mood}
            size="compact"
            motion={snapshot.settings.motion}
          />
          <span className="companion-level"><b>Lv.{companionView!.projection.level}</b><small>{companionView!.projection.currentXp} XP</small></span>
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
            onOpenGoal={(goalId) => {
              setSelectedGoalId(goalId);
              setScreen('goal-detail');
              setError(null);
            }}
            onExport={() => executeCommand(() => application.exportToFile())}
            onPreviewImport={(contents) => application.previewImport(contents)}
            onConfirmImport={(contents) => execute(async () => {
              await application.confirmImport(contents);
              const imported = application.getSnapshot();
              const active = imported.sessions.find((session) => session.status === 'running' || session.status === 'paused');
              const ended = imported.sessions.find((session) => session.status === 'ended');
              setCurrentRunId(null);
              setActiveSessionId(active?.id ?? ended?.id ?? null);
              setSelectedGoalId(null);
              setInitialHistoryGoalId(null);
              setScreen(active ? 'focus' : ended ? 'settlement' : 'goals');
              setNotice('导入完成，宠物进度已从奖励账本重建。');
            })}
            onSettingsChange={(settings) => executeCommand(async () => {
              await application.updateSettings(settings);
              setNotice('设置已保存在本机。');
            })}
            onClear={() => executeCommand(async () => {
              if (!window.confirm('确定清空全部本地目标、专注、历史和奖励吗？此操作不能撤销。')) return;
              await application.clearAllData();
              setCurrentRunId(null);
              setSelectedGoalId(null);
              setInitialHistoryGoalId(null);
              setScreen('goals');
              setNotice('全部本地数据已清空。');
            })}
            developmentSeed={import.meta.env.DEV ? {
              installed: hasDevelopmentSeedFacts(snapshot),
              onInstall: () => executeCommand(async () => {
                const installed = await application.installDevelopmentSeed();
                setNotice(`已安装 ${installed.goals} 个 Goal 和 ${installed.activities} 个 Activity 的开发种子。`);
              }),
              onClear: () => executeCommand(async () => {
                const removed = await application.clearDevelopmentSeed();
                setSelectedGoalId(null);
                setNotice(`已清除 ${removed.goals} 个 Goal、${removed.activities} 个 Activity 和 ${removed.sessions} 条 demo 专注。`);
              }),
            } : undefined}
          />
        )}

        {screen === 'goal-detail' && selectedGoalId && (
          <GoalDetailScreen
            snapshot={snapshot}
            goalId={selectedGoalId}
            busy={busy}
            onBack={() => {
              setSelectedGoalId(null);
              setScreen('goals');
            }}
            onUpdateGoal={(goalId, draft) => execute(async () => {
              await application.updateGoal(goalId, draft);
              setNotice('目标已更新。');
            })}
            onStatus={(goalId, status) => executeCommand(async () => {
              await application.setGoalStatus(goalId, status);
              setNotice('目标状态已更新。');
            })}
            onCreateActivity={(goalId, draft) => execute(async () => {
              await application.createActivity(goalId, draft);
              setNotice('活动已添加。');
            })}
            onUpdateActivity={(goalId, activityId, draft) => execute(async () => {
              await application.updateActivity(goalId, activityId, draft);
              setNotice('活动已更新。');
            })}
            onArchiveActivity={(goalId, activityId) => executeCommand(async () => {
              await application.archiveActivity(goalId, activityId);
              setNotice('活动已归档，可随时恢复。');
            })}
            onRestoreActivity={(goalId, activityId) => executeCommand(async () => {
              await application.restoreActivity(goalId, activityId);
              setNotice('活动已恢复并可参与 Roll。');
            })}
            onOpenHistory={(goalId) => {
              setInitialHistoryGoalId(goalId);
              setScreen('history');
            }}
          />
        )}

        {screen === 'roll' && (
          <RollScreen
            snapshot={snapshot}
            companionView={companionView!}
            currentRun={currentRun}
            busy={busy}
            onRoll={(availableMinutes, energy, contexts) => executeCommand(async () => {
              const result = await application.roll({ availableMinutes, energy, contexts });
              setCurrentRunId(result.run.id);
              setNotice(result.emptyReason ? EMPTY_REASON[result.emptyReason] : null);
            })}
            onDismiss={(runId, activityId) => executeCommand(async () => {
              await application.dismissRecommendation(runId, activityId);
              setNotice('已记录“暂不想做”，24 小时内会降低它的排序。');
            })}
            onStart={(runId, activityId, mode, minutes) => executeCommand(async () => {
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
            onPause={() => executeCommand(async () => { await application.pause(session.id); })}
            onResume={() => executeCommand(async () => { await application.resume(session.id); })}
            onEnd={(action) => executeCommand(async () => {
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
            onSettle={(draft) => executeCommand(async () => {
              const reward = await application.settle(session.id, draft);
              setNotice(`结算完成：+${reward.globalXpDelta} XP`);
              setActiveSessionId(null);
              setScreen('history');
            })}
          />
        )}

        {screen === 'history' && (
          <HistoryScreen
            key={initialHistoryGoalId ?? 'all'}
            snapshot={snapshot}
            busy={busy}
            initialGoalId={initialHistoryGoalId}
            onUndo={(sessionId) => executeCommand(async () => {
              await application.undoSettlement(sessionId);
              setNotice('已撤销结算并写入反向奖励账目，历史记录仍保留。');
            })}
            onNote={(sessionId, note) => executeCommand(() => application.updateSessionNote(sessionId, note))}
          />
        )}
      </main>

      {(screen === 'goals' || screen === 'goal-detail' || screen === 'roll' || screen === 'history') && (
        <nav className="bottom-nav" aria-label="主导航">
          <button className={screen === 'goals' || screen === 'goal-detail' ? 'active' : ''} onClick={() => navigate('goals')}>目标</button>
          <button className={screen === 'roll' ? 'active primary-tab' : 'primary-tab'} onClick={() => navigate('roll')}>Roll</button>
          <button className={screen === 'history' ? 'active' : ''} onClick={() => navigate('history')}>历史</button>
        </nav>
      )}
    </div>
  );
}
