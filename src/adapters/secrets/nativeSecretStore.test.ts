/**
 * 模块名称：原生秘密存储测试
 * 职责描述：验证共享初始化门槛、固定 key、binding 校验和错误脱敏
 * 输入/输出：向 fake plugin 并发发起操作，断言调用顺序与 SecretStoreError
 * 依赖关系：Vitest、NativeSecretStore、插件窄接口
 * 注意事项：fake 不证明 Android Keystore，只证明 wrapper 契约
 */
import { describe, expect, it } from 'vitest';
import { KeychainAccess } from '@aparajita/capacitor-secure-storage';
import { NativeSecretStore, SecretStoreError, type NativeSecureStoragePlugin } from './nativeSecretStore';

const binding = { protocol: 'openai-chat-completions' as const, baseUrl: 'https://provider.example/v1' };

class FakeSecureStorage implements NativeSecureStoragePlugin {
  readonly operations: string[] = [];
  value: unknown = null;
  failWith: Error | null = null;

  private check(): void { if (this.failWith) throw this.failWith; }
  async setKeyPrefix(value: string): Promise<void> { this.operations.push(`prefix:${value}`); this.check(); }
  async setSynchronize(value: boolean): Promise<void> { this.operations.push(`sync:${value}`); this.check(); }
  async setDefaultKeychainAccess(value: KeychainAccess): Promise<void> { this.operations.push(`access:${value}`); this.check(); }
  async get(key: string): Promise<unknown> { this.operations.push(`get:${key}`); this.check(); return structuredClone(this.value); }
  async set(key: string, value: unknown): Promise<void> { this.operations.push(`set:${key}`); this.check(); this.value = structuredClone(value); }
  async remove(key: string): Promise<boolean> { this.operations.push(`remove:${key}`); this.check(); this.value = null; return true; }
}

describe('NativeSecretStore', () => {
  it('initializes exactly once before concurrent read/write/delete operations', async () => {
    const plugin = new FakeSecureStorage();
    const store = new NativeSecretStore(plugin);

    await Promise.all([
      store.readProviderCredentials(binding),
      store.writeProviderCredentials(binding, { apiKey: 'secret-key', customHeaders: {} }),
      store.deleteProviderCredentials(),
    ]);

    expect(plugin.operations.slice(0, 3)).toEqual([
      'prefix:self-improvement-tracker_',
      'sync:false',
      `access:${KeychainAccess.whenUnlockedThisDeviceOnly}`,
    ]);
    expect(plugin.operations.filter((item) => item.startsWith('prefix:'))).toHaveLength(1);
    expect(plugin.operations.slice(3).every((item) => /^(get|set|remove):ai-provider-credentials-v1$/.test(item))).toBe(true);
  });

  it('returns a stored value only when its strict binding matches', async () => {
    const plugin = new FakeSecureStorage();
    const store = new NativeSecretStore(plugin);
    await store.writeProviderCredentials(binding, { apiKey: 'secret-key', customHeaders: { 'X-Key': 'value' } });

    expect(await store.hasProviderCredentials(binding)).toBe(true);
    expect(await store.readProviderCredentials({ ...binding, baseUrl: 'https://other.example/v1' })).toBeNull();
    expect(plugin.operations.some((item) => item.startsWith('keys:'))).toBe(false);
  });

  it('maps corrupt storage and plugin failures to errors without secret content', async () => {
    const plugin = new FakeSecureStorage();
    const store = new NativeSecretStore(plugin);
    plugin.value = { binding, apiKey: 'secret-value', customHeaders: {}, unexpected: true };

    await expect(store.readProviderCredentials(binding)).rejects.toBeInstanceOf(SecretStoreError);
    await expect(store.readProviderCredentials(binding)).rejects.not.toThrow(/secret-value|unexpected/);

    const initializationCount = plugin.operations.filter((item) => item.startsWith('prefix:')).length;
    plugin.failWith = new Error('native leaked secret-value');
    const failed = new NativeSecretStore(plugin);
    await expect(failed.deleteProviderCredentials()).rejects.toMatchObject({ name: 'SecretStoreError' });
    await expect(failed.deleteProviderCredentials()).rejects.not.toThrow(/native leaked|secret-value/);
    expect(plugin.operations.filter((item) => item.startsWith('prefix:'))).toHaveLength(initializationCount + 1);
  });
});
