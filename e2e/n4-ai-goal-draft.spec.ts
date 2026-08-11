/**
 * 模块名称：N4 AI GoalDraft 浏览器验收
 * 职责描述：用 route fixture 验证显式配置、单次外发、临时编辑、原子确认与秘密不持久化
 * 输入/输出：拦截唯一 Chat Completions POST，断言请求白名单和最终本地 Goal/Activities
 * 依赖关系：Playwright、开发 Vite 应用
 * 注意事项：bypassCSP 仅用于 W6 fixture；W7 会按批准网络边界更新真实 production CSP/manifest
 */
import { expect, test } from '@playwright/test';

test.use({ bypassCSP: true });

const generatedDraft = {
  schemaVersion: 'goal-draft-v1',
  title: '模型阅读计划',
  description: '从短时间开始。',
  feedbackModel: { type: 'cumulative', unit: 'minutes' },
  importanceSuggestion: 3,
  desiredCadenceDays: 1,
  minimumRestHours: 0,
  defaultEnergyCost: 2,
  suggestedActivities: [
    { title: '读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 20, energyCost: 2, contexts: ['home'], minimumRestHours: null, suggestedCadenceDays: 1 },
    { title: '整理笔记', description: '', minimumMinutes: 5, maximumMinutes: 15, energyCost: 2, contexts: [], minimumRestHours: null, suggestedCadenceDays: 1 },
  ],
  clarificationNeeded: false,
  clarificationQuestions: [],
};

test('configures one endpoint, generates an editable draft, and atomically confirms without persisting secrets', async ({ page }) => {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  await page.route('https://provider.invalid/v1/chat/completions', async (route) => {
    const request = route.request();
    requests.push({ headers: request.headers(), body: request.postDataJSON() as Record<string, unknown> });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(generatedDraft), refusal: null } }],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByText('本地数据与设置', { exact: true }).click();
  const settings = page.locator('.settings');
  await settings.getByLabel('启用 AI 功能策略（不含 API 密钥）').check();
  await expect(settings.getByLabel('启用 AI 功能策略（不含 API 密钥）')).toBeChecked();
  await settings.getByLabel('允许主动生成 GoalDraft').check();
  await expect(settings.getByLabel('允许主动生成 GoalDraft')).toBeChecked();
  await settings.getByLabel('Base URL').fill('https://provider.invalid/v1');
  await settings.getByLabel('模型 ID').fill('fixture-model');
  await settings.getByRole('button', { name: '保存 Provider 设置' }).click();
  await expect(settings.getByText('Provider 设置已保存')).toBeVisible();

  await settings.getByLabel('API 密钥', { exact: true }).fill('fixture-key-not-real');
  await settings.getByRole('button', { name: '保存或替换凭据' }).click();
  await expect(settings.getByText('凭据已安全保存，不会回显')).toBeVisible();
  await expect(settings.getByLabel('API 密钥', { exact: true })).toHaveValue('');

  const panel = page.locator('.ai-goal-draft');
  await expect(panel).toBeVisible();
  await panel.getByLabel('用自然语言描述目标').fill('我想建立阅读习惯');
  await panel.getByRole('button', { name: '生成可编辑草稿' }).click();
  await expect(panel.getByLabel('草稿目标名称')).toHaveValue('模型阅读计划');
  await panel.getByLabel('草稿目标名称').fill('确认后的阅读计划');
  await panel.getByRole('button', { name: '确认并保存到本机' }).click();

  await expect(page.getByRole('heading', { name: '确认后的阅读计划' })).toBeVisible();
  await expect(page.getByText('2 个可用活动')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(Object.keys(requests[0]!.body).sort()).toEqual(['messages', 'model', 'response_format', 'store']);
  expect(requests[0]!.headers.authorization).toBe('Bearer fixture-key-not-real');
  const persisted = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(persisted).not.toContain('fixture-key-not-real');
  expect(persisted).not.toContain('我想建立阅读习惯');
});
