/**
 * 模块名称：版本化导入导出测试
 * 职责描述：验证 v3 白名单导出、v1/v2/v3 输入、AI history opt-in 与安全恢复边界
 * 输入/输出：构造可信和畸形快照，断言 envelope 版本、字段与失败行为
 * 依赖关系：Vitest、迁移器、导入校验与测试 fixture
 * 注意事项：普通领域文本中的 token 字样必须保留，只有未知结构和秘密配置键被拒绝或丢弃
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '../modules/settings/settings';
import { createTypicalPersistedSnapshotV1 } from '../test/fixtures/persistedSnapshotV1';
import { createTypicalPersistedSnapshotV2 } from '../test/fixtures/persistedSnapshotV2';
import { buildExportEnvelope, buildRecoveryExport, summarizeImport } from './importExport';
import { validateImportEnvelope } from './importValidation';
import { migrateSnapshot } from './migrations';
import { canonicalJson, SNAPSHOT_MAX_BYTES, utf8ByteLength } from './snapshotBudget';

const v1Envelope = (): Record<string, unknown> => {
  const { schemaVersion: _schemaVersion, ...data } = createTypicalPersistedSnapshotV1();
  return { format: 'self-improvement-tracker', version: 1, exportedAt: 10, data };
};

const v2Envelope = (): Record<string, unknown> => {
  const { schemaVersion: _schemaVersion, ...data } = createTypicalPersistedSnapshotV2();
  return { format: 'self-improvement-tracker', version: 2, exportedAt: 15, data };
};

describe('versioned import and export', () => {
  it('accepts v1, v2 and v3 envelopes and summarizes their migrated settings', () => {
    const legacy = validateImportEnvelope(v1Envelope());
    const legacyCurrent = migrateSnapshot(legacy.snapshot).snapshot;
    expect(summarizeImport(legacy.sourceVersion, legacyCurrent)).toMatchObject({
      sourceVersion: 1,
      goalCount: 1,
      activityCount: 1,
      settings: createDefaultAppSettings(),
    });

    const v2 = validateImportEnvelope(v2Envelope());
    expect(v2.sourceVersion).toBe(2);
    expect(migrateSnapshot(v2.snapshot).snapshot.settings.ai.goalDraftEnabled).toBe(false);

    legacyCurrent.settings.theme = 'dark';
    const currentEnvelope = buildExportEnvelope(legacyCurrent, 20);
    const current = validateImportEnvelope(currentEnvelope);
    expect(current.sourceVersion).toBe(3);
    expect(migrateSnapshot(current.snapshot).snapshot.settings.theme).toBe('dark');
  });

  it('constructs a v3 export from nested allowlists with history excluded by default', () => {
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
    expect(JSON.parse(serialized)).toMatchObject({ version: 3, aiHistoryIncluded: false, data: { aiInteractions: [] } });
  });

  it('includes strict AI history only through one explicit export option', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    current.aiInteractions.push({
      id: 'interaction-1',
      requestType: 'goal-draft',
      providerModel: 'model-1',
      schemaVersion: 'goal-draft-v1',
      inputSummary: 'GoalDraft request (12 characters)',
      validatedOutput: null,
      startedAt: 1,
      durationMs: 2,
      result: 'timeout',
    });

    expect(buildExportEnvelope(current, 25).data.aiInteractions).toEqual([]);
    const included = buildExportEnvelope(current, 26, { includeAiHistory: true });
    expect(included.aiHistoryIncluded).toBe(true);
    expect(included.data.aiInteractions).toHaveLength(1);

    const forged = structuredClone(included);
    forged.aiHistoryIncluded = false;
    expect(() => validateImportEnvelope(forged)).toThrow(/声明不含 AI 历史/);
  });

  it('round-trips a valid snapshot close to the 16 MiB limit', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    const remainingBytes = SNAPSHOT_MAX_BYTES - utf8ByteLength(canonicalJson(current));
    current.activities[0]!.contexts[0] += 'x'.repeat(remainingBytes - 100);

    const serialized = JSON.stringify(buildExportEnvelope(current, 35));
    const imported = validateImportEnvelope(JSON.parse(serialized));
    const roundTripped = migrateSnapshot(imported.snapshot).snapshot;

    expect(imported.sourceVersion).toBe(3);
    expect(roundTripped.activities[0]!.contexts[0]).toBe(current.activities[0]!.contexts[0]);
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

  it('recovers valid v3 facts without carrying corrupt AI history into the export', () => {
    const current = migrateSnapshot(createTypicalPersistedSnapshotV1()).snapshot;
    const unsafe = {
      ...current,
      aiInteractions: [{ id: 'bad', apiKey: 'secret-history-value' }],
    };

    const recovery = buildRecoveryExport(unsafe, 45);

    expect(recovery).not.toBeNull();
    expect(recovery?.sourceVersion).toBe(3);
    expect(recovery?.contents).not.toContain('secret-history-value');
    expect(JSON.parse(recovery!.contents)).toMatchObject({
      aiHistoryIncluded: false,
      data: { aiInteractions: [] },
    });
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

  it('rejects reversal timestamps before their settlement but accepts the same millisecond', () => {
    const envelope = v1Envelope();
    const data = envelope.data as Record<string, unknown>;
    (data.sessions as unknown[]).push({
      id: 'reward-session', goalId: 'goal-v1', activityTemplateId: 'activity-v1', recommendationRunId: null,
      timerMode: 'flowtime', status: 'voided', plannedMinutes: null, startedAt: 1, runningSince: null,
      accumulatedMs: 60_000, targetDurationMs: null, lastHeartbeatAt: 5, endedAt: 5, endType: 'completed',
      settlement: { actualMinutes: 1, completionRatio: 1, difficulty: null, effort: null, quantity: null, quantityUnit: null, userNote: '' },
      createdAt: 1, settledAt: 5,
    });
    data.rewardEntries = [
      { id: 'settlement', sessionId: 'reward-session', goalId: 'goal-v1', entryType: 'settlement', globalXpDelta: 5, goalXpDelta: 5, ruleVersion: 1, idempotencyKey: 'settle', reversalOfEntryId: null, createdAt: 10 },
      { id: 'reversal', sessionId: 'reward-session', goalId: 'goal-v1', entryType: 'reversal', globalXpDelta: -5, goalXpDelta: -5, ruleVersion: 1, idempotencyKey: 'reverse', reversalOfEntryId: 'settlement', createdAt: 9 },
    ];
    expect(() => validateImportEnvelope(envelope)).toThrow(/反向奖励.*时间/);

    ((data.rewardEntries as Array<Record<string, unknown>>)[1]!).createdAt = 10;
    expect(validateImportEnvelope(envelope).snapshot.rewardEntries).toHaveLength(2);

    (data.rewardEntries as unknown[]).push({
      id: 'duplicate-reversal', sessionId: 'reward-session', goalId: 'goal-v1', entryType: 'reversal',
      globalXpDelta: -5, goalXpDelta: -5, ruleVersion: 1, idempotencyKey: 'reverse-again',
      reversalOfEntryId: 'settlement', createdAt: 11,
    });
    expect(() => validateImportEnvelope(envelope)).toThrow(/重复反向/);
  });
});
