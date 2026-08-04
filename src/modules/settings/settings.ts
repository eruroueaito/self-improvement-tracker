/**
 * 模块名称：应用设置
 * 职责描述：定义并校验不含秘密的本地应用设置
 * 输入/输出：接收未知设置对象，返回深度白名单化的 AppSettings
 * 依赖关系：目标模块的通用 ValidationError
 * 注意事项：Provider 凭据和自定义请求头永远不属于本模块
 */
import { ValidationError } from '../goals/validation';

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced' | 'none';
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  ai: {
    enabled: boolean;
    historyEnabled: boolean;
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

export const createDefaultAppSettings = (): AppSettings => ({
  theme: 'system',
  motion: 'system',
  hapticsEnabled: true,
  notificationsEnabled: true,
  ai: {
    enabled: false,
    historyEnabled: false,
  },
});

export const normalizeAppSettings = (value: unknown): AppSettings => {
  const settings = asRecord(value, 'settings');
  assertExactKeys(settings, ['theme', 'motion', 'hapticsEnabled', 'notificationsEnabled', 'ai'], 'settings');
  if (!['system', 'light', 'dark'].includes(String(settings.theme))) {
    throw new ValidationError('settings.theme 无效');
  }
  if (!['system', 'reduced', 'none'].includes(String(settings.motion))) {
    throw new ValidationError('settings.motion 无效');
  }

  const ai = asRecord(settings.ai, 'settings.ai');
  assertExactKeys(ai, ['enabled', 'historyEnabled'], 'settings.ai');

  return {
    theme: settings.theme as AppSettings['theme'],
    motion: settings.motion as AppSettings['motion'],
    hapticsEnabled: asBoolean(settings.hapticsEnabled, 'settings.hapticsEnabled'),
    notificationsEnabled: asBoolean(settings.notificationsEnabled, 'settings.notificationsEnabled'),
    ai: {
      enabled: asBoolean(ai.enabled, 'settings.ai.enabled'),
      historyEnabled: asBoolean(ai.historyEnabled, 'settings.ai.historyEnabled'),
    },
  };
};
