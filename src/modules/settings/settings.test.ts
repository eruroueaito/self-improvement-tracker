/**
 * 模块名称：应用设置测试
 * 职责描述：验证设置默认值隔离、枚举边界和秘密字段拒绝规则
 * 输入/输出：构造设置候选并断言规范化结果或校验错误
 * 依赖关系：Vitest、应用设置模块
 * 注意事项：秘密测试只覆盖系统设置范围，不扫描用户自由文本
 */
import { describe, expect, it } from 'vitest';
import { createDefaultAiProviderSettings } from '../ai/providerConfig';
import {
  createDefaultAppSettings,
  createDefaultAppSettingsV2,
  normalizeAppSettings,
  normalizeAppSettingsV2,
} from './settings';

describe('AppSettings', () => {
  it('creates independent secure defaults', () => {
    const first = createDefaultAppSettings();
    const second = createDefaultAppSettings();
    first.ai.enabled = true;
    first.ai.provider.baseUrl = 'https://changed.example/v1';

    expect(second).toEqual({
      theme: 'system',
      motion: 'system',
      hapticsEnabled: true,
      notificationsEnabled: true,
      ai: {
        enabled: false,
        goalDraftEnabled: false,
        historyEnabled: false,
        provider: createDefaultAiProviderSettings(),
      },
    });
  });

  it('normalizes only exact supported fields', () => {
    expect(normalizeAppSettings({
      theme: 'dark',
      motion: 'reduced',
      hapticsEnabled: false,
      notificationsEnabled: false,
      ai: {
        enabled: true,
        goalDraftEnabled: true,
        historyEnabled: false,
        provider: {
          ...createDefaultAiProviderSettings(),
          baseUrl: 'https://provider.example/v1/',
          model: ' model-1 ',
        },
      },
    })).toEqual({
      theme: 'dark',
      motion: 'reduced',
      hapticsEnabled: false,
      notificationsEnabled: false,
      ai: {
        enabled: true,
        goalDraftEnabled: true,
        historyEnabled: false,
        provider: {
          ...createDefaultAiProviderSettings(),
          baseUrl: 'https://provider.example/v1',
          model: 'model-1',
        },
      },
    });
  });

  it('keeps a strict legacy v2 settings decoder for migrations', () => {
    const legacy = createDefaultAppSettingsV2();
    legacy.ai.enabled = true;
    expect(normalizeAppSettingsV2(legacy)).toEqual({
      ...createDefaultAppSettingsV2(),
      ai: { enabled: true, historyEnabled: false },
    });
    expect(() => normalizeAppSettingsV2({ ...legacy, ai: { ...legacy.ai, goalDraftEnabled: false } })).toThrow();
  });

  it.each([
    { theme: 'blue' },
    { token: 'secret-value' },
    { ai: { ...createDefaultAppSettings().ai, apiKey: 'secret-value' } },
    { ai: { enabled: false, historyEnabled: false } },
  ])('rejects invalid or unknown settings: %o', (override) => {
    const value = { ...createDefaultAppSettings(), ...override };
    expect(() => normalizeAppSettings(value)).toThrow();
  });
});
