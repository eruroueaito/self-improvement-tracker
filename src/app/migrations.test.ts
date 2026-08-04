/**
 * 模块名称：应用快照迁移测试
 * 职责描述：验证真实 v1 形状到 v2 的不可变迁移和版本拒绝规则
 * 输入/输出：使用独立 v1 fixture 调用迁移器并断言当前快照
 * 依赖关系：Vitest、迁移器、奖励投影
 * 注意事项：v1 fixture 不通过删除 v2 字段临时构造
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createEmptyPersistedSnapshotV1, createTypicalPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import { migrateSnapshot, UnsupportedSchemaVersionError } from './migrations';

describe('migrateSnapshot', () => {
  it('migrates an independent v1 fixture without mutating facts', () => {
    const legacy = createTypicalPersistedSnapshotV1();
    const before = structuredClone(legacy);
    const result = migrateSnapshot(legacy);

    expect(result).toEqual({
      migratedFrom: 1,
      snapshot: {
        ...before,
        schemaVersion: 2,
        settings: createDefaultAppSettings(),
      },
    });
    expect(legacy).toEqual(before);
    expect(result.snapshot.companionProjection).not.toBe(legacy.companionProjection);
  });

  it('validates and clones current snapshots without reporting a migration', () => {
    const current = {
      ...createEmptyPersistedSnapshotV1(),
      schemaVersion: 2 as const,
      settings: createDefaultAppSettings(),
    };
    const result = migrateSnapshot(current);
    current.settings.ai.enabled = true;

    expect(result.migratedFrom).toBeNull();
    expect(result.snapshot.settings.ai.enabled).toBe(false);
  });

  it.each([0, 3, 99])('rejects unsupported schema version %s', (schemaVersion) => {
    const value = { ...createEmptyPersistedSnapshotV1(), schemaVersion };
    expect(() => migrateSnapshot(value)).toThrow(UnsupportedSchemaVersionError);
    expect(() => migrateSnapshot(value)).toThrow(String(schemaVersion));
  });

  it('rejects unknown snapshot and nested settings fields', () => {
    expect(() => migrateSnapshot({ ...createEmptyPersistedSnapshotV1(), token: 'secret-value' })).toThrow(/未知字段/);
    expect(() => migrateSnapshot({
      ...createEmptyPersistedSnapshotV1(),
      schemaVersion: 2,
      settings: { ...createDefaultAppSettings(), ai: { enabled: false, historyEnabled: false, apiKey: 'secret-value' } },
    })).toThrow(/不受支持的字段/);
  });
});
