/**
 * 模块名称：基本 MVP 浏览器闭环测试
 * 职责描述：验证创建、Roll、Flowtime、结算、撤销、重载、导出清空和导入的真实 UI 流程
 * 输入/输出：驱动本机 Edge 页面并断言可见状态和下载数据
 * 依赖关系：Playwright Test、运行中的本地 Vite 应用
 * 注意事项：每次测试清理该上下文的 localStorage，并断言页面没有访问本机测试源之外的网络目标
 */
import { expect, test } from '@playwright/test';

test('offline MVP loop persists and round-trips all local data', async ({ page }) => {
  const unexpectedNetworkTargets: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpectedNetworkTargets.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: '目标' }).click();
  await page.getByLabel('目标名称').fill('阅读');
  await page.getByLabel('第一个活动').fill('读十页');
  await page.getByLabel('重要性').selectOption('4');
  await page.getByLabel('精力消耗').selectOption('2');
  await page.getByRole('button', { name: '保存到本机' }).click();
  await expect(page.getByRole('heading', { name: '阅读' })).toBeVisible();

  await page.getByRole('button', { name: 'Roll' }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: '给我三个行动' }).click();
  await expect(page.getByRole('heading', { name: '读十页' })).toBeVisible();
  await page.getByRole('button', { name: '开始 Flowtime' }).click();
  await page.getByRole('button', { name: '完成' }).click();
  await expect(page.getByText('100%')).toBeVisible();

  await page.getByLabel('实际分钟').fill('25');
  await page.getByLabel('备注').fill('今天状态不错');
  await page.getByRole('button', { name: '确认结算' }).click();
  await expect(page.getByText('结算完成：+21 XP')).toBeVisible();
  await expect(page.getByText('阅读 · 25 分钟 · 完成 100%')).toBeVisible();
  await page.getByRole('button', { name: '撤销结算' }).click();
  await expect(page.getByText('已撤销', { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '历史' }).click();
  await expect(page.getByText('今天状态不错')).toBeVisible();
  await expect(page.getByText('已撤销', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '目标' }).click();
  await page.getByText('本地数据与设置').click();
  await page.getByLabel('主题').selectOption('dark');
  await page.getByLabel('动态效果').selectOption('reduced');
  await page.getByLabel('启用触觉策略').uncheck();
  await page.getByLabel('允许新的倒计时通知').uncheck();
  await page.getByLabel('启用 AI 功能策略（不含 API 密钥）').check();
  await page.getByLabel('允许 AI 使用本地历史策略').check();
  await page.reload();
  await page.getByRole('button', { name: '目标' }).click();
  await page.getByText('本地数据与设置').click();
  await expect(page.getByLabel('主题')).toHaveValue('dark');
  await expect(page.getByLabel('动态效果')).toHaveValue('reduced');
  await expect(page.getByLabel('启用触觉策略')).not.toBeChecked();
  await expect(page.getByLabel('允许新的倒计时通知')).not.toBeChecked();
  await expect(page.getByLabel('启用 AI 功能策略（不含 API 密钥）')).toBeChecked();
  await expect(page.getByLabel('允许 AI 使用本地历史策略')).toBeChecked();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exportContents = Buffer.concat(chunks).toString('utf8');
  const exported = JSON.parse(exportContents);
  expect(exported.format).toBe('self-improvement-tracker');
  expect(exported.version).toBe(2);
  expect(exported.data.settings).toEqual({
    theme: 'dark',
    motion: 'reduced',
    hapticsEnabled: false,
    notificationsEnabled: false,
    ai: { enabled: true, historyEnabled: true },
  });

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空全部本地数据' }).click();
  await expect(page.getByRole('heading', { name: '阅读' })).toHaveCount(0);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportContents),
  });
  await expect(page.getByRole('heading', { name: '确认覆盖本机数据' })).toBeVisible();
  await expect(page.getByText('v2', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '阅读' })).toHaveCount(0);
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByRole('heading', { name: '确认覆盖本机数据' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '阅读' })).toHaveCount(0);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportContents),
  });
  await page.getByRole('button', { name: '确认导入并覆盖' }).click();
  await expect(page.getByRole('heading', { name: '阅读' })).toBeVisible();
  await expect(page.getByText('导入完成，宠物进度已从奖励账本重建。')).toBeVisible();
  expect(unexpectedNetworkTargets).toEqual([]);
});
