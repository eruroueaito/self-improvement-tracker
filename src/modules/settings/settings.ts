/**
 * 模块名称：应用设置
 * 职责描述：定义并校验不含秘密的本地应用设置
 * 输入/输出：接收未知设置对象，返回深度白名单化的 AppSettings
 * 依赖关系：目标模块的通用 ValidationError、AI Provider 配置
 * 注意事项：Provider 凭据和自定义请求头永远不属于本模块
 */
import { ValidationError } from '../goals/validation';
import { createDefaultAiProviderSettings, normalizeAiProviderSettings } from '../ai/providerConfig';
import type { AiProviderSettings } from '../ai/types';

export interface AppSettingsV2 {
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced' | 'none';
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  ai: {
    enabled: boolean;
    historyEnabled: boolean;
  };
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced' | 'none';
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  ai: {
    enabled: boolean;
    goalDraftEnabled: boolean;
    historyEnabled: boolean;
    provider: AiProviderSettings;
  };
}

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown, label: string): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label}必须是对象`);
  }
  return value as RecordValue;
};

const assertExactKeys = (value: RecordValue, expected: readonly string[], label: string): void => {
  const unknown = Object.keys(value).filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0) throw new ValidationError(`${label}包含不受支持的字段：${unknown.join(', ')}`);
  if (missing.length > 0) throw new ValidationError(`${label}缺少字段：${missing.join(', ')}`);
};

const asBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') throw new ValidationError(`${label}必须是布尔值`);
  return value;
};

export const createDefaultAppSettingsV2 = (): AppSettingsV2 => ({
  theme: 'system',
  motion: 'system',
  hapticsEnabled: true,
  notificationsEnabled: true,
  ai: {
    enabled: false,
    historyEnabled: false,
  },
});

export const createDefaultAppSettings = (): AppSettings => ({
  ...createDefaultAppSettingsV2(),
  ai: {
    enabled: false,
    goalDraftEnabled: false,
    historyEnabled: false,
    provider: createDefaultAiProviderSettings(),
  },
});

const normalizeCommonSettings = (value: unknown): { settings: RecordValue; ai: RecordValue } => {
  const settings = asRecord(value, 'settings');
  assertExactKeys(settings, ['theme', 'motion', 'hapticsEnabled', 'notificationsEnabled', 'ai'], 'settings');
  if (!['system', 'light', 'dark'].includes(String(settings.theme))) {
    throw new ValidationError('settings.theme 无效');
  }
  if (!['system', 'reduced', 'none'].includes(String(settings.motion))) {
    throw new ValidationError('settings.motion 无效');
  }

  const ai = asRecord(settings.ai, 'settings.ai');
  return { settings, ai };
};

const normalizedCommonFields = (settings: RecordValue) => ({
  theme: settings.theme as AppSettings['theme'],
  motion: settings.motion as AppSettings['motion'],
  hapticsEnabled: asBoolean(settings.hapticsEnabled, 'settings.hapticsEnabled'),
  notificationsEnabled: asBoolean(settings.notificationsEnabled, 'settings.notificationsEnabled'),
});

export const normalizeAppSettingsV2 = (value: unknown): AppSettingsV2 => {
  const { settings, ai } = normalizeCommonSettings(value);
  assertExactKeys(ai, ['enabled', 'historyEnabled'], 'settings.ai');

  return {
    ...normalizedCommonFields(settings),
    ai: {
      enabled: asBoolean(ai.enabled, 'settings.ai.enabled'),
      historyEnabled: asBoolean(ai.historyEnabled, 'settings.ai.historyEnabled'),
    },
  };
};

export const normalizeAppSettings = (value: unknown): AppSettings => {
  const { settings, ai } = normalizeCommonSettings(value);
  assertExactKeys(ai, ['enabled', 'goalDraftEnabled', 'historyEnabled', 'provider'], 'settings.ai');

  return {
    ...normalizedCommonFields(settings),
    ai: {
      enabled: asBoolean(ai.enabled, 'settings.ai.enabled'),
      goalDraftEnabled: asBoolean(ai.goalDraftEnabled, 'settings.ai.goalDraftEnabled'),
      historyEnabled: asBoolean(ai.historyEnabled, 'settings.ai.historyEnabled'),
      provider: normalizeAiProviderSettings(ai.provider, { allowEmptyModel: true }),
    },
  };
};
