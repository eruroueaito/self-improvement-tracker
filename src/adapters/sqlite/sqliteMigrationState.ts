/**
 * 模块名称：SQLite 迁移状态判定
 * 职责描述：校验原生 DDL version、应用 meta version 与必需表的组合
 * 输入/输出：接收只读预检证据，返回允许的 legacy/retry/current 状态或拒绝
 * 依赖关系：无外部依赖
 * 注意事项：未知、未来或无法证明来源的状态必须 fail closed
 */
export const SQLITE_NATIVE_VERSION = 2 as const;
export const APP_SCHEMA_VERSION = 2 as const;

export const V1_REQUIRED_TABLES = [
  'goals',
  'activities',
  'recommendation_runs',
  'sessions',
  'reward_entries',
  'companion_projection',
  'app_meta',
] as const;

export const V2_REQUIRED_TABLES = [...V1_REQUIRED_TABLES, 'app_settings'] as const;

export type ExistingSqliteState = 'legacy-v1' | 'migration-retry' | 'current-v2';

export class SqliteDataIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqliteDataIntegrityError';
  }
}

export const parseAppSchemaVersion = (rows: unknown[]): number => {
  if (rows.length !== 1) {
    throw new SqliteDataIntegrityError(`app_meta.schema_version 必须恰好有一行，实际为 ${rows.length} 行`);
  }
  const row = rows[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new SqliteDataIntegrityError('app_meta.schema_version 行格式无效');
  }
  const version = Number((row as Record<string, unknown>).value);
  if (!Number.isInteger(version) || version < 1) {
    throw new SqliteDataIntegrityError(`app_meta.schema_version 无效：${String((row as Record<string, unknown>).value)}`);
  }
  return version;
};

const assertNativeVersion = (version: number): void => {
  if (!Number.isInteger(version) || version < 0) {
    throw new SqliteDataIntegrityError(`SQLite native version 无效：${String(version)}`);
  }
  if (version > SQLITE_NATIVE_VERSION) {
    throw new SqliteDataIntegrityError(`SQLite native version ${version} 高于当前支持版本 ${SQLITE_NATIVE_VERSION}`);
  }
};

const assertTables = (tables: ReadonlySet<string>, required: readonly string[]): void => {
  const missing = required.filter((table) => !tables.has(table));
  if (missing.length > 0) throw new SqliteDataIntegrityError(`SQLite 缺少必需表：${missing.join(', ')}`);
};

export const classifyExistingSqliteState = (input: {
  nativeVersion: number;
  appSchemaVersion: number;
  tables: ReadonlySet<string>;
}): ExistingSqliteState => {
  assertNativeVersion(input.nativeVersion);
  if (input.appSchemaVersion > APP_SCHEMA_VERSION) {
    throw new SqliteDataIntegrityError(`应用 schema ${input.appSchemaVersion} 高于当前支持版本 ${APP_SCHEMA_VERSION}`);
  }

  if (input.appSchemaVersion === 1 && input.nativeVersion === 0) {
    assertTables(input.tables, V1_REQUIRED_TABLES);
    return 'legacy-v1';
  }
  if (input.appSchemaVersion === 1 && input.nativeVersion === SQLITE_NATIVE_VERSION) {
    assertTables(input.tables, V2_REQUIRED_TABLES);
    return 'migration-retry';
  }
  if (input.appSchemaVersion === APP_SCHEMA_VERSION && input.nativeVersion === SQLITE_NATIVE_VERSION) {
    assertTables(input.tables, V2_REQUIRED_TABLES);
    return 'current-v2';
  }
  if (input.appSchemaVersion === APP_SCHEMA_VERSION && input.nativeVersion < SQLITE_NATIVE_VERSION) {
    throw new SqliteDataIntegrityError('应用 schema 已是 v2，但 SQLite 原生结构仍低于 v2');
  }

  throw new SqliteDataIntegrityError(
    `不支持的 SQLite 迁移状态：native=${input.nativeVersion}, app=${input.appSchemaVersion}`,
  );
};
