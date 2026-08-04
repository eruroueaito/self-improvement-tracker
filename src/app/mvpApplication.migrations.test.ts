/**
 * 模块名称：应用初始化迁移测试
 * 职责描述：验证 v1 启动迁移、v2 幂等启动、失败一致性与安全恢复导出
 * 输入/输出：以可控 DataStore 初始化 MvpApplication 并断言持久态与运行态
 * 依赖关系：Vitest、MvpApplication、版本化快照夹具
 * 注意事项：失败用例必须证明旧持久数据未被替换
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createEmptyPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import type { CurrentAppSnapshot, PersistedSnapshot } from './snapshots';
import type { Clock, DataStore, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class ControlledStore implements DataStore {
  replaceCalls = 0;
  failReplace = false;

  constructor(public persisted: PersistedSnapshot | null) {}

  async initialize(): Promise<void> {}

  async load(): Promise<PersistedSnapshot | null> {
    return this.persisted ? structuredClone(this.persisted) : null;
  }

  async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    this.replaceCalls += 1;
    if (this.failReplace) throw new Error('injected replace failure');
    this.persisted = structuredClone(snapshot);
  }
}

const clock: Clock = { now: () => 1_000 };
const ids: IdGenerator = { next: () => 'unused-id' };
const notifications: NotificationPort = {
  async scheduleCountdown() {},
  async cancelCountdown() {},
};
const exportFiles: ExportFilePort = { async save() {} };
const createApp = (store: DataStore, files: ExportFilePort = exportFiles) =>
  new MvpApplication(store, clock, ids, notifications, files);

describe('MvpApplication migration initialization', () => {
  it('migrates v1 once and persists the current snapshot', async () => {
    const store = new ControlledStore(createEmptyPersistedSnapshotV1());
    const app = createApp(store);

    const snapshot = await app.initialize();

    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.settings).toEqual(createDefaultAppSettings());
    expect(store.replaceCalls).toBe(1);
    expect(store.persisted?.schemaVersion).toBe(2);
  });

  it('does not rewrite an already-current snapshot during initialization', async () => {
    const current: CurrentAppSnapshot = {
      ...createEmptyPersistedSnapshotV1(),
      schemaVersion: 2,
      settings: createDefaultAppSettings(),
    };
    const store = new ControlledStore(current);

    await createApp(store).initialize();

    expect(store.replaceCalls).toBe(0);
  });

  it('keeps v1 persisted and the application unopened when migration write-back fails', async () => {
    const legacy = createEmptyPersistedSnapshotV1();
    const store = new ControlledStore(legacy);
    store.failReplace = true;
    const saved: Array<{ contents: string; filename: string }> = [];
    const app = createApp(store, { async save(contents, filename) { saved.push({ contents, filename }); } });

    await expect(app.initialize()).rejects.toThrow('injected replace failure');
    expect(store.persisted).toEqual(legacy);
    expect(() => app.getSnapshot()).toThrow('应用尚未初始化');
    expect(app.getRecoveryExportStatus()).toEqual({ sourceVersion: 1, settingsRecovered: null });
    await app.exportRecoveryToFile();
    expect(saved[0]?.filename).toMatch(/^self-improvement-tracker-recovery-/);
    expect(JSON.parse(saved[0]!.contents)).toMatchObject({ format: 'self-improvement-tracker', version: 1 });
  });

  it('exports safe defaults when current facts are valid but settings are unsafe', async () => {
    const unsafe = {
      ...createEmptyPersistedSnapshotV1(),
      schemaVersion: 2,
      settings: {
        ...createDefaultAppSettings(),
        ai: { enabled: false, historyEnabled: false, apiKey: 'secret-value' },
      },
    } as unknown as PersistedSnapshot;
    const saved: string[] = [];
    const app = createApp(new ControlledStore(unsafe), { async save(contents) { saved.push(contents); } });

    await expect(app.initialize()).rejects.toThrow(/settings.*不受支持的字段/);
    expect(app.getRecoveryExportStatus()).toEqual({ sourceVersion: 2, settingsRecovered: false });
    await app.exportRecoveryToFile();
    expect(saved[0]).not.toContain('apiKey');
    expect(saved[0]).not.toContain('secret-value');
    expect(JSON.parse(saved[0]!).data.settings).toEqual(createDefaultAppSettings());
  });

  it('keeps runtime and persisted settings unchanged when an update fails', async () => {
    const store = new ControlledStore(null);
    const app = createApp(store);
    await app.initialize();
    store.failReplace = true;

    const changed = createDefaultAppSettings();
    changed.theme = 'dark';
    await expect(app.updateSettings(changed)).rejects.toThrow('injected replace failure');

    expect(app.getSnapshot().settings.theme).toBe('system');
    expect((store.persisted as CurrentAppSnapshot).settings.theme).toBe('system');
  });
});
