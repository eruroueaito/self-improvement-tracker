/**
 * 模块名称：Production 产物边界验收
 * 职责描述：验证真实 dist/preview 中开发种子入口不可达且正常操作不生成保留事实
 * 输入/输出：遍历公开导航并断言可访问名称、可见文本和 localStorage 快照
 * 依赖关系：Playwright Test、production 专用配置
 * 注意事项：本文件只能由 playwright.production.config.ts 运行，不得使用 Vite dev server
 */
import { expect, test, type Page } from '@playwright/test';

const expectSeedControlsAbsent = async (page: Page): Promise<void> => {
  await expect(page.getByText('开发种子数据')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '安装开发种子' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '清除开发种子' })).toHaveCount(0);
};

test('production navigation exposes no development seed path or facts', async ({ page }) => {
  const unexpectedNetworkTargets: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpectedNetworkTargets.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expectSeedControlsAbsent(page);

  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByText('本地数据与设置').click();
  await expectSeedControlsAbsent(page);
  await page.getByLabel('目标名称').fill('正式目标');
  await page.getByLabel('第一个活动').fill('正式活动');
  await page.getByRole('button', { name: '保存到本机' }).click();
  await page.getByRole('button', { name: '查看详情' }).click();
  await expectSeedControlsAbsent(page);

  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await expectSeedControlsAbsent(page);
  await page.getByRole('button', { name: '历史', exact: true }).click();
  await expectSeedControlsAbsent(page);

  const persisted = await page.evaluate(() => localStorage.getItem('self-improvement-tracker:v1'));
  expect(persisted).not.toBeNull();
  expect(persisted).not.toContain('dev-seed:');
  expect(unexpectedNetworkTargets).toEqual([]);
});
