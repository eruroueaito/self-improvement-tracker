/**
 * 模块名称：AI Provider 设置组件测试
 * 职责描述：验证非秘密设置、短生命周期凭据、连接测试与历史清理的 UI 边界
 * 输入/输出：模拟表单操作并断言回调、秘密清空和 DOM/可访问文本不泄漏
 * 依赖关系：Testing Library、user-event、Vitest、AiProviderSettings
 * 注意事项：fixture 凭据仅可出现在 password input 的实时 value 属性中
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppSettings } from '../../modules/settings/settings';
import { AiProviderSettings } from './AiProviderSettings';

const setup = () => {
  const callbacks = {
    onSaveSettings: vi.fn(async () => true),
    onSaveCredentials: vi.fn(async () => true),
    onDeleteCredentials: vi.fn(async () => true),
    onTestConnection: vi.fn(async () => ({ ok: true as const })),
    onClearHistory: vi.fn(async () => true),
  };
  const view = render(<AiProviderSettings
    settings={createDefaultAppSettings()}
    busy={false}
    credentialsConfigured={false}
    historyCount={2}
    {...callbacks}
  />);
  return { ...view, callbacks };
};

describe('AiProviderSettings', () => {
  it('saves non-secret Provider settings separately from credentials', async () => {
    const user = userEvent.setup();
    const { callbacks } = setup();
    await user.type(screen.getByLabelText('模型 ID'), 'fixture-model');
    await user.click(screen.getByRole('button', { name: '保存 Provider 设置' }));

    expect(callbacks.onSaveSettings).toHaveBeenCalledWith(expect.objectContaining({
      ai: expect.objectContaining({ provider: expect.objectContaining({ model: 'fixture-model' }) }),
    }));
    expect(callbacks.onSaveCredentials).not.toHaveBeenCalled();
  });

  it('keeps a secret only in the controlled password value and clears it after save', async () => {
    const user = userEvent.setup();
    const { container, callbacks } = setup();
    const secret = 'fixture-secret-value';
    const input = screen.getByLabelText('API 密钥') as HTMLInputElement;
    await user.type(input, secret);

    expect(input.value).toBe(secret);
    expect(screen.queryByText(secret)).toBeNull();
    const attributesContainingSecret = [...container.querySelectorAll('*')].flatMap((element) =>
      [...element.attributes]
        .filter((attribute) => attribute.value.includes(secret))
        .map((attribute) => ({ element, attribute: attribute.name })));
    expect(attributesContainingSecret).toEqual([{ element: input, attribute: 'value' }]);
    await user.click(screen.getByRole('button', { name: '保存或替换凭据' }));
    expect(callbacks.onSaveCredentials).toHaveBeenCalledWith({ apiKey: secret, customHeaders: {} });
    expect(input.value).toBe('');
  });

  it('uses one-time form credentials for a disclosed connection test and clears them afterward', async () => {
    const user = userEvent.setup();
    const { callbacks } = setup();
    const input = screen.getByLabelText('API 密钥') as HTMLInputElement;
    await user.type(input, 'one-time-fixture');
    await user.click(screen.getByRole('button', { name: '测试连接（可能产生费用）' }));

    expect(callbacks.onTestConnection).toHaveBeenCalledWith(expect.objectContaining({
      credentials: { apiKey: 'one-time-fixture', customHeaders: {} },
    }));
    expect(input.value).toBe('');
    expect(screen.getByRole('status').textContent).toContain('连接测试成功');
  });

  it('rejects duplicate custom header rows before object construction can hide them', async () => {
    const user = userEvent.setup();
    const { callbacks } = setup();
    await user.click(screen.getByRole('button', { name: '添加认证 Header' }));
    await user.click(screen.getByRole('button', { name: '添加认证 Header' }));
    const names = screen.getAllByLabelText('Header 名');
    const values = screen.getAllByLabelText('Header 值') as HTMLInputElement[];
    await user.type(names[0]!, 'X-Tenant');
    await user.type(values[0]!, 'first-secret');
    await user.type(names[1]!, 'x-tenant');
    await user.type(values[1]!, 'second-secret');
    await user.click(screen.getByRole('button', { name: '保存或替换凭据' }));

    expect(callbacks.onSaveCredentials).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('重复');
  });

  it('shows history count and clears history without deleting credentials', async () => {
    const user = userEvent.setup();
    const { callbacks } = setup();
    expect(screen.getByText(/2 条/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '清空 AI 历史' }));
    expect(callbacks.onClearHistory).toHaveBeenCalledTimes(1);
    expect(callbacks.onDeleteCredentials).not.toHaveBeenCalled();
  });
});
