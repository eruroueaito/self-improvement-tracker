/**
 * 模块名称：SQLite 当前快照事务写入器
 * 职责描述：按固定顺序原子替换事实、投影、设置、AI history 并最后提交 app schema v3
 * 输入/输出：接收窄连接接口与 CurrentAppSnapshot，无返回值
 * 依赖关系：当前应用快照类型
 * 注意事项：app_meta 必须是 commit 前最后一个写操作；失败必须 rollback
 */
import type { CurrentAppSnapshot } from '../../app/ports';
import { APP_SCHEMA_VERSION } from './sqliteMigrationState';

export interface SnapshotWriterConnection {
  beginTransaction(): Promise<unknown>;
  execute(statements: string, transaction?: boolean): Promise<unknown>;
  run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
}

const FACT_TABLES = ['goals', 'activities', 'recommendation_runs', 'sessions', 'reward_entries'] as const;

const failureText = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const rollbackAndRethrow = async (connection: SnapshotWriterConnection, error: unknown): Promise<never> => {
  try {
    await connection.rollbackTransaction();
  } catch (rollbackError) {
    throw new AggregateError(
      [error, rollbackError],
      `SQLite 写入失败：${failureText(error)}；rollback 也失败：${failureText(rollbackError)}`,
    );
  }
  throw error;
};

export const writeCurrentSnapshot = async (
  connection: SnapshotWriterConnection,
  snapshot: CurrentAppSnapshot,
): Promise<void> => {
  await connection.beginTransaction();
  try {
    for (const table of FACT_TABLES) await connection.execute(`DELETE FROM ${table};`, false);
    await connection.execute('DELETE FROM companion_projection;', false);
    await connection.execute('DELETE FROM app_settings;', false);
    await connection.execute('DELETE FROM ai_interactions;', false);

    for (const item of snapshot.goals) {
      await connection.run('INSERT INTO goals(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }
    for (const item of snapshot.activities) {
      await connection.run('INSERT INTO activities(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }
    for (const item of snapshot.recommendationRuns) {
      await connection.run('INSERT INTO recommendation_runs(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }
    for (const item of snapshot.sessions) {
      await connection.run('INSERT INTO sessions(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }
    for (const item of snapshot.rewardEntries) {
      await connection.run('INSERT INTO reward_entries(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }

    await connection.run(
      'INSERT INTO companion_projection(id, payload) VALUES (1, ?)',
      [JSON.stringify(snapshot.companionProjection)],
      false,
    );
    await connection.run('INSERT INTO app_settings(id, payload) VALUES (1, ?)', [JSON.stringify(snapshot.settings)], false);
    for (const item of snapshot.aiInteractions) {
      await connection.run('INSERT INTO ai_interactions(id, payload) VALUES (?, ?)', [item.id, JSON.stringify(item)], false);
    }
    await connection.run(
      "INSERT OR REPLACE INTO app_meta(key, value) VALUES ('schema_version', ?)",
      [String(APP_SCHEMA_VERSION)],
      false,
    );
    await connection.commitTransaction();
  } catch (error) {
    await rollbackAndRethrow(connection, error);
  }
};
