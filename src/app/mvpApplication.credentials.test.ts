/**
 * 模块名称：应用凭据门面测试
 * 职责描述：验证 UI 只能按当前规范 endpoint 保存、检查和删除秘密，不能自行指定 binding
 * 输入/输出：驱动 MvpApplication 设置与凭据命令，断言 endpoint 变更立即失配
 * 依赖关系：Vitest、MemoryStore、SessionSecretStore、MvpApplication
 * 注意事项：应用快照、导出和设置更新均不得包含凭据值
 */
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../adapters/memory/memoryStore';
import { SessionSecretStore } from '../adapters/secrets/sessionSecretStore';
import type { Clock, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

const clock: Clock = { now: () => 1_000 };
const ids: IdGenerator = { next: () => 'unused-id' };
const notifications: NotificationPort = { async scheduleCountdown() {}, async cancelCountdown() {} };
const exportFiles: ExportFilePort = { async save() {} };

describe('MvpApplication provider credentials', () => {
  it('binds credentials to the current provider endpoint and never includes them in export', async () => {
    const secrets = new SessionSecretStore();
    const app = new MvpApplication(new MemoryStore(), clock, ids, notifications, exportFiles, secrets);
    await app.initialize();

    await app.saveProviderCredentials({ apiKey: 'secret-value', customHeaders: {} });
    expect(await app.hasProviderCredentials()).toBe(true);
    expect(app.exportData()).not.toContain('secret-value');

    const settings = app.getSnapshot().settings;
    settings.ai.provider.baseUrl = 'https://other.example/v1';
    await app.updateSettings(settings);
    expect(await app.hasProviderCredentials()).toBe(false);

    await app.deleteProviderCredentials();
    settings.ai.provider.baseUrl = 'https://api.openai.com/v1';
    await app.updateSettings(settings);
    expect(await app.hasProviderCredentials()).toBe(false);
  });
});
