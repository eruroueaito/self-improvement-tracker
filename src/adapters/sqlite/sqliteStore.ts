/**
 * 模块名称：Android SQLite 数据适配器
 * 职责描述：预检双版本状态、升级 DDL，并原子持久化当前应用快照
 * 输入/输出：load 返回 v1/v2/v3 持久化联合，replace 只接收当前 v3 快照
 * 依赖关系：Capacitor Community SQLite、应用端口、版本化设置、AI history 与事务 writer
 * 注意事项：未知迁移状态必须保留数据库并拒绝启动，绝不静默清库
 */
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { CurrentAppSnapshot, DataStore, PersistedSnapshot } from '../../app/ports';
import { normalizeAiInteractionHistory } from '../../modules/ai/interactionLog';
import {
  createDefaultAppSettings,
  normalizeAppSettings,
  normalizeAppSettingsV2,
} from '../../modules/settings/settings';
import {
  APP_SCHEMA_VERSION,
  classifyExistingSqliteState,
  parseAppSchemaVersion,
  SQLITE_NATIVE_VERSION,
  SqliteDataIntegrityError,
  V1_REQUIRED_TABLES,
  V2_REQUIRED_TABLES,
  V3_REQUIRED_TABLES,
  type ExistingSqliteState,
} from './sqliteMigrationState';
import {
  rollbackAndRethrow,
  writeCurrentSnapshot,
  type SnapshotWriterConnection,
} from './sqliteSnapshotWriter';

const DATABASE_NAME = 'self_improvement_tracker';
const FACT_TABLES = ['goals', 'activities', 'recommendation_runs', 'sessions', 'reward_entries'] as const;

const BASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS recommendation_runs (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reward_entries (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS companion_projection (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`;

const DDL_UPGRADES = [{
  toVersion: 2,
  statements: [
    'CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);',
  ],
}, {
  toVersion: 3,
  statements: [
    'CREATE TABLE IF NOT EXISTS ai_interactions (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);',
  ],
}];

interface SQLiteValues {
  values?: unknown[];
}

interface SQLiteVersionResult {
  version?: number;
}

interface SQLiteResult {
  result?: boolean;
}

export interface SQLiteStoreConnection extends SnapshotWriterConnection {
  open(): Promise<void>;
  close(): Promise<void>;
  getVersion(): Promise<SQLiteVersionResult>;
  getTableList(): Promise<SQLiteValues>;
  query(statement: string, values?: unknown[]): Promise<SQLiteValues>;
}

export interface SQLiteStoreConnectionManager {
  isDatabase(database: string): Promise<SQLiteResult>;
  addUpgradeStatement(database: string, upgrade: Array<{ toVersion: number; statements: string[] }>): Promise<void>;
  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ): Promise<SQLiteStoreConnection>;
  closeConnection(database: string, readonly: boolean): Promise<void>;
}

const rowsOf = (result: SQLiteValues): unknown[] => result.values ?? [];

const recordOf = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SqliteDataIntegrityError(`${label} 行格式无效`);
  }
  return value as Record<string, unknown>;
};

const parsePayload = (value: unknown, label: string): unknown => {
  try {
    return JSON.parse(String(value));
  } catch {
    throw new SqliteDataIntegrityError(`${label} payload 不是有效 JSON`);
  }
};

export class SqliteStore implements DataStore {
  private database: SQLiteStoreConnection | null = null;

  constructor(
    private readonly sqlite: SQLiteStoreConnectionManager = new SQLiteConnection(CapacitorSQLite),
  ) {}

  async initialize(): Promise<void> {
    const exists = await this.sqlite.isDatabase(DATABASE_NAME);
    if (typeof exists.result !== 'boolean') throw new SqliteDataIntegrityError('无法确认 SQLite 数据库是否存在');

    const existingState = exists.result ? await this.inspectExistingDatabase() : null;
    await this.sqlite.addUpgradeStatement(DATABASE_NAME, DDL_UPGRADES);

    const database = await this.sqlite.createConnection(
      DATABASE_NAME,
      false,
      'no-encryption',
      SQLITE_NATIVE_VERSION,
      false,
    );
    try {
      await database.open();
      await database.execute(BASE_SCHEMA);
      await this.assertNativeVersion(database, SQLITE_NATIVE_VERSION);
      await this.assertRequiredTableShapes(database, V3_REQUIRED_TABLES);
      if (existingState === null) await this.initializeNewDatabase(database);
      this.database = database;
    } catch (error) {
      await this.closeFailedConnection(database);
      throw error;
    }
  }

  private async inspectExistingDatabase(): Promise<ExistingSqliteState> {
    const connection = await this.sqlite.createConnection(
      DATABASE_NAME,
      false,
      'no-encryption',
      SQLITE_NATIVE_VERSION,
      false,
    );
    try {
      await connection.open();
      const nativeVersion = await this.readNativeVersion(connection);
      const tables = await this.readTableSet(connection);
      if (!tables.has('app_meta')) throw new SqliteDataIntegrityError('既有 SQLite 缺少 app_meta，拒绝猜测版本');
      const metaRows = rowsOf(await connection.query("SELECT value FROM app_meta WHERE key = 'schema_version'"));
      const appSchemaVersion = parseAppSchemaVersion(metaRows);
      const state = classifyExistingSqliteState({ nativeVersion, appSchemaVersion, tables });
      const requiredTables = state === 'legacy-v1'
        ? V1_REQUIRED_TABLES
        : state === 'retry-v1-native-v2' || state === 'current-v2'
          ? V2_REQUIRED_TABLES
          : V3_REQUIRED_TABLES;
      await this.assertRequiredTableShapes(connection, requiredTables);
      if (state === 'current-v2' || state === 'retry-v2-native-v3') await this.readSettingsV2(connection);
      if (state === 'current-v3') {
        await this.readSettingsV3(connection);
        await this.readAiInteractions(connection);
      }
      await this.closeConnection(connection);
      return state;
    } catch (error) {
      await this.closeFailedConnection(connection);
      throw error;
    }
  }

  private async closeConnection(connection: SQLiteStoreConnection): Promise<void> {
    await connection.close();
    await this.sqlite.closeConnection(DATABASE_NAME, false);
  }

  private async closeFailedConnection(connection: SQLiteStoreConnection): Promise<void> {
    try {
      await connection.close();
    } catch {
      // 保留主错误；连接清理失败只影响本次实例，不能覆盖迁移诊断。
    }
    try {
      await this.sqlite.closeConnection(DATABASE_NAME, false);
    } catch {
      // 同上，主错误由调用方继续抛出。
    }
  }

  private async readNativeVersion(connection: SQLiteStoreConnection): Promise<number> {
    const result = await connection.getVersion();
    if (!Number.isInteger(result.version) || (result.version ?? -1) < 0) {
      throw new SqliteDataIntegrityError(`SQLite native version 无效：${String(result.version)}`);
    }
    return result.version!;
  }

  private async assertNativeVersion(connection: SQLiteStoreConnection, expected: number): Promise<void> {
    const actual = await this.readNativeVersion(connection);
    if (actual !== expected) {
      throw new SqliteDataIntegrityError(`SQLite DDL 升级未到达 v${expected}，实际为 v${actual}`);
    }
  }

  private async readTableSet(connection: SQLiteStoreConnection): Promise<Set<string>> {
    const values = rowsOf(await connection.getTableList());
    return new Set(values.map((value) => {
      if (typeof value === 'string') return value;
      const record = recordOf(value, 'getTableList');
      return String(record.name ?? record.tbl_name ?? '');
    }).filter(Boolean));
  }

  private async assertRequiredTableShapes(
    connection: SQLiteStoreConnection,
    requiredTables: readonly string[],
  ): Promise<void> {
    const tables = await this.readTableSet(connection);
    const missing = requiredTables.filter((table) => !tables.has(table));
    if (missing.length > 0) throw new SqliteDataIntegrityError(`SQLite 缺少必需表：${missing.join(', ')}`);

    for (const table of requiredTables) {
      const rows = rowsOf(await connection.query(`PRAGMA table_info(${table})`));
      const columns = new Set(rows.map((row) => String(recordOf(row, `${table} schema`).name ?? '')));
      const expected = table === 'app_meta' ? ['key', 'value'] : ['id', 'payload'];
      const missingColumns = expected.filter((column) => !columns.has(column));
      if (missingColumns.length > 0) {
        throw new SqliteDataIntegrityError(`${table} 缺少必需列：${missingColumns.join(', ')}`);
      }
    }
  }

  private async initializeNewDatabase(connection: SQLiteStoreConnection): Promise<void> {
    await this.assertTablesEmpty(connection, V3_REQUIRED_TABLES);
    await connection.beginTransaction();
    try {
      await connection.run(
        'INSERT INTO app_settings(id, payload) VALUES (1, ?)',
        [JSON.stringify(createDefaultAppSettings())],
        false,
      );
      await connection.run(
        "INSERT INTO app_meta(key, value) VALUES ('schema_version', ?)",
        [String(APP_SCHEMA_VERSION)],
        false,
      );
      await connection.commitTransaction();
    } catch (error) {
      await rollbackAndRethrow(connection, error);
    }
  }

  private async assertTablesEmpty(connection: SQLiteStoreConnection, tables: readonly string[]): Promise<void> {
    for (const table of tables) {
      const rows = rowsOf(await connection.query(`SELECT COUNT(*) AS row_count FROM ${table}`));
      if (rows.length !== 1) throw new SqliteDataIntegrityError(`无法确认 ${table} 是否为空`);
      const count = Number(recordOf(rows[0], `${table} count`).row_count);
      if (!Number.isInteger(count) || count !== 0) {
        throw new SqliteDataIntegrityError(`新建 SQLite 的 ${table} 表不是空表`);
      }
    }
  }

  private ready(): SQLiteStoreConnection {
    if (!this.database) throw new Error('SQLite 尚未初始化');
    return this.database;
  }

  private async readMetaVersion(connection: SQLiteStoreConnection): Promise<number> {
    const rows = rowsOf(await connection.query("SELECT value FROM app_meta WHERE key = 'schema_version'"));
    return parseAppSchemaVersion(rows);
  }

  private async readPayloads<T>(table: (typeof FACT_TABLES)[number]): Promise<T[]> {
    const result = await this.ready().query(`SELECT payload FROM ${table} ORDER BY id`);
    return rowsOf(result).map((row, index) => {
      const record = recordOf(row, `${table}[${index}]`);
      return parsePayload(record.payload, `${table}[${index}]`) as T;
    });
  }

  private async readSingletonPayload(connection: SQLiteStoreConnection, table: string): Promise<unknown | null> {
    const rows = rowsOf(await connection.query(`SELECT id, payload FROM ${table} ORDER BY id`));
    if (rows.length > 1) throw new SqliteDataIntegrityError(`${table} singleton 出现重复行`);
    if (rows.length === 0) return null;
    const row = recordOf(rows[0], table);
    if (Number(row.id) !== 1) throw new SqliteDataIntegrityError(`${table} singleton 的 id 必须为 1`);
    return parsePayload(row.payload, table);
  }

  private async readSettingsV2(connection: SQLiteStoreConnection) {
    const payload = await this.readSingletonPayload(connection, 'app_settings');
    if (payload === null) throw new SqliteDataIntegrityError('schema v2 缺少 app_settings singleton');
    return normalizeAppSettingsV2(payload);
  }

  private async readSettingsV3(connection: SQLiteStoreConnection) {
    const payload = await this.readSingletonPayload(connection, 'app_settings');
    if (payload === null) throw new SqliteDataIntegrityError('schema v3 缺少 app_settings singleton');
    return normalizeAppSettings(payload);
  }

  private async readAiInteractions(connection: SQLiteStoreConnection) {
    const result = await connection.query('SELECT payload FROM ai_interactions ORDER BY id');
    const payloads = rowsOf(result).map((row, index) => {
      const record = recordOf(row, `ai_interactions[${index}]`);
      return parsePayload(record.payload, `ai_interactions[${index}]`);
    });
    return normalizeAiInteractionHistory(payloads);
  }

  private async factsAreEmpty(connection: SQLiteStoreConnection): Promise<boolean> {
    for (const table of [...FACT_TABLES, 'companion_projection', 'ai_interactions'] as const) {
      const rows = rowsOf(await connection.query(`SELECT COUNT(*) AS row_count FROM ${table}`));
      if (rows.length !== 1 || Number(recordOf(rows[0], `${table} count`).row_count) !== 0) return false;
    }
    return true;
  }

  async load(): Promise<PersistedSnapshot | null> {
    const connection = this.ready();
    const schemaVersion = await this.readMetaVersion(connection);
    if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== APP_SCHEMA_VERSION) {
      throw new SqliteDataIntegrityError(`不支持的应用 schema：${schemaVersion}`);
    }

    const projection = await this.readSingletonPayload(connection, 'companion_projection');
    if (projection === null) {
      if (await this.factsAreEmpty(connection)) return null;
      throw new SqliteDataIntegrityError('SQLite 有事实数据但缺少 companion_projection');
    }

    const facts = {
      goals: await this.readPayloads<CurrentAppSnapshot['goals'][number]>('goals'),
      activities: await this.readPayloads<CurrentAppSnapshot['activities'][number]>('activities'),
      recommendationRuns: await this.readPayloads<CurrentAppSnapshot['recommendationRuns'][number]>('recommendation_runs'),
      sessions: await this.readPayloads<CurrentAppSnapshot['sessions'][number]>('sessions'),
      rewardEntries: await this.readPayloads<CurrentAppSnapshot['rewardEntries'][number]>('reward_entries'),
      companionProjection: projection as CurrentAppSnapshot['companionProjection'],
    };

    if (schemaVersion === 1) return { schemaVersion: 1, ...facts };
    if (schemaVersion === 2) return { schemaVersion: 2, ...facts, settings: await this.readSettingsV2(connection) };
    return {
      schemaVersion: APP_SCHEMA_VERSION,
      ...facts,
      settings: await this.readSettingsV3(connection),
      aiInteractions: await this.readAiInteractions(connection),
    };
  }

  async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    await writeCurrentSnapshot(this.ready(), snapshot);
  }
}
