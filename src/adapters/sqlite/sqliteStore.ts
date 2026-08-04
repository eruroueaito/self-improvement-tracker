/**
 * 模块名称：Android SQLite 数据适配器
 * 职责描述：以单连接事务持久化所有 MVP 事实表与宠物投影
 * 输入/输出：load 组合 AppSnapshot，replace 在事务中原子替换全部表
 * 依赖关系：Capacitor Community SQLite、应用端口
 * 注意事项：浏览器不得实例化；迁移失败绝不静默清库
 */
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { AppSnapshot, DataStore } from '../../app/ports';

const DATABASE_NAME = 'self_improvement_tracker';
const TABLES = ['goals', 'activities', 'recommendation_runs', 'sessions', 'reward_entries'] as const;

export class SqliteStore implements DataStore {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private database: SQLiteDBConnection | null = null;

  async initialize(): Promise<void> {
    this.database = await this.sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false);
    await this.database.open();
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS recommendation_runs (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reward_entries (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS companion_projection (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      INSERT OR REPLACE INTO app_meta(key, value) VALUES ('schema_version', '1');
    `);
  }

  private ready(): SQLiteDBConnection {
    if (!this.database) throw new Error('SQLite 尚未初始化');
    return this.database;
  }

  private async readPayloads<T>(table: (typeof TABLES)[number]): Promise<T[]> {
    const result = await this.ready().query(`SELECT payload FROM ${table} ORDER BY id`);
    return (result.values ?? []).map((row) => JSON.parse(String(row.payload)) as T);
  }

  async load(): Promise<AppSnapshot | null> {
    const projectionResult = await this.ready().query('SELECT payload FROM companion_projection WHERE id = 1');
    const projectionRow = projectionResult.values?.[0];
    if (!projectionRow) return null;
    return {
      schemaVersion: 1,
      goals: await this.readPayloads('goals'),
      activities: await this.readPayloads('activities'),
      recommendationRuns: await this.readPayloads('recommendation_runs'),
      sessions: await this.readPayloads('sessions'),
      rewardEntries: await this.readPayloads('reward_entries'),
      companionProjection: JSON.parse(String(projectionRow.payload)),
    };
  }

  async replace(snapshot: AppSnapshot): Promise<void> {
    const database = this.ready();
    await database.beginTransaction();
    try {
      // execute/run 默认各自开启事务；这里显式关闭，确保全部事实只由外层事务一次提交。
      for (const table of TABLES) await database.execute(`DELETE FROM ${table};`, false);
      await database.execute('DELETE FROM companion_projection;', false);
      for (const item of snapshot.goals) await database.run('INSERT INTO goals(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
      for (const item of snapshot.activities) await database.run('INSERT INTO activities(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
      for (const item of snapshot.recommendationRuns) await database.run('INSERT INTO recommendation_runs(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
      for (const item of snapshot.sessions) await database.run('INSERT INTO sessions(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
      for (const item of snapshot.rewardEntries) await database.run('INSERT INTO reward_entries(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
      await database.run('INSERT INTO companion_projection(id, payload) VALUES (1, ?)', [JSON.stringify(snapshot.companionProjection)], false);
      await database.commitTransaction();
    } catch (error) {
      await database.rollbackTransaction();
      throw error;
    }
  }
}
