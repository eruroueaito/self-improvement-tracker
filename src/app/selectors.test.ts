/**
 * 模块名称：Goal Catalog 与详情选择器测试
 * 职责描述：验证三反馈派生、活动分组、缺失活动提示和最近结算记录
 * 输入/输出：构造只读应用快照并断言稳定视图，不产生持久化写入
 * 依赖关系：Vitest、应用选择器、领域事实类型
 * 注意事项：撤销通过 voided Session 或 reversal 账本反映，选择器不得建立第二事实来源
 */
import { describe, expect, it } from 'vitest';
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import type { RewardLedgerEntry } from '../modules/rewards/types';
import type { Session, Settlement } from '../modules/sessions/types';
import { createDefaultAppSettings } from '../modules/settings/settings';
import type { AppSnapshot } from './ports';
import { selectGoalCatalogItems, selectGoalDetail, selectGoalFeedback } from './selectors';

const goal = (id: string, feedback: Goal['feedback'], overrides: Partial<Goal> = {}): Goal => ({
  id,
  title: id,
  description: '',
  status: 'active',
  importance: 3,
  feedback,
  desiredCadenceDays: null,
  minimumRestHours: 0,
  defaultEnergyCost: 3,
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
});

const activity = (id: string, goalId: string, overrides: Partial<ActivityTemplate> = {}): ActivityTemplate => ({
  id,
  goalId,
  title: `活动 ${id}`,
  description: '',
  minimumMinutes: 10,
  maximumMinutes: 30,
  energyCost: 3,
  contexts: [],
  minimumRestHours: null,
  suggestedCadenceDays: null,
  rewardWeight: 1,
  createdAt: 100,
  archivedAt: null,
  ...overrides,
});

const settlement = (overrides: Partial<Settlement> = {}): Settlement => ({
  actualMinutes: 10,
  completionRatio: 1,
  difficulty: 3,
  effort: 3,
  quantity: null,
  quantityUnit: null,
  userNote: '',
  ...overrides,
});

const session = (id: string, goalId: string, activityTemplateId: string, overrides: Partial<Session> = {}): Session => ({
  id,
  goalId,
  activityTemplateId,
  recommendationRunId: null,
  timerMode: 'flowtime',
  status: 'settled',
  plannedMinutes: null,
  startedAt: 100,
  runningSince: null,
  accumulatedMs: 600_000,
  targetDurationMs: null,
  lastHeartbeatAt: 200,
  endedAt: 200,
  endType: 'completed',
  settlement: settlement(),
  createdAt: 100,
  settledAt: 200,
  ...overrides,
});

const reward = (id: string, goalId: string, delta: number): RewardLedgerEntry => ({
  id,
  sessionId: `session-${id}`,
  goalId,
  entryType: delta >= 0 ? 'settlement' : 'reversal',
  globalXpDelta: delta,
  goalXpDelta: delta,
  ruleVersion: 1,
  idempotencyKey: id,
  reversalOfEntryId: delta >= 0 ? null : 'reward-original',
  createdAt: 200,
});

const snapshot = (overrides: Partial<AppSnapshot> = {}): AppSnapshot => ({
  schemaVersion: 3,
  goals: [],
  activities: [],
  recommendationRuns: [],
  sessions: [],
  rewardEntries: [],
  companionProjection: {
    globalXp: 0,
    level: 1,
    evolutionStage: 'seed',
    mood: 'idle',
    lastUpdatedAt: 100,
  },
  settings: createDefaultAppSettings(),
  aiInteractions: [],
  ...overrides,
});

