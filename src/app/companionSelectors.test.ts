/**
 * 模块名称：CompanionView selector 单元测试
 * 职责描述：验证运行时伙伴投影、解锁、心情优先级、时间边界与 Roll 不变性
 * 输入/输出：构造 schema v2 快照与显式时钟，断言无持久写入的伙伴视图
 * 依赖关系：Vitest、伙伴 selector、RollEngine 与领域事实类型
 * 注意事项：持久 CompanionProjection.mood 必须被忽略，future reversal 不能提前生效
 */
import { describe, expect, it } from 'vitest';
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import { runRollEngine } from '../modules/recommendations/rollEngine';
import type { RewardLedgerEntry } from '../modules/rewards/types';
import type { Session } from '../modules/sessions/types';
import { createDefaultAppSettings } from '../modules/settings/settings';
import type { AppSnapshot } from './ports';
import { selectCompanionRefreshDelay, selectCompanionView } from './companionSelectors';

const DAY_MS = 86_400_000;
const goal: Goal = {
  id: 'goal', title: '目标', description: '', status: 'active', importance: 3,
  feedback: { type: 'experience' }, desiredCadenceDays: 1, minimumRestHours: 0,
  defaultEnergyCost: 3, createdAt: 0, updatedAt: 0,
};
const activity: ActivityTemplate = {
  id: 'activity', goalId: goal.id, title: '活动', description: '', minimumMinutes: 10, maximumMinutes: 30,
  energyCost: 3, contexts: [], minimumRestHours: 0, suggestedCadenceDays: null, rewardWeight: 1,
  createdAt: 0, archivedAt: null,
};

const snapshot = (overrides: Partial<AppSnapshot> = {}): AppSnapshot => ({
  schemaVersion: 2,
  goals: [],
  activities: [],
  recommendationRuns: [],
  sessions: [],
  rewardEntries: [],
  companionProjection: { globalXp: 999, level: 99, evolutionStage: 'companion', mood: 'celebrating', lastUpdatedAt: 0 },
  settings: createDefaultAppSettings(),
  ...overrides,
});

const reward = (id: string, delta: number, createdAt: number, overrides: Partial<RewardLedgerEntry> = {}): RewardLedgerEntry => ({
  id,
  sessionId: `session-${id}`,
  goalId: 'goal',
  entryType: delta < 0 ? 'reversal' : 'settlement',
  globalXpDelta: delta,
  goalXpDelta: delta,
  ruleVersion: 1,
  idempotencyKey: id,
  reversalOfEntryId: delta < 0 ? 'settlement' : null,
  createdAt,
  ...overrides,
});

const activeSession = (status: 'running' | 'paused'): Session => ({
  id: status, goalId: 'goal', activityTemplateId: 'activity', recommendationRunId: null,
  timerMode: 'flowtime', status, plannedMinutes: null, startedAt: 0,
  runningSince: status === 'running' ? 0 : null, accumulatedMs: 0, targetDurationMs: null,
  lastHeartbeatAt: 0, endedAt: null, endType: null, settlement: null, createdAt: 0, settledAt: null,
});

