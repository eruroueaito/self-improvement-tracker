/**
 * 模块名称：应用端口
 * 职责描述：定义领域快照、持久化、时间、ID、通知与秘密存储的跨平台接口
 * 输入/输出：应用层调用端口，平台适配器提供实现
 * 依赖关系：四个领域模块的稳定数据类型
 * 注意事项：replace 必须原子替换，失败时保留旧快照
 */
import type { CurrentAppSnapshot, PersistedSnapshot } from './snapshots';
import type {
  EndpointBoundProviderCredentials,
  ProviderBinding,
  ProviderCredentials,
} from '../modules/ai/credentials';
import type { AiProviderSettings } from '../modules/ai/types';
export type { AppSnapshot, CurrentAppSnapshot, PersistedSnapshot, PersistedSnapshotV1 } from './snapshots';

export interface DataStore {
  initialize(): Promise<void>;
  load(): Promise<PersistedSnapshot | null>;
  replace(snapshot: CurrentAppSnapshot): Promise<void>;
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

export interface SecretStore {
  readProviderCredentials(expected: ProviderBinding): Promise<EndpointBoundProviderCredentials | null>;
  writeProviderCredentials(binding: ProviderBinding, credentials: ProviderCredentials): Promise<void>;
  deleteProviderCredentials(): Promise<void>;
  hasProviderCredentials(expected: ProviderBinding): Promise<boolean>;
}

export type ProviderTask =
  | { type: 'goal-draft'; input: string }
  | { type: 'connection-test' };

export interface ProviderCompletionInput {
  settings: AiProviderSettings;
  credentials: EndpointBoundProviderCredentials;
  task: ProviderTask;
  signal: AbortSignal;
}

export interface ProviderAdapter {
  completeStructured(input: ProviderCompletionInput): Promise<unknown>;
}