describe('Goal selectors', () => {
  it('derives every feedback model before settlement, after settlement and after undo', () => {
    const progress = goal('progress', { type: 'progress', baseline: 10, target: 50, unit: '页' });
    const times = goal('times', { type: 'cumulative', unit: 'times' });
    const minutes = goal('minutes', { type: 'cumulative', unit: 'minutes' });
    const experience = goal('experience', { type: 'experience' });
    const base = snapshot({ goals: [progress, times, minutes, experience] });

    expect(selectGoalFeedback(base, progress)).toMatchObject({ type: 'progress', baseline: 10, value: 10, target: 50, unit: '页', ratio: 0 });
    expect(selectGoalFeedback(base, times)).toMatchObject({ type: 'cumulative', baseline: null, value: 0, target: null, unit: 'times', ratio: null });
    expect(selectGoalFeedback(base, minutes)).toMatchObject({ type: 'cumulative', value: 0, unit: 'minutes', ratio: null });
    expect(selectGoalFeedback(base, experience)).toMatchObject({ type: 'experience', value: 0, unit: 'xp', ratio: null });

    const settled = snapshot({
      goals: base.goals,
      sessions: [
        session('progress-session', progress.id, 'progress-activity', {
          settlement: settlement({ quantity: 20, quantityUnit: '页' }),
        }),
        session('progress-interrupted', progress.id, 'progress-activity', {
          endType: 'interrupted',
          settlement: settlement({ quantity: 100, quantityUnit: '页' }),
        }),
        session('times-session', times.id, 'times-activity'),
        session('times-interrupted', times.id, 'times-activity', { endType: 'interrupted' }),
        session('minutes-session', minutes.id, 'minutes-activity', {
          settlement: settlement({ actualMinutes: 12 }),
        }),
        session('minutes-interrupted', minutes.id, 'minutes-activity', {
          endType: 'interrupted',
          settlement: settlement({ actualMinutes: 8 }),
        }),
        session('minutes-abandoned', minutes.id, 'minutes-activity', {
          endType: 'abandoned',
          settlement: settlement({ actualMinutes: 100 }),
        }),
      ],
      rewardEntries: [reward('reward-original', experience.id, 15)],
    });
    expect(selectGoalFeedback(settled, progress)).toMatchObject({ value: 30, ratio: 0.5 });
    expect(selectGoalFeedback(settled, times)).toMatchObject({ value: 1 });
    expect(selectGoalFeedback(settled, minutes)).toMatchObject({ value: 20 });
    expect(selectGoalFeedback(settled, experience)).toMatchObject({ value: 15 });

    const undone = structuredClone(settled);
    undone.sessions.forEach((entry) => { entry.status = 'voided'; });
    undone.rewardEntries.push(reward('reward-reversal', experience.id, -15));
    expect(selectGoalFeedback(undone, progress)).toMatchObject({ value: 10, ratio: 0 });
    expect(selectGoalFeedback(undone, times)).toMatchObject({ value: 0 });
    expect(selectGoalFeedback(undone, minutes)).toMatchObject({ value: 0 });
    expect(selectGoalFeedback(undone, experience)).toMatchObject({ value: 0 });
  });

  it('clamps progress against its baseline and target, including a completed baseline', () => {
    const completed = goal('completed', { type: 'progress', baseline: 50, target: 50, unit: '页' });
    const capped = goal('capped', { type: 'progress', baseline: 20, target: 30, unit: '页' });
    const data = snapshot({
      goals: [completed, capped],
      sessions: [session('large', capped.id, 'a', {
        settlement: settlement({ quantity: 100, quantityUnit: '页' }),
      })],
    });

    expect(selectGoalFeedback(data, completed)).toMatchObject({ value: 50, ratio: 1 });
    expect(selectGoalFeedback(data, capped)).toMatchObject({ value: 30, ratio: 1 });
  });

  it('counts only active Activities and flags only active Goals that need one', () => {
    const activeWithActivity = goal('active-with', { type: 'experience' });
    const activeWithoutActivity = goal('active-without', { type: 'experience' });
    const pausedWithoutActivity = goal('paused-without', { type: 'experience' }, { status: 'paused' });
    const data = snapshot({
      goals: [activeWithActivity, activeWithoutActivity, pausedWithoutActivity],
      activities: [
        activity('available', activeWithActivity.id),
        activity('archived', activeWithActivity.id, { archivedAt: 500 }),
        activity('only-archived', activeWithoutActivity.id, { archivedAt: 500 }),
      ],
    });

    expect(selectGoalCatalogItems(data).map((item) => ({
      id: item.goal.id,
      count: item.activeActivityCount,
      needsActivity: item.needsActivity,
    }))).toEqual([
      { id: 'active-with', count: 1, needsActivity: false },
      { id: 'active-without', count: 0, needsActivity: true },
      { id: 'paused-without', count: 0, needsActivity: false },
    ]);
  });

  it('returns stable Activity groups and at most five recent settled or voided records', () => {
    const selectedGoal = goal('g', { type: 'cumulative', unit: 'minutes' });
    const data = snapshot({
      goals: [selectedGoal],
      activities: [
        activity('active-late', selectedGoal.id, { createdAt: 20 }),
        activity('active-z', selectedGoal.id, { createdAt: 10 }),
        activity('active-a', selectedGoal.id, { createdAt: 10 }),
        activity('archived-b', selectedGoal.id, { createdAt: 40, archivedAt: 80 }),
        activity('archived-a', selectedGoal.id, { createdAt: 40, archivedAt: 70 }),
      ],
      sessions: [
        session('b', selectedGoal.id, 'active-late', { settledAt: 600, status: 'voided' }),
        session('a', selectedGoal.id, 'active-a', { settledAt: 600 }),
        session('c', selectedGoal.id, 'active-z', { settledAt: 500 }),
        session('d', selectedGoal.id, 'active-z', { settledAt: 400 }),
        session('e', selectedGoal.id, 'active-z', { settledAt: 300 }),
        session('f', selectedGoal.id, 'active-z', { settledAt: 200 }),
        session('unsettled', selectedGoal.id, 'active-z', { status: 'ended', settlement: null, settledAt: null }),
      ],
    });
    const serializedBefore = JSON.stringify(data);

    const first = selectGoalDetail(data, selectedGoal.id);
    const second = selectGoalDetail(data, selectedGoal.id);

    expect(first?.activeActivities.map((entry) => entry.id)).toEqual(['active-a', 'active-z', 'active-late']);
    expect(first?.archivedActivities.map((entry) => entry.id)).toEqual(['archived-a', 'archived-b']);
    expect(first?.recentActivities.map((entry) => entry.sessionId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(first?.recentActivities[1]).toMatchObject({ status: 'voided', activityTitle: '活动 active-late', actualMinutes: 10, completionRatio: 1 });
    expect(second).toEqual(first);
    expect(JSON.stringify(data)).toBe(serializedBefore);
    expect(selectGoalDetail(data, 'missing')).toBeNull();
  });

  it('keeps experience display values at or above zero', () => {
    const experience = goal('experience', { type: 'experience' });
    const data = snapshot({ goals: [experience], rewardEntries: [reward('negative', experience.id, -10)] });
    expect(selectGoalFeedback(data, experience)).toMatchObject({ value: 0, primary: '0 XP · Lv.1' });
  });
});
