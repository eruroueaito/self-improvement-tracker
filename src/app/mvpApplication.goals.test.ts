/**
 * 模块名称：Goal 与 Activity 应用命令测试
 * 职责描述：验证 Goal/Activity 独立命令的原子性、归属校验与幂等行为
 * 输入/输出：通过可控端口执行应用命令并断言内存及持久快照
 * 依赖关系：Vitest、MvpApplication、MemoryStore、应用端口
 * 注意事项：失败写入必须同时保持应用内存和持久存储的最后成功状态
 */
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../adapters/memory/memoryStore';
import { SessionSecretStore } from '../adapters/secrets/sessionSecretStore';
import type { ActivityInput, GoalInput } from '../modules/goals/types';
import type { Clock, CurrentAppSnapshot, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class FakeClock implements Clock {
  value = 1_000_000;
  now(): number { return this.value; }
}

class FakeIds implements IdGenerator {
  private value = 0;
  next(): string { this.value += 1; return `id-${this.value}`; }
}

class ControlledStore extends MemoryStore {
  replaceCalls = 0;
  failNextReplace = false;

  override async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    this.replaceCalls += 1;
    if (this.failNextReplace) {
      this.failNextReplace = false;
      throw new Error('replace failed');
    }
    await super.replace(snapshot);
  }
}

const notifications: NotificationPort = {
  async scheduleCountdown() {},
  async cancelCountdown() {},
};
const exportFiles: ExportFilePort = { async save() {} };
const goalInput = (title: string): GoalInput => ({
  title,
  importance: 3,
  feedback: { type: 'experience' },
  defaultEnergyCost: 2,
});
const activityInput = (title: string): ActivityInput => ({
  title,
  minimumMinutes: 10,
  maximumMinutes: 30,
  energyCost: 2,
});

const setup = async () => {
  const clock = new FakeClock();
  const store = new ControlledStore();
  const app = new MvpApplication(store, clock, new FakeIds(), notifications, exportFiles, new SessionSecretStore());
  await app.initialize();
  store.replaceCalls = 0;
  return { app, clock, store };
};

