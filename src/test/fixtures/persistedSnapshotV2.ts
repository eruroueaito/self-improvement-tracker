/**
 * 模块名称：独立 schema v2 测试夹具
 * 职责描述：提供含 legacy AppSettingsV2 的空态与典型持久快照
 * 输入/输出：返回全新 PersistedSnapshotV2 对象
 * 依赖关系：v1 事实夹具、legacy 设置与版本化快照类型
 * 注意事项：本夹具不从 v3 删除字段构造，避免掩盖迁移边界
 */
import type { PersistedSnapshotV2 } from '../../app/snapshots';
import { createDefaultAppSettingsV2 } from '../../modules/settings/settings';
import { createEmptyPersistedSnapshotV1, createTypicalPersistedSnapshotV1 } from './persistedSnapshotV1';

export const createEmptyPersistedSnapshotV2 = (): PersistedSnapshotV2 => {
  const { schemaVersion: _schemaVersion, ...facts } = createEmptyPersistedSnapshotV1();
  return { schemaVersion: 2, ...facts, settings: createDefaultAppSettingsV2() };
};

export const createTypicalPersistedSnapshotV2 = (): PersistedSnapshotV2 => {
  const { schemaVersion: _schemaVersion, ...facts } = createTypicalPersistedSnapshotV1();
  return { schemaVersion: 2, ...facts, settings: createDefaultAppSettingsV2() };
};
