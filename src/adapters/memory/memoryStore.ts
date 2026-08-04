/**
 * 模块名称：内存数据适配器
 * 职责描述：为契约测试和无平台环境提供原子快照存储
 * 输入/输出：load 返回快照副本，replace 原子替换内部副本
 * 依赖关系：应用端口
 * 注意事项：所有边界都深拷贝，避免调用者绕过事务修改状态
 */
import type { AppSnapshot, DataStore } from '../../app/ports';

export class MemoryStore implements DataStore {
  private snapshot: AppSnapshot | null;

  constructor(initial: AppSnapshot | null = null) {
    this.snapshot = initial ? structuredClone(initial) : null;
  }

  async initialize(): Promise<void> {}

  async load(): Promise<AppSnapshot | null> {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  async replace(snapshot: AppSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}
