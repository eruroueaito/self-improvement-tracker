/**
 * 模块名称：数据适配器契约测试
 * 职责描述：验证内存与浏览器适配器的空态、深拷贝和完整替换语义
 * 输入/输出：对每个 DataStore 运行相同契约并断言持久快照
 * 依赖关系：Vitest、MemoryStore、LocalStorageStore、应用端口
 * 注意事项：SQLite 在原生 Android 环境复用同一语义，浏览器测试不冒充原生证据
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppSnapshot, DataStore } from '../app/ports';
import { emptyCompanionProjection } from '../modules/rewards/rewardEngine';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createEmptyPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import { LocalStorageStore } from './browser/localStorageStore';
import { MemoryStore } from './memory/memoryStore';

const snapshot = (): AppSnapshot => ({
  schemaVersion: 2,
  goals: [], activities: [], recommendationRuns: [], sessions: [], rewardEntries: [],
  companionProjection: emptyCompanionProjection(1),
  settings: createDefaultAppSettings(),
});

const contract = (name: string, create: () => DataStore) => {
  describe(name, () => {
    it('loads null and then replaces a complete snapshot', async () => {
      const store = create();
      await store.initialize();
      expect(await store.load()).toBeNull();
      const value = snapshot();
      await store.replace(value);
      value.companionProjection.globalXp = 99;
      expect((await store.load())?.companionProjection.globalXp).toBe(0);
      const loaded = await store.load();
      if (!loaded) throw new Error('契约测试预期快照存在');
      loaded.companionProjection.globalXp = 77;
      expect((await store.load())?.companionProjection.globalXp).toBe(0);
    });
  });
};

beforeEach(() => localStorage.clear());
contract('MemoryStore', () => new MemoryStore());
contract('LocalStorageStore', () => new LocalStorageStore());

describe('legacy storage compatibility', () => {
  it('MemoryStore loads an independent v1 snapshot without upgrading it itself', async () => {
    const legacy = createEmptyPersistedSnapshotV1();
    const store = new MemoryStore(legacy);
    legacy.companionProjection.globalXp = 99;

    const loaded = await store.load();

    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.companionProjection.globalXp).toBe(0);
  });

  it('LocalStorageStore keeps reading the established v1 key', async () => {
    const legacy = createEmptyPersistedSnapshotV1();
    localStorage.setItem('self-improvement-tracker:v1', JSON.stringify(legacy));

    const loaded = await new LocalStorageStore().load();

    expect(loaded).toEqual(legacy);
  });

  it('LocalStorageStore does not overwrite the last good snapshot when serialization fails', async () => {
    const store = new LocalStorageStore();
    const current = snapshot();
    await store.replace(current);
    const invalid = structuredClone(current) as AppSnapshot & { unsupported?: bigint };
    invalid.unsupported = 1n;

    await expect(store.replace(invalid)).rejects.toThrow();

    expect(await store.load()).toEqual(current);
  });
});
