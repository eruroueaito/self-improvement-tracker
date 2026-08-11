/**
 * 模块名称：快照与导入信封预算
 * 职责描述：生成确定性 canonical JSON，并按 UTF-8 字节执行 16/20 MiB 上限
 * 输入/输出：接收 JSON-compatible 值或原始信封文本，成功无返回或抛出 SnapshotBudgetError
 * 依赖关系：浏览器/Node 标准 TextEncoder
 * 注意事项：拒绝循环、非有限数字和非 JSON 值，不能让 JSON.stringify 静默改写数据
 */
export const SNAPSHOT_MAX_BYTES = 16 * 1024 * 1024;
export const ENVELOPE_MAX_BYTES = 20 * 1024 * 1024;

export class SnapshotBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotBudgetError';
  }
}

export const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

const encodeCanonical = (value: unknown, seen: WeakSet<object>): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new SnapshotBudgetError('canonical JSON 不接受非有限数字');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') throw new SnapshotBudgetError(`canonical JSON 不接受 ${typeof value}`);
  if (seen.has(value)) throw new SnapshotBudgetError('canonical JSON 不接受循环引用');
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => encodeCanonical(item, seen)).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SnapshotBudgetError('canonical JSON 只接受普通对象');
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${encodeCanonical(record[key], seen)}`).join(',')}}`;
  } finally {
    seen.delete(value);
  }
};

export const canonicalJson = (value: unknown): string => encodeCanonical(value, new WeakSet());

export const assertSnapshotWithinBudget = (snapshot: unknown): void => {
  const bytes = utf8ByteLength(canonicalJson(snapshot));
  if (bytes > SNAPSHOT_MAX_BYTES) {
    throw new SnapshotBudgetError(`应用快照超过 ${SNAPSHOT_MAX_BYTES} 字节上限`);
  }
};

export const assertEnvelopeTextWithinBudget = (serialized: string): void => {
  const bytes = utf8ByteLength(serialized);
  if (bytes > ENVELOPE_MAX_BYTES) {
    throw new SnapshotBudgetError(`导入信封超过 ${ENVELOPE_MAX_BYTES} 字节上限`);
  }
};
