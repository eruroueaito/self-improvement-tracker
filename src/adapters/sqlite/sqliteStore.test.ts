/**
 * 模块名称：SQLite 适配器编排测试
 * 职责描述：验证预检早于 DDL、新库初始化和非法状态 fail-closed
 * 输入/输出：用脚本化连接管理器驱动 SqliteStore 初始化与 load
 * 依赖关系：Vitest、SqliteStore、迁移表常量与设置默认值
 * 注意事项：脚本化连接不执行 SQL，不替代真实 Android 插件契约
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../../modules/settings/settings';
import { SqliteStore, type SQLiteStoreConnection, type SQLiteStoreConnectionManager } from './sqliteStore';
import { V1_REQUIRED_TABLES, V2_REQUIRED_TABLES } from './sqliteMigrationState';

interface ConnectionState {
  nativeVersion: number;
  appSchemaVersion: number;
  tables: readonly string[];
  settings?: unknown;
  settingsId?: number;
  projection?: unknown;
}

class ScriptedConnection implements SQLiteStoreConnection {
  readonly operations: string[] = [];
  private state: ConnectionState;

  constructor(state: ConnectionState, private readonly events: string[]) {
    this.state = structuredClone(state);
  }

  async open(): Promise<void> { this.events.push('connection:open'); }
  async close(): Promise<void> { this.events.push('connection:close'); }
  async getVersion() { return { version: this.state.nativeVersion }; }
  async getTableList() { return { values: [...this.state.tables] }; }
  async beginTransaction(): Promise<void> { this.operations.push('begin'); }
  async commitTransaction(): Promise<void> { this.operations.push('commit'); }
  async rollbackTransaction(): Promise<void> { this.operations.push('rollback'); }
  async execute(statement: string): Promise<void> { this.operations.push(`execute:${statement.trim().slice(0, 20)}`); }

  async run(statement: string, values: unknown[] = []): Promise<void> {
    this.operations.push(`run:${statement}`);
    if (statement.includes('app_settings')) this.state.settings = JSON.parse(String(values[0]));
    if (statement.includes('app_meta')) this.state.appSchemaVersion = 2;
  }

  async query(statement: string) {
    if (statement.includes("FROM app_meta WHERE key = 'schema_version'")) {
      return { values: [{ value: String(this.state.appSchemaVersion) }] };
    }
    if (statement.startsWith('PRAGMA table_info(')) {
      const table = statement.slice('PRAGMA table_info('.length, -1);
      return { values: table === 'app_meta' ? [{ name: 'key' }, { name: 'value' }] : [{ name: 'id' }, { name: 'payload' }] };
    }
    if (statement.includes('FROM app_settings ORDER BY id')) {
      return { values: this.state.settings === undefined ? [] : [{ id: this.state.settingsId ?? 1, payload: JSON.stringify(this.state.settings) }] };
    }
    if (statement.includes('FROM companion_projection ORDER BY id')) {
      return { values: this.state.projection === undefined ? [] : [{ id: 1, payload: JSON.stringify(this.state.projection) }] };
    }
    if (statement.startsWith('SELECT COUNT(*)')) return { values: [{ row_count: 0 }] };
    if (statement.startsWith('SELECT payload FROM')) return { values: [] };
    throw new Error(`unexpected query: ${statement}`);
  }
}

class ScriptedManager implements SQLiteStoreConnectionManager {
  readonly events: string[] = [];
  readonly connections: ScriptedConnection[] = [];

  constructor(private readonly exists: boolean, private readonly states: ConnectionState[]) {}

  async isDatabase() { this.events.push('manager:isDatabase'); return { result: this.exists }; }
  async addUpgradeStatement() { this.events.push('manager:addUpgrade'); }
  async closeConnection() { this.events.push('manager:closeConnection'); }

  async createConnection(): Promise<ScriptedConnection> {
    this.events.push('manager:createConnection');
    const state = this.states[this.connections.length];
    if (!state) throw new Error('missing scripted connection state');
    const connection = new ScriptedConnection(state, this.events);
    this.connections.push(connection);
    return connection;
  }
}

describe('SqliteStore initialization orchestration', () => {
  it('preflights a legacy database before registering the DDL upgrade', async () => {
    const manager = new ScriptedManager(true, [
      { nativeVersion: 0, appSchemaVersion: 1, tables: V1_REQUIRED_TABLES },
      { nativeVersion: 2, appSchemaVersion: 1, tables: V2_REQUIRED_TABLES },
    ]);
    const store = new SqliteStore(manager);

    await store.initialize();

    expect(manager.events.indexOf('manager:closeConnection')).toBeLessThan(manager.events.indexOf('manager:addUpgrade'));
    expect(manager.connections).toHaveLength(2);
    expect(await store.load()).toBeNull();
    expect(manager.connections[1]!.operations.some((operation) => operation.includes('app_meta'))).toBe(false);
  });

  it('initializes settings and app_meta only after proving a new database empty', async () => {
    const manager = new ScriptedManager(false, [{
      nativeVersion: 2,
      appSchemaVersion: 1,
      tables: V2_REQUIRED_TABLES,
    }]);
    const store = new SqliteStore(manager);

    await store.initialize();

    const operations = manager.connections[0]!.operations;
    expect(operations.at(-1)).toBe('commit');
    expect(operations.at(-2)).toContain('app_meta');
    expect(operations.at(-3)).toContain('app_settings');
    expect(await store.load()).toBeNull();
  });

  it('rejects native-v0 plus app-v2 before registering any upgrade', async () => {
    const manager = new ScriptedManager(true, [{
      nativeVersion: 0,
      appSchemaVersion: 2,
      tables: V2_REQUIRED_TABLES,
      settings: createDefaultAppSettings(),
    }]);

    await expect(new SqliteStore(manager).initialize()).rejects.toThrow(/原生结构仍低于 v2/);

    expect(manager.events).not.toContain('manager:addUpgrade');
    expect(manager.events).toContain('manager:closeConnection');
  });

  it('rejects invalid current settings during preflight', async () => {
    const manager = new ScriptedManager(true, [{
      nativeVersion: 2,
      appSchemaVersion: 2,
      tables: V2_REQUIRED_TABLES,
      settings: { ...createDefaultAppSettings(), token: 'secret-value' },
    }]);

    await expect(new SqliteStore(manager).initialize()).rejects.toThrow(/不受支持的字段/);

    expect(manager.events).not.toContain('manager:addUpgrade');
  });

  it('rejects a malformed settings singleton whose only row is not id 1', async () => {
    const manager = new ScriptedManager(true, [{
      nativeVersion: 2,
      appSchemaVersion: 2,
      tables: V2_REQUIRED_TABLES,
      settings: createDefaultAppSettings(),
      settingsId: 2,
    }]);

    await expect(new SqliteStore(manager).initialize()).rejects.toThrow(/id 必须为 1/);
    expect(manager.events).not.toContain('manager:addUpgrade');
  });
});
