/**
 * 模块名称：系统时间与 ID 适配器
 * 职责描述：向应用层提供当前时间和 UUID
 * 输入/输出：无输入，输出 epoch 毫秒或 UUID 字符串
 * 依赖关系：标准 Date 与 Web Crypto API
 * 注意事项：测试应替换为可控实现，不直接 mock 领域函数
 */
import type { Clock, IdGenerator } from '../../app/ports';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
