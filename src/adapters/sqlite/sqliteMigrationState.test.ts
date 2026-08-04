/**
 * 模块名称：SQLite 迁移状态测试
 * 职责描述：覆盖 N1 双版本合法矩阵及所有拒绝分支
 * 输入/输出：构造 preflight 证据并断言状态分类或完整性错误
 * 依赖关系：Vitest、SQLite 迁移状态模块
 * 注意事项：纯状态测试不冒充 Android SQLite 运行证据
 */
import { describe, expect, it } from 'vitest';
import {
  classifyExistingSqliteState,
  parseAppSchemaVersion,
  SqliteDataIntegrityError,
  V1_REQUIRED_TABLES,
  V2_REQUIRED_TABLES,
} from './sqliteMigrationState';

describe('SQLite migration state', () => {
  it.each([
    [0, 1, V1_REQUIRED_TABLES, 'legacy-v1'],
    [2, 1, V2_REQUIRED_TABLES, 'migration-retry'],
    [2, 2, V2_REQUIRED_TABLES, 'current-v2'],
  ] as const)('accepts native %s + app %s as %s', (nativeVersion, appSchemaVersion, tables, expected) => {
    expect(classifyExistingSqliteState({
      nativeVersion,
      appSchemaVersion,
      tables: new Set(tables),
    })).toBe(expected);
  });

  it.each([
    [1, 1],
    [0, 2],
    [1, 2],
    [3, 2],
    [2, 3],
  ])('rejects native %s + app %s', (nativeVersion, appSchemaVersion) => {
    expect(() => classifyExistingSqliteState({
      nativeVersion,
      appSchemaVersion,
      tables: new Set(V2_REQUIRED_TABLES),
    })).toThrow(SqliteDataIntegrityError);
  });

  it('rejects a state whose required table set is incomplete', () => {
    const tables = new Set(V1_REQUIRED_TABLES);
    tables.delete('reward_entries');
    expect(() => classifyExistingSqliteState({ nativeVersion: 0, appSchemaVersion: 1, tables })).toThrow(/reward_entries/);
  });

  it.each([
    [[], '0 行'],
    [[{ value: '1' }, { value: '1' }], '2 行'],
    [[{ value: 'not-an-integer' }], '无效'],
  ] as const)('rejects invalid app_meta rows', (rows, message) => {
    expect(() => parseAppSchemaVersion([...rows])).toThrow(message);
  });
});
