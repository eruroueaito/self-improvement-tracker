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
import { LocalStorageStore } from './browser/localStorageStore';
import { MemoryStore } from './memory/memoryStore';

const snapshot = (): AppSnapshot => ({
  schemaVersion: 1,
  goals: [], activities: [], recommendationRuns: [], sessions: [], rewardEntries: [],
  companionProjection: emptyCompanionProjection(1),
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
    });
  });
};

beforeEach(() => localStorage.clear());
contract('MemoryStore', () => new MemoryStore());
contract('LocalStorageStore', () => new LocalStorageStore());
