/**
 * 模块名称：应用端口
 * 职责描述：定义领域快照、持久化、时间、ID 与通知的跨平台接口
 * 输入/输出：应用层调用端口，平台适配器提供实现
 * 依赖关系：四个领域模块的稳定数据类型
 * 注意事项：replace 必须原子替换，失败时保留旧快照
 */
import type { ActivityTemplate, Goal } from '../modules/goals/types';
import type { RecommendationRun } from '../modules/recommendations/types';
import type { CompanionProjection, RewardLedgerEntry } from '../modules/rewards/types';
import type { Session } from '../modules/sessions/types';

export interface AppSnapshot {
  schemaVersion: 1;
  goals: Goal[];
  activities: ActivityTemplate[];
  recommendationRuns: RecommendationRun[];
  sessions: Session[];
  rewardEntries: RewardLedgerEntry[];
  companionProjection: CompanionProjection;
}

export interface DataStore {
  initialize(): Promise<void>;
  load(): Promise<AppSnapshot | null>;
  replace(snapshot: AppSnapshot): Promise<void>;
}

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  next(): string;
}

export interface NotificationPort {
  scheduleCountdown(sessionId: string, activityTitle: string, dueAt: number): Promise<void>;
  cancelCountdown(sessionId: string): Promise<void>;
}

export interface ExportFilePort {
  save(contents: string, filename: string): Promise<void>;
}
