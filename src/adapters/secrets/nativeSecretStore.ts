/**
 * 模块名称：原生秘密存储
 * 职责描述：用固定 prefix/key 封装 Capacitor Secure Storage，并严格校验 endpoint-bound 凭据
 * 输入/输出：实现 SecretStore；插件或损坏数据只映射为不含秘密的 SecretStoreError
 * 依赖关系：Aparajita Secure Storage、SecretStore 端口、Provider 凭据校验
 * 注意事项：所有操作必须等待同一个 prefix、iCloud sync=false、ThisDeviceOnly 初始化门槛
 */
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { SecretStore } from '../../app/ports';
import {
  credentialsMatchBinding,
  normalizeEndpointBoundProviderCredentials,
  normalizeProviderBinding,
  normalizeProviderCredentials,
  type EndpointBoundProviderCredentials,
  type ProviderBinding,
  type ProviderCredentials,
} from '../../modules/ai/credentials';

const KEY_PREFIX = 'self-improvement-tracker_';
const PROVIDER_CREDENTIALS_KEY = 'ai-provider-credentials-v1';

export interface NativeSecureStoragePlugin {
  setKeyPrefix(value: string): Promise<void>;
  setSynchronize(value: boolean): Promise<void>;
  setDefaultKeychainAccess(value: KeychainAccess): Promise<void>;
  get(key: string, convertDate?: boolean, sync?: boolean): Promise<unknown>;
  set(key: string, value: unknown, convertDate?: boolean, sync?: boolean, access?: KeychainAccess): Promise<void>;
  remove(key: string, sync?: boolean): Promise<boolean>;
}

type SecretStoreOperation = 'initialize' | 'read' | 'write' | 'delete' | 'corrupt';

export class SecretStoreError extends Error {
  constructor(readonly operation: SecretStoreOperation) {
    super(operation === 'corrupt' ? '安全凭据数据无效' : '安全凭据暂时不可用');
    this.name = 'SecretStoreError';
  }
}

export class NativeSecretStore implements SecretStore {
  private initialization: Promise<void> | null = null;

  constructor(
    private readonly plugin: NativeSecureStoragePlugin = SecureStorage as unknown as NativeSecureStoragePlugin,
  ) {}

  private ready(): Promise<void> {
    this.initialization ??= this.initialize();
    return this.initialization;
  }

  private async initialize(): Promise<void> {
    await this.plugin.setKeyPrefix(KEY_PREFIX);
    await this.plugin.setSynchronize(false);
    await this.plugin.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
  }

  private async perform<T>(operation: Exclude<SecretStoreOperation, 'corrupt'>, action: () => Promise<T>): Promise<T> {
    try {
      await this.ready();
      return await action();
    } catch (error) {
      if (error instanceof SecretStoreError) throw error;
      throw new SecretStoreError(operation);
    }
  }

  async readProviderCredentials(expected: ProviderBinding): Promise<EndpointBoundProviderCredentials | null> {
    const raw = await this.perform('read', () => this.plugin.get(PROVIDER_CREDENTIALS_KEY, false, false));
    if (raw === null) return null;
    let credentials: EndpointBoundProviderCredentials;
    try {
      credentials = normalizeEndpointBoundProviderCredentials(raw);
    } catch {
      throw new SecretStoreError('corrupt');
    }
    return credentialsMatchBinding(credentials, expected) ? structuredClone(credentials) : null;
  }

  async writeProviderCredentials(binding: ProviderBinding, credentials: ProviderCredentials): Promise<void> {
    const value = {
      binding: normalizeProviderBinding(binding),
      ...normalizeProviderCredentials(credentials),
    };
    await this.perform('write', () => this.plugin.set(
      PROVIDER_CREDENTIALS_KEY,
      value,
      false,
      false,
      KeychainAccess.whenUnlockedThisDeviceOnly,
    ));
  }

  async deleteProviderCredentials(): Promise<void> {
    await this.perform('delete', async () => {
      await this.plugin.remove(PROVIDER_CREDENTIALS_KEY, false);
    });
  }

  async hasProviderCredentials(expected: ProviderBinding): Promise<boolean> {
    return (await this.readProviderCredentials(expected)) !== null;
  }
}
