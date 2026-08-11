/**
 * 模块名称：SQLite 当前快照事务写入测试
 * 职责描述：验证写入顺序、meta-last 约束及每个失败序号的 rollback
 * 输入/输出：用可注入失败的窄连接执行典型 v3 快照
 * 依赖关系：Vitest、SQLite 快照写入器、v1 fixture 与设置默认值
 * 注意事项：fake connection 仅证明事务编排，不证明原生插件行为
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../../modules/settings/settings';
import { createTypicalPersistedSnapshotV1 } from '../../test/fixtures/persistedSnapshotV1';
import type { CurrentAppSnapshot } from '../../app/ports';
import { writeCurrentSnapshot, type SnapshotWriterConnection } from './sqliteSnapshotWriter';

class RecordingConnection implements SnapshotWriterConnection {
  readonly operations: string[] = [];
  rollbackCalls = 0;
  private operationIndex = 0;

  constructor(private readonly failAt: number | null = null, private readonly failRollback = false) {}

  private step(label: string): void {
    this.operationIndex += 1;
    this.operations.push(label);
    if (this.operationIndex === this.failAt) throw new Error(`injected failure ${this.operationIndex}`);
  }

  async beginTransaction(): Promise<void> { this.step('begin'); }
  async execute(statement: string): Promise<void> { this.step(`execute:${statement}`); }
  async run(statement: string): Promise<void> { this.step(`run:${statement}`); }
  async commitTransaction(): Promise<void> { this.step('commit'); }
  async rollbackTransaction(): Promise<void> {
    this.rollbackCalls += 1;
    this.operations.push('rollback');
    if (this.failRollback) throw new Error('injected rollback failure');
  }
}

const typicalSnapshot = (): CurrentAppSnapshot => ({
  ...createTypicalPersistedSnapshotV1(),
  schemaVersion: 3,
  settings: createDefaultAppSettings(),
  aiInteractions: [{
    id: 'interaction-1',
    requestType: 'goal-draft',
    providerModel: 'model-1',
    schemaVersion: 'goal-draft-v1',
    inputSummary: 'GoalDraft request (12 characters)',
    validatedOutput: null,
    startedAt: 1,
    durationMs: 2,
    result: 'timeout',
  }],
});

describe('writeCurrentSnapshot', () => {
  it('writes app_meta last and commits once', async () => {
    const connection = new RecordingConnection();
    await writeCurrentSnapshot(connection, typicalSnapshot());

    expect(connection.operations.at(-1)).toBe('commit');
    expect(connection.operations.at(-2)).toContain('app_meta');
    expect(connection.operations.findIndex((item) => item.includes('app_settings'))).toBeGreaterThan(0);
    expect(connection.operations.some((item) => item.includes('DELETE FROM ai_interactions'))).toBe(true);
    expect(connection.operations.some((item) => item.includes('INSERT INTO ai_interactions'))).toBe(true);
    expect(connection.rollbackCalls).toBe(0);
  });

  it('rolls back every failed transaction step after begin', async () => {
    const successful = new RecordingConnection();
    await writeCurrentSnapshot(successful, typicalSnapshot());
    const operationCount = successful.operations.length;

    for (let failAt = 2; failAt <= operationCount; failAt += 1) {
      const connection = new RecordingConnection(failAt);
      await expect(writeCurrentSnapshot(connection, typicalSnapshot())).rejects.toThrow(`injected failure ${failAt}`);
      expect(connection.rollbackCalls).toBe(1);
      if (failAt < operationCount) expect(connection.operations).not.toContain('commit');
    }
  });

  it('reports rollback failure without hiding the original error', async () => {
    const connection = new RecordingConnection(2, true);
    await expect(writeCurrentSnapshot(connection, typicalSnapshot())).rejects.toThrow(
      /injected failure 2；rollback 也失败：injected rollback failure/,
    );
  });
});
