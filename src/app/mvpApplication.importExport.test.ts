/**
 * 模块名称：应用导入确认测试
 * 职责描述：验证导入预览无写入、确认单次替换和失败时运行态/持久态一致性
 * 输入/输出：用可计数 DataStore 执行 v1/v2 导入并断言快照与写入次数
 * 依赖关系：Vitest、MvpApplication、版本化快照与 v1 fixture
 * 注意事项：测试不通过内部字段替换应用状态，只调用公开预览和确认入口
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createTypicalPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import type { CurrentAppSnapshot, PersistedSnapshot } from './snapshots';
import type { Clock, DataStore, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class CountingStore implements DataStore {
  persisted: PersistedSnapshot | null = null;
  replaceCalls = 0;
  failNextReplace = false;

  async initialize(): Promise<void> {}
  async load(): Promise<PersistedSnapshot | null> {
    return this.persisted ? structuredClone(this.persisted) : null;
  }
  async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    this.replaceCalls += 1;
    if (this.failNextReplace) {
      this.failNextReplace = false;
      throw new Error('injected import failure');
    }
    this.persisted = structuredClone(snapshot);
  }
}

class FakeClock implements Clock {
  value = 1_000;
  now(): number { return this.value; }
}

class FakeIds implements IdGenerator {
  private value = 0;
  next(): string { this.value += 1; return `import-id-${this.value}`; }
}

const notifications: NotificationPort = {
  async scheduleCountdown() {},
  async cancelCountdown() {},
};
const exportFiles: ExportFilePort = { async save() {} };

const createApp = (store: CountingStore, clock = new FakeClock()): MvpApplication =>
  new MvpApplication(store, clock, new FakeIds(), notifications, exportFiles);

const createV2Export = async (): Promise<string> => {
  const app = createApp(new CountingStore());
  await app.initialize();
  await app.createGoal(
    { title: '来源目标', importance: 4, feedback: { type: 'cumulative', unit: 'times' }, defaultEnergyCost: 2 },
    { title: '来源活动', minimumMinutes: 10, maximumMinutes: 20, energyCost: 2 },
  );
  const settings = app.getSnapshot().settings;
  settings.theme = 'dark';
  await app.updateSettings(settings);
  return app.exportData();
};

const createV1Envelope = (): string => {
  const legacy = createTypicalPersistedSnapshotV1();
  legacy.companionProjection.globalXp = 9_999;
  const { schemaVersion: _schemaVersion, ...data } = legacy;
  return JSON.stringify({ format: 'self-improvement-tracker', version: 1, exportedAt: 50, data });
};

describe('MvpApplication import preview and confirmation', () => {
  it('previews v3 without writing and confirms with one replace', async () => {
    const serialized = await createV2Export();
    const store = new CountingStore();
    const app = createApp(store);
    await app.initialize();
    await app.createGoal(
      { title: '本机旧目标', importance: 3, feedback: { type: 'experience' }, defaultEnergyCost: 3 },
      { title: '本机旧活动', minimumMinutes: 5, maximumMinutes: 15, energyCost: 3 },
    );
    const writesBeforePreview = store.replaceCalls;

    expect(app.previewImport(serialized)).toMatchObject({ sourceVersion: 3, goalCount: 1, activityCount: 1 });
    expect(store.replaceCalls).toBe(writesBeforePreview);
    expect(app.getSnapshot().goals[0]?.title).toBe('本机旧目标');

    await app.confirmImport(serialized);
    expect(store.replaceCalls).toBe(writesBeforePreview + 1);
    expect(app.getSnapshot().goals[0]?.title).toBe('来源目标');
    expect(app.getSnapshot().settings.theme).toBe('dark');
  });

  it('migrates v1 defaults and rebuilds the companion projection', async () => {
    const store = new CountingStore();
    const app = createApp(store);
    await app.initialize();
    const serialized = createV1Envelope();

    expect(app.previewImport(serialized)).toMatchObject({ sourceVersion: 1, settings: createDefaultAppSettings() });
    await app.confirmImport(serialized);
    expect(app.getSnapshot().schemaVersion).toBe(3);
    expect(app.getSnapshot().settings).toEqual(createDefaultAppSettings());
    expect(app.getSnapshot().companionProjection.globalXp).toBe(0);
  });

  it('keeps runtime and persisted data unchanged when confirmation fails', async () => {
    const serialized = await createV2Export();
    const store = new CountingStore();
    const app = createApp(store);
    await app.initialize();
    await app.createGoal(
      { title: '必须保留', importance: 5, feedback: { type: 'experience' }, defaultEnergyCost: 1 },
      { title: '保留活动', minimumMinutes: 5, maximumMinutes: 10, energyCost: 1 },
    );
    const before = app.getSnapshot();
    app.previewImport(serialized);
    store.failNextReplace = true;

    await expect(app.confirmImport(serialized)).rejects.toThrow('injected import failure');
    expect(app.getSnapshot()).toEqual(before);
    expect(store.persisted).toEqual(before);
  });
});