describe('MvpApplication Goal and Activity commands', () => {
  it('updates one Goal without changing any Activity', async () => {
    const { app, clock } = await setup();
    const created = await app.createGoal(goalInput('阅读'), activityInput('读十页'));
    await app.createActivity(created.goal.id, activityInput('整理笔记'));
    const activitiesBefore = app.getSnapshot().activities;

    clock.value += 1_000;
    await app.updateGoal(created.goal.id, {
      ...goalInput('阅读计划'),
      description: '每天推进',
      importance: 5,
    });

    const snapshot = app.getSnapshot();
    expect(snapshot.goals[0]).toMatchObject({ title: '阅读计划', description: '每天推进', importance: 5, updatedAt: clock.value });
    expect(snapshot.activities).toEqual(activitiesBefore);
  });

  it('creates an Activity with defaults and does not write for a missing Goal', async () => {
    const { app, clock, store } = await setup();
    const created = await app.createGoal(goalInput('运动'), activityInput('热身'));
    store.replaceCalls = 0;
    clock.value += 2_000;

    const activity = await app.createActivity(created.goal.id, activityInput('慢跑'));
    expect(activity).toMatchObject({
      id: 'id-3',
      goalId: created.goal.id,
      title: '慢跑',
      description: '',
      contexts: [],
      minimumRestHours: null,
      suggestedCadenceDays: null,
      rewardWeight: 1,
      createdAt: clock.value,
      archivedAt: null,
    });
    expect(store.replaceCalls).toBe(1);

    const before = app.getSnapshot();
    await expect(app.createActivity('missing-goal', activityInput('无效活动'))).rejects.toThrow(/目标不存在/);
    expect(store.replaceCalls).toBe(1);
    expect(app.getSnapshot()).toEqual(before);
  });

  it('rejects cross-Goal updates and preserves immutable Activity fields', async () => {
    const { app, clock, store } = await setup();
    const first = await app.createGoal(goalInput('目标一'), activityInput('活动一'));
    const second = await app.createGoal(goalInput('目标二'), activityInput('活动二'));
    store.replaceCalls = 0;
    const before = app.getSnapshot();

    await expect(app.updateActivity(second.goal.id, first.activity.id, activityInput('越权修改'))).rejects.toThrow(/活动不存在或不属于该目标/);
    expect(store.replaceCalls).toBe(0);
    expect(app.getSnapshot()).toEqual(before);

    clock.value += 3_000;
    await app.updateActivity(first.goal.id, first.activity.id, {
      ...activityInput('活动一（更新）'),
      contexts: ['home'],
      rewardWeight: 1.5,
    });
    const updated = app.getSnapshot().activities.find((activity) => activity.id === first.activity.id);
    expect(updated).toMatchObject({
      title: '活动一（更新）',
      contexts: ['home'],
      rewardWeight: 1.5,
      createdAt: first.activity.createdAt,
      archivedAt: null,
    });
  });

  it('archives and restores an Activity idempotently', async () => {
    const { app, clock, store } = await setup();
    const created = await app.createGoal(goalInput('写作'), activityInput('写草稿'));
    store.replaceCalls = 0;
    clock.value += 4_000;

    await app.archiveActivity(created.goal.id, created.activity.id);
    expect(app.getSnapshot().activities[0]?.archivedAt).toBe(clock.value);
    expect(store.replaceCalls).toBe(1);
    await app.archiveActivity(created.goal.id, created.activity.id);
    expect(store.replaceCalls).toBe(1);

    await app.restoreActivity(created.goal.id, created.activity.id);
    expect(app.getSnapshot().activities[0]?.archivedAt).toBeNull();
    expect(store.replaceCalls).toBe(2);
    await app.restoreActivity(created.goal.id, created.activity.id);
    expect(store.replaceCalls).toBe(2);
  });

  it('keeps runtime and persisted snapshots unchanged when replace fails', async () => {
    const { app, store } = await setup();
    const created = await app.createGoal(goalInput('稳定目标'), activityInput('稳定活动'));
    const runtimeBefore = app.getSnapshot();
    const persistedBefore = await store.load();
    store.failNextReplace = true;

    await expect(app.updateGoal(created.goal.id, goalInput('不应提交'))).rejects.toThrow('replace failed');
    expect(app.getSnapshot()).toEqual(runtimeBefore);
    expect(await store.load()).toEqual(persistedBefore);
  });

  it('installs, clears and reinstalls development seed without consuming generated IDs', async () => {
    const { app, store } = await setup();

    const installed = await app.installDevelopmentSeed();
    expect(installed).toEqual({ goals: 3, activities: 6 });
    expect(app.getSnapshot().goals.filter((goal) => goal.id.startsWith('dev-seed:'))).toHaveLength(3);
    expect(store.replaceCalls).toBe(1);

    const beforeConflict = app.getSnapshot();
    await expect(app.installDevelopmentSeed()).rejects.toThrow(/开发种子保留 ID 已存在/);
    expect(store.replaceCalls).toBe(1);
    expect(app.getSnapshot()).toEqual(beforeConflict);

    const user = await app.createGoal(goalInput('用户目标'), activityInput('用户活动'));
    expect(user.goal.id).toBe('id-1');
    store.replaceCalls = 0;
    const removed = await app.clearDevelopmentSeed();
    expect(removed).toMatchObject({ goals: 3, activities: 6 });
    expect(app.getSnapshot().goals).toEqual([user.goal]);
    expect(app.getSnapshot().activities).toEqual([user.activity]);
    expect(store.replaceCalls).toBe(1);

    await app.clearDevelopmentSeed();
    expect(store.replaceCalls).toBe(1);
    await app.installDevelopmentSeed();
    expect(store.replaceCalls).toBe(2);
  });
});
