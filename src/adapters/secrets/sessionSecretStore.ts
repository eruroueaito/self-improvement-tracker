/**
 * 模块名称：会话秘密存储
 * 职责描述：在当前 JavaScript adapter 实例的内存 Map 中保存 Provider 凭据
 * 输入/输出：实现 SecretStore；刷新或重建实例后凭据消失
 * 依赖关系：SecretStore 端口、Provider 凭据校验
 * 注意事项：禁止访问任何浏览器持久存储、SQLite、文件或网络
 */
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

const PROVIDER_CREDENTIALS_KEY = 'ai-provider-credentials-v1';

export class SessionSecretStore implements SecretStore {
  private readonly values = new Map<string, unknown>();

  async readProviderCredentials(expected: ProviderBinding): Promise<EndpointBoundProviderCredentials | null> {
    const stored = this.values.get(PROVIDER_CREDENTIALS_KEY);
    if (stored === undefined) return null;
    const credentials = normalizeEndpointBoundProviderCredentials(stored);
    return credentialsMatchBinding(credentials, expected) ? structuredClone(credentials) : null;
  }

  async writeProviderCredentials(binding: ProviderBinding, credentials: ProviderCredentials): Promise<void> {
    const value = {
      binding: normalizeProviderBinding(binding),
      ...normalizeProviderCredentials(credentials),
    };
    this.values.set(PROVIDER_CREDENTIALS_KEY, structuredClone(value));
  }

  async deleteProviderCredentials(): Promise<void> {
    this.values.delete(PROVIDER_CREDENTIALS_KEY);
  }

  async hasProviderCredentials(expected: ProviderBinding): Promise<boolean> {
    return (await this.readProviderCredentials(expected)) !== null;
  }
}
