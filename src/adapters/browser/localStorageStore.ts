/**
 * 模块名称：浏览器 localStorage 适配器
 * 职责描述：在开发外壳中提供版本化、复制后提交的本地持久化
 * 输入/输出：从固定 key 加载 AppSnapshot，原子替换序列化快照
 * 依赖关系：应用端口、浏览器 Storage API
 * 注意事项：仅用于浏览器开发，不作为 Android SQLite 发布实现
 */
import type { AppSnapshot, DataStore } from '../../app/ports';

const STORAGE_KEY = 'self-improvement-tracker:v1';

export class LocalStorageStore implements DataStore {
  async initialize(): Promise<void> {}

  async load(): Promise<AppSnapshot | null> {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as AppSnapshot) : null;
  }

  async replace(snapshot: AppSnapshot): Promise<void> {
    // 先完成序列化，避免序列化异常时破坏最后一个可读快照。
    const serialized = JSON.stringify(structuredClone(snapshot));
    localStorage.setItem(STORAGE_KEY, serialized);
  }
}
