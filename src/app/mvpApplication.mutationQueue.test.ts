/**
 * 模块名称：MVP 应用 mutation queue 集成测试
 * 职责描述：验证并发快照命令基于最新成功状态构造，且 replace 失败不丢失后续命令
 * 输入/输出：控制 MemoryStore.replace 完成顺序并断言最终运行时与持久快照
 * 依赖关系：Vitest、MvpApplication、MemoryStore
 * 注意事项：测试必须让首个 replace 真正悬挂，避免把顺序执行误判为并发安全
 */
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../adapters/memory/memoryStore';
import { SessionSecretStore } from '../adapters/secrets/sessionSecretStore';
import type { ActivityInput, GoalInput } from '../modules/goals/types';
import type { Clock, CurrentAppSnapshot, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class ControlledStore extends MemoryStore {
  holdNext = false;
  failNext = false;
  entered: Promise<void> = Promise.resolve();
  private signalEntered: (() => void) | null = null;
  private release: (() => void) | null = null;

  holdOne(): void {
    this.holdNext = true;
    this.entered = new Promise((resolve) => { this.signalEntered = resolve; });
  }

  releaseHeld(): void { this.release?.(); }

  override async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('replace failed');
    }
    if (this.holdNext) {
      this.holdNext = false;
      const gate = new Promise<void>((resolve) => { this.release = resolve; });
      this.signalEntered?.();
      await gate;
    }
    await super.replace(snapshot);
  }
}

class FakeIds implements IdGenerator {
  private value = 0;
  next(): string { return `id-${++this.value}`; }
}

const clock: Clock = { now: () => 1_000 };
const notifications: NotificationPort = { async scheduleCountdown() {}, async cancelCountdown() {} };
const files: ExportFilePort = { async save() {} };
const goal = (title: string): GoalInput => ({
  title, importance: 3, feedback: { type: 'experience' }, defaultEnergyCost: 2,
});
const activity = (title: string): ActivityInput => ({
  title, minimumMinutes: 10, maximumMinutes: 20, energyCost: 2,
});

const setup = async () => {
  const store = new ControlledStore();
  const app = new MvpApplication(store, clock, new FakeIds(), notifications, files, new SessionSecretStore());
  await app.initialize();
  return { app, store };
};

describe('MvpApplication mutation queue', () => {
  it('serializes concurrent creates so both use the latest committed snapshot', async () => {
    const { app, store } = await setup();
    store.holdOne();
    const first = app.createGoal(goal('first'), activity('first activity'));
    await store.entered;
    const second = app.createGoal(goal('second'), activity('second activity'));
    store.releaseHeld();
    await Promise.all([first, second]);

    expect(app.getSnapshot().goals.map((item) => item.title)).toEqual(['first', 'second']);
    expect((await store.load())?.goals.map((item) => item.title)).toEqual(['first', 'second']);
  });

  it('keeps a failed caller rejected while the next queued mutation succeeds', async () => {
    const { app, store } = await setup();
    store.failNext = true;
    const failed = app.createGoal(goal('failed'), activity('failed activity'));
    const recovered = app.createGoal(goal('recovered'), activity('recovered activity'));

    await expect(failed).rejects.toThrow('replace failed');
    await expect(recovered).resolves.toMatchObject({ goal: { title: 'recovered' } });
    expect(app.getSnapshot().goals.map((item) => item.title)).toEqual(['recovered']);
    expect((await store.load())?.goals.map((item) => item.title)).toEqual(['recovered']);
  });
});
