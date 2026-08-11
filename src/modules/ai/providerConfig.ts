/**
 * 模块名称：AI Provider 配置
 * 职责描述：创建并严格规范化不含秘密的 OpenAI-compatible Provider 配置
 * 输入/输出：接收 unknown 配置，返回规范 AiProviderSettings 或抛出领域错误
 * 依赖关系：AI 类型、通用 ValidationError
 * 注意事项：只接受 HTTPS base URL；空 model 仅用于明确的未配置持久默认值
 */
import { ValidationError } from '../goals/validation';
import type { AiProviderSettings } from './types';

type RecordValue = Record<string, unknown>;

const PROVIDER_KEYS = [
  'protocol',
  'baseUrl',
  'model',
  'requestTimeoutMs',
  'structuredOutputMode',
] as const;

const asRecord = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('AI Provider 配置必须是对象');
  }
  return value as RecordValue;
};

const assertExactKeys = (value: RecordValue): void => {
  const unknown = Object.keys(value).filter((key) => !PROVIDER_KEYS.includes(key as typeof PROVIDER_KEYS[number]));
  const missing = PROVIDER_KEYS.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0) throw new ValidationError(`AI Provider 配置包含未知字段：${unknown.join(', ')}`);
  if (missing.length > 0) throw new ValidationError(`AI Provider 配置缺少字段：${missing.join(', ')}`);
};

const normalizeBaseUrl = (value: unknown): string => {
  if (typeof value !== 'string') throw new ValidationError('AI Provider baseUrl 必须是字符串');
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError('AI Provider baseUrl 必须是绝对 HTTPS URL');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new ValidationError('AI Provider baseUrl 只允许不含凭据、查询或片段的 HTTPS URL');
  }
  const pathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${pathname}`;
};

export const createDefaultAiProviderSettings = (): AiProviderSettings => ({
  protocol: 'openai-chat-completions',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
  requestTimeoutMs: 30_000,
  structuredOutputMode: 'json-schema',
});

export const normalizeAiProviderSettings = (
  value: unknown,
  options: { allowEmptyModel?: boolean } = {},
): AiProviderSettings => {
  const config = asRecord(value);
  assertExactKeys(config);
  if (config.protocol !== 'openai-chat-completions') throw new ValidationError('AI Provider protocol 无效');
  if (typeof config.model !== 'string') throw new ValidationError('AI Provider model 必须是字符串');
  const model = config.model.trim();
  if ((!options.allowEmptyModel && model.length === 0) || model.length > 160) {
    throw new ValidationError('AI Provider model 长度必须为 1–160 个字符');
  }
  const requestTimeoutMs = config.requestTimeoutMs;
  if (typeof requestTimeoutMs !== 'number'
    || !Number.isInteger(requestTimeoutMs)
    || requestTimeoutMs < 5_000
    || requestTimeoutMs > 120_000) {
    throw new ValidationError('AI Provider timeout 必须是 5000–120000 毫秒的整数');
  }
  if (config.structuredOutputMode !== 'json-schema' && config.structuredOutputMode !== 'json-object') {
    throw new ValidationError('AI Provider structured output mode 无效');
  }

  return {
    protocol: config.protocol,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    model,
    requestTimeoutMs,
    structuredOutputMode: config.structuredOutputMode,
  };
};
