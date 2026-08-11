/**
 * 模块名称：Provider 凭据校验测试
 * 职责描述：锁定 endpoint binding、header 规范化、认证要求与 64 KiB 安全预算
 * 输入/输出：传入可信或恶意 unknown 值，断言规范凭据或 fail-closed 错误
 * 依赖关系：Vitest、Provider 凭据模块
 * 注意事项：测试秘密仅为固定假值，不得进入产品日志或持久化夹具
 */
import { describe, expect, it } from 'vitest';
import {
  credentialsMatchBinding,
  normalizeEndpointBoundProviderCredentials,
  normalizeProviderBinding,
  normalizeProviderCredentials,
} from './credentials';

const binding = { protocol: 'openai-chat-completions' as const, baseUrl: 'https://provider.example/v1' };

describe('provider credentials', () => {
  it('normalizes header names without mutating the input', () => {
    const input = { apiKey: 'secret-key', customHeaders: { 'X-API-Key': 'header-secret', 'X-Tenant': 'tenant-1' } };
    const before = structuredClone(input);

    expect(normalizeProviderCredentials(input)).toEqual({
      apiKey: 'secret-key',
      customHeaders: { 'x-api-key': 'header-secret', 'x-tenant': 'tenant-1' },
    });
    expect(input).toEqual(before);
  });

  it('rejects prototype-shaped header names before schema parsing can discard them', () => {
    const input = JSON.parse('{"apiKey":"key","customHeaders":{"__proto__":"header-secret"}}');
    expect(() => normalizeProviderCredentials(input)).toThrow(/禁止/);
  });

  it.each([
    [{ apiKey: '', customHeaders: {} }, /认证信息/],
    [{ apiKey: 'key', customHeaders: { Authorization: 'forbidden' } }, /禁止/],
    [{ apiKey: 'key', customHeaders: { 'Proxy-Authorization': 'forbidden' } }, /禁止/],
    [{ apiKey: 'key', customHeaders: { 'Sec-Fetch-Site': 'forbidden' } }, /禁止/],
    [{ apiKey: 'key', customHeaders: { 'bad header': 'value' } }, /HTTP token/],
    [{ apiKey: 'key', customHeaders: { 'x-api-key': 'line\r\nbreak' } }, /换行/],
    [{ apiKey: 'key', customHeaders: { 'X-Key': 'one', 'x-key': 'two' } }, /重复/],
    [{ apiKey: 'key', customHeaders: {}, unknown: true }, /字段/],
  ])('rejects unsafe credentials %#', (value, message) => {
    expect(() => normalizeProviderCredentials(value)).toThrow(message);
  });

  it('enforces header count, per-value and total UTF-8 limits', () => {
    const tooMany = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`x-key-${index}`, 'v']));
    expect(() => normalizeProviderCredentials({ apiKey: '', customHeaders: tooMany })).toThrow(/16/);
    expect(() => normalizeProviderCredentials({ apiKey: 'x'.repeat(8_193), customHeaders: {} })).toThrow(/8192/);
    expect(() => normalizeProviderCredentials({
      apiKey: 'key',
      customHeaders: Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`x-large-${index}`, '🙂'.repeat(4_096)])),
    })).toThrow(/64 KiB/);
  });

  it('requires an already-canonical HTTPS endpoint binding and strict stored keys', () => {
    expect(normalizeProviderBinding(binding)).toEqual(binding);
    expect(() => normalizeProviderBinding({ ...binding, baseUrl: `${binding.baseUrl}/` })).toThrow(/规范化/);
    expect(() => normalizeProviderBinding({ ...binding, token: 'secret' })).toThrow(/字段/);

    const stored = normalizeEndpointBoundProviderCredentials({
      binding,
      apiKey: 'key',
      customHeaders: {},
    });
    expect(credentialsMatchBinding(stored, binding)).toBe(true);
    expect(credentialsMatchBinding(stored, { ...binding, baseUrl: 'https://other.example/v1' })).toBe(false);
    expect(() => normalizeEndpointBoundProviderCredentials({ ...stored, apiKey: 'key', extra: true })).toThrow(/字段/);
    const prototypeHeader = JSON.parse(JSON.stringify(stored).replace('"customHeaders":{}', '"customHeaders":{"__proto__":"secret"}'));
    expect(() => normalizeEndpointBoundProviderCredentials(prototypeHeader)).toThrow(/禁止/);
  });
});
