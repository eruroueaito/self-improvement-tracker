/**
 * 模块名称：会话秘密存储测试
 * 职责描述：验证浏览器 adapter 只在实例内存保存 endpoint-bound 凭据
 * 输入/输出：执行 write/read/has/delete，断言匹配与独立副本语义
 * 依赖关系：Vitest、SessionSecretStore
 * 注意事项：不得访问 localStorage、sessionStorage、IndexedDB、SQLite 或文件
 */
import { describe, expect, it, vi } from 'vitest';
import { SessionSecretStore } from './sessionSecretStore';

const binding = { protocol: 'openai-chat-completions' as const, baseUrl: 'https://provider.example/v1' };

describe('SessionSecretStore', () => {
  it('returns credentials only for the exact endpoint binding and deletes explicitly', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const store = new SessionSecretStore();
    const credentials = { apiKey: 'secret-key', customHeaders: { 'X-API-Key': 'header-secret' } };

    await store.writeProviderCredentials(binding, credentials);
    credentials.apiKey = 'mutated';
    expect(await store.hasProviderCredentials(binding)).toBe(true);
    expect(await store.readProviderCredentials(binding)).toEqual({
      binding,
      apiKey: 'secret-key',
      customHeaders: { 'x-api-key': 'header-secret' },
    });
    expect(await store.readProviderCredentials({ ...binding, baseUrl: 'https://other.example/v1' })).toBeNull();

    await store.deleteProviderCredentials();
    expect(await store.hasProviderCredentials(binding)).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });

  it('does not share secrets across adapter instances', async () => {
    const first = new SessionSecretStore();
    await first.writeProviderCredentials(binding, { apiKey: 'secret-key', customHeaders: {} });

    expect(await new SessionSecretStore().readProviderCredentials(binding)).toBeNull();
  });
});