describe('selectCompanionView', () => {
  it('ignores the persisted projection and returns an empty daytime or nighttime view', () => {
    expect(selectCompanionView(snapshot(), { now: 10 * DAY_MS, localHour: 12 })).toMatchObject({
      projection: { currentXp: 0, highestXp: 0, level: 1, evolutionStage: 'seed' },
      activityState: { version: 1, score: 0 },
      unlocks: [],
      mood: 'idle',
      celebratingUntil: null,
    });
    expect(selectCompanionView(snapshot(), { now: 10 * DAY_MS, localHour: 23 }).mood).toBe('sleeping');
  });

  it('keeps peak-based stages and unlocks after a reversal', () => {
    const view = selectCompanionView(snapshot({
      rewardEntries: [
        reward('settlement', 310, 1),
        reward('reversal', -310, 2, { reversalOfEntryId: 'settlement' }),
      ],
    }), { now: 10_000, localHour: 12 });

    expect(view.projection).toEqual({ currentXp: 0, highestXp: 310, level: 7, evolutionStage: 'companion' });
    expect(view.unlocks).toEqual(['desk-book', 'window-plant', 'photo-string']);
  });

  it.each([
    [49, []],
    [50, ['desk-book']],
    [149, ['desk-book']],
    [150, ['desk-book', 'window-plant']],
    [299, ['desk-book', 'window-plant']],
    [300, ['desk-book', 'window-plant', 'photo-string']],
  ] as const)('uses exact unlock threshold %i', (xp, unlocks) => {
    const view = selectCompanionView(snapshot({ rewardEntries: [reward(`xp-${xp}`, xp, 0)] }), { now: 10_000, localHour: 12 });
    expect(view.unlocks).toEqual(unlocks);
  });

  it('applies working before celebration and supports a zero-XP settlement', () => {
    const data = snapshot({ rewardEntries: [reward('zero', 0, 1_000)] });
    expect(selectCompanionView(data, { now: 2_999, localHour: 23 })).toMatchObject({ mood: 'celebrating', celebratingUntil: 3_000 });
    data.sessions = [activeSession('paused')];
    expect(selectCompanionView(data, { now: 2_000, localHour: 23 })).toMatchObject({ mood: 'working', celebratingUntil: null });
    data.sessions = [activeSession('running')];
    expect(selectCompanionView(data, { now: 2_000, localHour: 23 }).mood).toBe('working');
  });

  it('does not let a future reversal cancel celebration before it becomes effective', () => {
    const data = snapshot({
      rewardEntries: [
        reward('settlement', 5, 1_000),
        reward('future-reversal', -5, 2_500, { reversalOfEntryId: 'settlement' }),
      ],
    });
    expect(selectCompanionView(data, { now: 2_000, localHour: 12 }).mood).toBe('celebrating');
    expect(selectCompanionView(data, { now: 2_500, localHour: 12 }).mood).toBe('idle');
  });

  it('excludes future and exits at the exact 2-second boundary', () => {
    const data = snapshot({ rewardEntries: [reward('settlement', 5, 1_000)] });
    expect(selectCompanionView(data, { now: 999, localHour: 12 }).mood).toBe('idle');
    expect(selectCompanionView(data, { now: 2_999, localHour: 12 }).mood).toBe('celebrating');
    expect(selectCompanionView(data, { now: 3_000, localHour: 12 }).mood).toBe('idle');
    expect(selectCompanionView(data, { now: 3_001, localHour: 12 }).mood).toBe('idle');
  });

  it.each([[6, 'sleeping'], [7, 'idle'], [21, 'idle'], [22, 'sleeping']] as const)(
    'uses exact local-hour boundary %i',
    (localHour, mood) => expect(selectCompanionView(snapshot(), { now: 0, localHour }).mood).toBe(mood),
  );

  it('does not schedule a zero-delay refresh at a frozen exact deadline', () => {
    expect(selectCompanionRefreshDelay(3_000, 2_999)).toBe(1);
    expect(selectCompanionRefreshDelay(3_000, 3_000)).toBeNull();
    expect(selectCompanionRefreshDelay(3_000, 3_000)).toBeNull();
  });

  it('rejects invalid explicit time inputs', () => {
    expect(() => selectCompanionView(snapshot(), { now: Number.NaN, localHour: 12 })).toThrow(/now/);
    expect(() => selectCompanionView(snapshot(), { now: 0, localHour: 24 })).toThrow(/localHour/);
    expect(() => selectCompanionView(snapshot(), { now: 0, localHour: 1.5 })).toThrow(/localHour/);
  });

  it('does not mutate facts or change byte-equivalent Roll results', () => {
    const data = snapshot({ goals: [goal], activities: [activity] });
    const beforeFacts = structuredClone(data);
    const input = {
      runId: 'same-run', now: 10 * DAY_MS, context: { availableMinutes: 25, energy: 3 as const, contexts: [] },
      goals: data.goals, activities: data.activities, sessions: data.sessions, previousRuns: data.recommendationRuns,
    };
    const before = JSON.stringify(runRollEngine(input));
    selectCompanionView(data, { now: input.now, localHour: 12 });
    const after = JSON.stringify(runRollEngine(input));
    expect(after).toBe(before);
    expect(data).toEqual(beforeFacts);
  });
});
