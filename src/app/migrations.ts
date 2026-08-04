/**
 * 模块名称：应用快照迁移器
 * 职责描述：把受支持的持久化快照逐版本迁移并校验为当前运行态快照
 * 输入/输出：接收未知持久化值，返回 schemaVersion 2 快照与原始迁移版本
 * 依赖关系：版本化快照、事实校验与 AppSettings
 * 注意事项：迁移必须纯净且不修改输入；未知版本必须显式失败
 */
import { ValidationError } from '../modules/goals/validation';
import { createDefaultAppSettings, normalizeAppSettings } from '../modules/settings/settings';
import { validateSnapshotFacts } from './importValidation';
import {
  CURRENT_SCHEMA_VERSION,
  type CurrentAppSnapshot,
  type PersistedSnapshotV1,
} from './snapshots';

type RecordValue = Record<string, unknown>;

export class UnsupportedSchemaVersionError extends Error {
  constructor(readonly schemaVersion: unknown) {
    super(`不支持的数据 schema 版本：${String(schemaVersion)}`);
    this.name = 'UnsupportedSchemaVersionError';
  }
}

export interface MigrationResult {
  snapshot: CurrentAppSnapshot;
  migratedFrom: number | null;
}

const V1_KEYS = [
  'schemaVersion',
  'goals',
  'activities',
  'recommendationRuns',
  'sessions',
  'rewardEntries',
  'companionProjection',
] as const;
const V2_KEYS = [...V1_KEYS, 'settings'] as const;

const asRecord = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('应用快照必须是对象');
  }
  return value as RecordValue;
};

const assertExactSnapshotKeys = (snapshot: RecordValue, expected: readonly string[]): void => {
  const unknown = Object.keys(snapshot).filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !Object.hasOwn(snapshot, key));
  if (unknown.length > 0) throw new ValidationError(`应用快照包含未知字段：${unknown.join(', ')}`);
  if (missing.length > 0) throw new ValidationError(`应用快照缺少字段：${missing.join(', ')}`);
};

const validateV1 = (value: unknown): PersistedSnapshotV1 => {
  const snapshot = asRecord(value);
  assertExactSnapshotKeys(snapshot, V1_KEYS);
  if (snapshot.schemaVersion !== 1) throw new UnsupportedSchemaVersionError(snapshot.schemaVersion);
  return { schemaVersion: 1, ...validateSnapshotFacts(snapshot) };
};

const validateV2 = (value: unknown): CurrentAppSnapshot => {
  const snapshot = asRecord(value);
  assertExactSnapshotKeys(snapshot, V2_KEYS);
  if (snapshot.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(snapshot.schemaVersion);
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...validateSnapshotFacts(snapshot),
    settings: normalizeAppSettings(snapshot.settings),
  };
};

const v1ToV2 = (snapshot: PersistedSnapshotV1): CurrentAppSnapshot => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  goals: structuredClone(snapshot.goals),
  activities: structuredClone(snapshot.activities),
  recommendationRuns: structuredClone(snapshot.recommendationRuns),
  sessions: structuredClone(snapshot.sessions),
  rewardEntries: structuredClone(snapshot.rewardEntries),
  companionProjection: structuredClone(snapshot.companionProjection),
  settings: createDefaultAppSettings(),
});

export const migrateSnapshot = (value: unknown): MigrationResult => {
  const snapshot = asRecord(value);
  if (snapshot.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return { snapshot: validateV2(snapshot), migratedFrom: null };
  }
  if (snapshot.schemaVersion === 1) {
    const migrated = v1ToV2(validateV1(snapshot));
    return { snapshot: validateV2(migrated), migratedFrom: 1 };
  }
  throw new UnsupportedSchemaVersionError(snapshot.schemaVersion);
};
