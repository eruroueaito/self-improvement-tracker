/**
 * 模块名称：N2 四反馈浏览器验收
 * 职责描述：逐一验证 progress、累计次数、累计分钟和 experience 在结算与撤销后的详情值
 * 输入/输出：每种反馈使用隔离浏览器上下文完成本地创建、Roll、结算、详情和撤销闭环
 * 依赖关系：Playwright Test、运行中的 Vite 开发应用
 * 注意事项：四种事实语义必须独立验收，每条测试都断言没有本机测试源以外的请求
 */
import { expect, test, type Page } from '@playwright/test';

interface FeedbackScenario {
  name: string;
  option: 'times' | 'minutes' | 'progress' | 'experience';
  actualMinutes: string;
  quantity?: string;
  settledText: string;
  undoneText: string;
}

const scenarios: FeedbackScenario[] = [
  { name: '累计次数', option: 'times', actualMinutes: '10', settledText: '1 次', undoneText: '0 次' },
  { name: '累计分钟', option: 'minutes', actualMinutes: '12', settledText: '12 分钟', undoneText: '0 分钟' },
  { name: '数值进度', option: 'progress', actualMinutes: '10', quantity: '20', settledText: '30 / 50 页', undoneText: '10 / 50 页' },
  { name: '经验值', option: 'experience', actualMinutes: '25', settledText: '21 XP · Lv.1', undoneText: '0 XP · Lv.1' },
];

const openGoalDetail = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByRole('button', { name: '查看详情' }).click();
};

const verifyFeedbackLifecycle = async (page: Page, scenario: FeedbackScenario): Promise<void> => {
  const unexpectedNetworkTargets: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpectedNetworkTargets.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByLabel('目标名称').fill(`${scenario.name}目标`);
  await page.getByLabel('第一个活动').fill(`${scenario.name}活动`);
  await page.getByText('高级设置').click();
  await page.getByLabel('反馈方式').selectOption(scenario.option);
  if (scenario.option === 'progress') {
    await page.getByLabel('当前起点').fill('10');
    await page.getByLabel('目标值').fill('50');
    await page.getByLabel('单位').fill('页');
  }
  await page.getByRole('button', { name: '保存到本机' }).click();
  await expect(page.getByRole('heading', { name: `${scenario.name}目标` })).toBeVisible();

  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.getByRole('button', { name: '给我三个行动' }).click();
  await page.getByRole('button', { name: '开始 Flowtime' }).click();
  await page.getByRole('button', { name: '完成' }).click();
  await page.getByLabel('实际分钟').fill(scenario.actualMinutes);
  if (scenario.quantity) await page.getByLabel('完成数量（页）').fill(scenario.quantity);
  await page.getByRole('button', { name: '确认结算' }).click();

  await openGoalDetail(page);
  await expect(page.getByRole('heading', { name: scenario.settledText })).toBeVisible();
  await page.getByRole('button', { name: '查看此目标的全部历史' }).click();
  await page.getByRole('button', { name: '撤销结算' }).click();
  await openGoalDetail(page);
  await expect(page.getByRole('heading', { name: scenario.undoneText })).toBeVisible();
  expect(unexpectedNetworkTargets).toEqual([]);
};

for (const scenario of scenarios) {
  test(`${scenario.name} detail follows settlement and undo facts`, async ({ page }) => {
    await verifyFeedbackLifecycle(page, scenario);
  });
}
