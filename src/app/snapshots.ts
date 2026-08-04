/**
 * 模块名称：版本化应用快照
 * 职责描述：区分旧持久化快照、当前持久化快照与当前运行态快照
 * 输入/输出：向迁移器、应用层和数据适配器提供稳定的版本联合类型
 * 依赖关系：领域事实类型与 AppSettings
 * 注意事项：所有当前应用用例只能接收 schemaVersion 2
 */
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import type { RecommendationRun } from '../modules/recommendations/types';
import type { CompanionProjection, RewardLedgerEntry } from '../modules/rewards/types';
import type { Session } from '../modules/sessions/types';
import type { AppSettings } from '../modules/settings/settings';

export const CURRENT_SCHEMA_VERSION = 2 as const;

export interface SnapshotFacts {
  goals: Goal[];
  activities: ActivityTemplate[];
  recommendationRuns: RecommendationRun[];
  sessions: Session[];
  rewardEntries: RewardLedgerEntry[];
  companionProjection: CompanionProjection;
}

export interface PersistedSnapshotV1 extends SnapshotFacts {
  schemaVersion: 1;
}

export interface CurrentAppSnapshot extends SnapshotFacts {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  settings: AppSettings;
}

export type PersistedSnapshot = PersistedSnapshotV1 | CurrentAppSnapshot;
export type AppSnapshot = CurrentAppSnapshot;
