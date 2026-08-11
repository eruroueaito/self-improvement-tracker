/**
 * 模块名称：Provider 凭据
 * 职责描述：严格校验 endpoint binding、API key 与自定义认证 headers
 * 输入/输出：接收 unknown 值，返回规范化且可安全交给 SecretStore 的独立对象
 * 依赖关系：Zod、Provider 配置 normalizer、通用 ValidationError
 * 注意事项：错误消息不得包含任何秘密值；凭据整体 UTF-8 JSON 不得超过 64 KiB
 */
import { z } from 'zod';
import { ValidationError } from '../goals/validation';
import { normalizeAiProviderSettings } from './providerConfig';

export interface ProviderBinding {
  protocol: 'openai-chat-completions';
  baseUrl: string;
}

export interface ProviderCredentials {
  apiKey: string;
  customHeaders: Record<string, string>;
}

export interface EndpointBoundProviderCredentials extends ProviderCredentials {
  binding: ProviderBinding;
}

const ProviderBindingInputSchema = z.object({
  protocol: z.literal('openai-chat-completions'),
  baseUrl: z.string(),
}).strict();

const ProviderCredentialsInputSchema = z.object({
  apiKey: z.string(),
  customHeaders: z.record(z.string(), z.string()),
}).strict();

const EndpointBoundProviderCredentialsInputSchema = z.object({
  binding: ProviderBindingInputSchema,
  apiKey: z.string(),
  customHeaders: z.record(z.string(), z.string()),
}).strict();

const MAX_API_KEY_LENGTH = 8_192;
const MAX_HEADER_COUNT = 16;
const MAX_HEADER_NAME_LENGTH = 128;
const MAX_HEADER_VALUE_LENGTH = 8_192;
const MAX_CREDENTIAL_BYTES = 64 * 1_024;
const HEADER_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FORBIDDEN_HEADERS = new Set([
  'content-type',
  'content-length',
  'host',
  'origin',
  'cookie',
  'connection',
  'authorization',
  'referer',
  'user-agent',
  'accept-encoding',
  'te',
  'trailer',
  'upgrade',
  'via',
  '__proto__',
  'prototype',
  'constructor',
]);

const parseStrict = <T>(schema: z.ZodType<T>, value: unknown, label: string): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError(`${label}字段或类型无效`);
  return result.data;
};

const asciiLowercase = (value: string): string =>
  value.replace(/[A-Z]/g, (character) => character.toLowerCase());

const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;

const assertCredentialBudget = (value: unknown): void => {
  if (jsonBytes(value) > MAX_CREDENTIAL_BYTES) throw new ValidationError('Provider 凭据超过 64 KiB 上限');
};

const assertNoForbiddenRawHeaderNames = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const customHeaders = (value as Record<string, unknown>).customHeaders;
  if (!customHeaders || typeof customHeaders !== 'object' || Array.isArray(customHeaders)) return;
  const unsafeName = Object.keys(customHeaders).some((name) =>
    FORBIDDEN_HEADERS.has(asciiLowercase(name)));
  if (unsafeName) throw new ValidationError('Provider header 名被禁止');
};

export const normalizeProviderBinding = (value: unknown): ProviderBinding => {
  const binding = parseStrict(ProviderBindingInputSchema, value, 'Provider binding');
  const normalized = normalizeAiProviderSettings({
    protocol: binding.protocol,
    baseUrl: binding.baseUrl,
    model: 'binding-validation',
    requestTimeoutMs: 30_000,
    structuredOutputMode: 'json-schema',
  });
  if (normalized.baseUrl !== binding.baseUrl) {
    throw new ValidationError('Provider binding baseUrl 必须是已规范化值');
  }
  return { protocol: binding.protocol, baseUrl: binding.baseUrl };
};

export const normalizeProviderCredentials = (value: unknown): ProviderCredentials => {
  assertNoForbiddenRawHeaderNames(value);
  const credentials = parseStrict(ProviderCredentialsInputSchema, value, 'Provider credentials');
  if (credentials.apiKey.length > MAX_API_KEY_LENGTH) {
    throw new ValidationError('Provider apiKey 最长为 8192 个字符');
  }

  const entries = Object.entries(credentials.customHeaders);
  if (entries.length > MAX_HEADER_COUNT) throw new ValidationError('Provider custom headers 最多为 16 个');
  const normalizedHeaderNames = new Set<string>();
  const normalizedHeaderEntries: Array<[string, string]> = [];
  for (const [name, headerValue] of entries) {
    if (name.length === 0 || name.length > MAX_HEADER_NAME_LENGTH || !HEADER_TOKEN.test(name)) {
      throw new ValidationError('Provider header 名必须是最长 128 字符的 HTTP token');
    }
    const normalizedName = asciiLowercase(name);
    if (FORBIDDEN_HEADERS.has(normalizedName)
      || normalizedName.startsWith('proxy-')
      || normalizedName.startsWith('sec-')) {
      throw new ValidationError('Provider header 名被禁止');
    }
    if (normalizedHeaderNames.has(normalizedName)) {
      throw new ValidationError('Provider header 名大小写不敏感重复');
    }
    if (headerValue.length > MAX_HEADER_VALUE_LENGTH) {
      throw new ValidationError('Provider header 值最长为 8192 个字符');
    }
    if (/\r|\n/.test(headerValue)) throw new ValidationError('Provider header 值不能包含换行');
    normalizedHeaderNames.add(normalizedName);
    normalizedHeaderEntries.push([normalizedName, headerValue]);
  }

  const normalizedHeaders = Object.fromEntries(normalizedHeaderEntries);
  if (credentials.apiKey.trim().length === 0
    && !Object.values(normalizedHeaders).some((headerValue) => headerValue.length > 0)) {
    throw new ValidationError('Provider 凭据必须包含 API key 或自定义认证信息');
  }
  const normalized = { apiKey: credentials.apiKey, customHeaders: normalizedHeaders };
  assertCredentialBudget(normalized);
  return normalized;
};

export const normalizeEndpointBoundProviderCredentials = (
  value: unknown,
): EndpointBoundProviderCredentials => {
  assertNoForbiddenRawHeaderNames(value);
  const stored = parseStrict(EndpointBoundProviderCredentialsInputSchema, value, 'Endpoint-bound credentials');
  const normalized = {
    binding: normalizeProviderBinding(stored.binding),
    ...normalizeProviderCredentials({ apiKey: stored.apiKey, customHeaders: stored.customHeaders }),
  };
  assertCredentialBudget(normalized);
  return normalized;
};

export const credentialsMatchBinding = (
  credentials: EndpointBoundProviderCredentials,
  expected: ProviderBinding,
): boolean => {
  const normalizedExpected = normalizeProviderBinding(expected);
  return credentials.binding.protocol === normalizedExpected.protocol
    && credentials.binding.baseUrl === normalizedExpected.baseUrl;
};
