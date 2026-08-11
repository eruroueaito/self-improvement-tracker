/**
 * 模块名称：AI Provider 配置测试
 * 职责描述：验证非秘密 Provider 配置的严格白名单、HTTPS 与规范化边界
 * 输入/输出：构造未知配置，断言规范化结果或领域错误
 * 依赖关系：Vitest、Provider 配置模块
 * 注意事项：本测试不包含或持久化任何真实凭据
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAiProviderSettings, normalizeAiProviderSettings } from './providerConfig';

const validConfig = () => ({
  protocol: 'openai-chat-completions',
  baseUrl: 'https://provider.example/v1/',
  model: '  model-1  ',
  requestTimeoutMs: 30_000,
  structuredOutputMode: 'json-schema',
});

describe('AI Provider config', () => {
  it('creates an inert default without choosing a model', () => {
    expect(createDefaultAiProviderSettings()).toEqual({
      protocol: 'openai-chat-completions',
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      requestTimeoutMs: 30_000,
      structuredOutputMode: 'json-schema',
    });
  });

  it('normalizes the endpoint base and model', () => {
    expect(normalizeAiProviderSettings(validConfig())).toEqual({
      ...validConfig(),
      baseUrl: 'https://provider.example/v1',
      model: 'model-1',
    });
  });

  it('allows only the explicit inert empty model when requested for persisted defaults', () => {
    expect(normalizeAiProviderSettings(createDefaultAiProviderSettings(), { allowEmptyModel: true }).model).toBe('');
    expect(() => normalizeAiProviderSettings(createDefaultAiProviderSettings())).toThrow(/model/i);
  });

  it.each([
    'http://provider.example/v1',
    'https://user:password@provider.example/v1',
    'https://provider.example/v1?token=value',
    'https://provider.example/v1#fragment',
    '/relative/v1',
  ])('rejects unsafe base URL %s', (baseUrl) => {
    expect(() => normalizeAiProviderSettings({ ...validConfig(), baseUrl })).toThrow();
  });

  it.each([
    { extra: true },
    { protocol: 'other' },
    { requestTimeoutMs: 4_999 },
    { requestTimeoutMs: 120_001 },
    { requestTimeoutMs: 5_000.5 },
    { structuredOutputMode: 'auto' },
    { model: 'x'.repeat(161) },
  ])('rejects invalid or unknown fields: %o', (override) => {
    expect(() => normalizeAiProviderSettings({ ...validConfig(), ...override })).toThrow();
  });
});
