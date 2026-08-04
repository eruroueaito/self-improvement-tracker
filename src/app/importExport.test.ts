/**
 * 模块名称：版本化导入导出测试
 * 职责描述：验证 v2 白名单导出、v1/v2 预览输入与安全恢复导出的秘密边界
 * 输入/输出：构造可信和畸形快照，断言 envelope 版本、字段与失败行为
 * 依赖关系：Vitest、迁移器、导入校验与测试 fixture
 * 注意事项：普通领域文本中的 token 字样必须保留，只有未知结构和秘密配置键被拒绝或丢弃
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createTypicalPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import { buildExportEnvelope, buildRecoveryExport, summarizeImport } from './importExport';
import { validateImportEnvelope } from './importValidation';
import { migrateSnapshot } from './migrations';

const v1Envelope = (): Record<string, unknown> => {
  const { schemaVersion: _schemaVersion, ...data } = createTypicalPersistedSnapshotV1();
  return { format: 'self-improvement-tracker', version: 1, exportedAt: 10, data };
};

describe('versioned import and export', () => {
  it('accepts v1 and v2 envelopes and summarizes their migrated settings', () => {
    const legacy = validateImportEnvelope(v1Envelope());
    const legacyCurrent = migrateSnapshot(legacy.snapshot).snapshot;
    expect(summarizeImport(legacy.sourceVersion, legacyCurrent)).toMatchObject({
      sourceVersion: 1,
      goalCount: 1,
      activityCount: 1,
      settings: createDefaultAppSettings(),
    });

    legacyCurrent.settings.theme = 'dark';
    const currentEnvelope = buildExportEnvelope(legacyCurrent, 20);
    const current = validateImportEnvelope(currentEnvelope);
    expect(current.sourceVersion).toBe(2);
    expect(migrateSnapshot(current.snapshot).snapshot.settings.theme).toBe('dark');
  });

  it('constructs a v2 export from nested allowlists', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    const polluted = current as typeof current & {
      apiKey?: string;
      settings: typeof current.settings & { token?: string; ai: typeof current.settings.ai & { apiKey?: string } };
    };
    polluted.apiKey = 'top-secret-value';
    polluted.goals[0] = { ...polluted.goals[0]!, apiKey: 'goal-secret-value' } as unknown as typeof polluted.goals[number];
    polluted.settings.token = 'settings-secret-value';
    polluted.settings.ai.apiKey = 'nested-secret-value';

    const serialized = JSON.stringify(buildExportEnvelope(polluted, 30));
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('top-secret-value');
    expect(serialized).not.toContain('goal-secret-value');
    expect(serialized).not.toContain('settings-secret-value');
    expect(serialized).not.toContain('nested-secret-value');
    expect(JSON.parse(serialized).version).toBe(2);
  });

  it('uses default settings for recoverable v2 facts with unsafe settings', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    current.goals[0]!.title = '阅读 token 设计笔记';
    const unsafe = {
      ...current,
      settings: {
        ...current.settings,
        ai: { ...current.settings.ai, apiKey: 'secret-value' },
        token: 'another-secret-value',
      },
    };

    const recovery = buildRecoveryExport(unsafe, 40);
    expect(recovery).not.toBeNull();
    expect(recovery?.settingsRecovered).toBe(false);
    expect(recovery?.contents).toContain('阅读 token 设计笔记');
    expect(recovery?.contents).not.toContain('apiKey');
    expect(recovery?.contents).not.toContain('secret-value');
    expect(JSON.parse(recovery!.contents).data.settings).toEqual(createDefaultAppSettings());
  });

  it('rejects secret settings and prototype-pollution keys during normal import', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    const envelope = buildExportEnvelope(current, 50) as unknown as Record<string, unknown>;
    const data = (envelope.data as Record<string, unknown>);
    const settings = data.settings as Record<string, unknown>;
    settings.apiKey = 'secret-value';
    expect(() => validateImportEnvelope(envelope)).toThrow(/settings.*不受支持的字段/);

    const polluted = JSON.parse(JSON.stringify(v1Envelope()).replace('"title":', '"__proto__":{"polluted":true},"title":'));
    expect(() => validateImportEnvelope(polluted)).toThrow(/不受支持的字段/);
    expect(buildRecoveryExport({ schemaVersion: 1, ...(polluted.data as object) }, 60)).toBeNull();
  });

  it('rejects wrong types in otherwise known fact fields', () => {
    const badDescription = v1Envelope();
    const descriptionData = badDescription.data as Record<string, unknown>;
    (descriptionData.goals as Array<Record<string, unknown>>)[0]!.description = { unsafe: true };
    expect(() => validateImportEnvelope(badDescription)).toThrow(/description.*字符串/);

    const fractionalRating = v1Envelope();
    const ratingData = fractionalRating.data as Record<string, unknown>;
    (ratingData.goals as Array<Record<string, unknown>>)[0]!.importance = 3.5;
    expect(() => validateImportEnvelope(fractionalRating)).toThrow(/importance.*整数/);

    const badSession = v1Envelope();
    const sessionData = badSession.data as Record<string, unknown>;
    (sessionData.sessions as unknown[]).push({
      id: 'bad-session',
      goalId: 'goal-v1',
      activityTemplateId: 'activity-v1',
      recommendationRunId: null,
      timerMode: 'flowtime',
      status: 'running',
      plannedMinutes: '10',
      startedAt: 1,
      runningSince: 1,
      accumulatedMs: 0,
      targetDurationMs: null,
      lastHeartbeatAt: 1,
      endedAt: null,
      endType: null,
      settlement: null,
      createdAt: 1,
      settledAt: null,
    });
    expect(() => validateImportEnvelope(badSession)).toThrow(/plannedMinutes.*有限数字/);
  });
});
