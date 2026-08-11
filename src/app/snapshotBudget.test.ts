/**
 * 模块名称：快照与导入信封预算测试
 * 职责描述：验证 canonical JSON、UTF-8 精确计数及 16/20 MiB fail-closed 边界
 * 输入/输出：构造小型与精确边界值，断言成功或 SnapshotBudgetError
 * 依赖关系：Vitest、快照预算模块
 * 注意事项：按 UTF-8 字节而非 JavaScript 字符数计量
 */
import { describe, expect, it } from 'vitest';
import {
  ENVELOPE_MAX_BYTES,
  SNAPSHOT_MAX_BYTES,
  SnapshotBudgetError,
  assertEnvelopeTextWithinBudget,
  assertSnapshotWithinBudget,
  canonicalJson,
  utf8ByteLength,
} from './snapshotBudget';

describe('snapshot budgets', () => {
  it('serializes objects canonically without mutating key order', () => {
    const value = { z: 1, nested: { b: true, a: ['🙂', null] }, a: 'first' };
    const before = structuredClone(value);

    expect(canonicalJson(value)).toBe('{"a":"first","nested":{"a":["🙂",null],"b":true},"z":1}');
    expect(value).toEqual(before);
    expect(utf8ByteLength('🙂')).toBe(4);
  });

  it('accepts exactly 16 MiB and rejects the next UTF-8 byte', () => {
    const jsonOverhead = utf8ByteLength('{"value":""}');
    expect(() => assertSnapshotWithinBudget({ value: 'x'.repeat(SNAPSHOT_MAX_BYTES - jsonOverhead) })).not.toThrow();
    expect(() => assertSnapshotWithinBudget({ value: 'x'.repeat(SNAPSHOT_MAX_BYTES - jsonOverhead + 1) }))
      .toThrow(SnapshotBudgetError);
  });

  it('rejects an import envelope before parsing when it exceeds 20 MiB', () => {
    expect(() => assertEnvelopeTextWithinBudget('x'.repeat(ENVELOPE_MAX_BYTES))).not.toThrow();
    expect(() => assertEnvelopeTextWithinBudget(`🙂${'x'.repeat(ENVELOPE_MAX_BYTES - 3)}`))
      .toThrow(SnapshotBudgetError);
  });
});
