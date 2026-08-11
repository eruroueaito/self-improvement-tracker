/**
 * 模块名称：N2 Goal Catalog 浏览器验收
 * 职责描述：验证紧凑 Catalog、Goal 详情、多 Activity、失败重试与 Roll 修复路径
 * 输入/输出：驱动本机移动视口应用并断言可见视图及 localStorage 事实
 * 依赖关系：Playwright Test、运行中的本地 Vite 应用
 * 注意事项：测试不得访问本机测试源以外的网络，也不得把浏览器结果冒充原生设备证据
 */
import { expect, test } from '@playwright/test';

test('manages multiple Activities and preserves failed form input offline', async ({ page }) => {
  const unexpectedNetworkTargets: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpectedNetworkTargets.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '目标', exact: true }).click();

  await page.getByLabel('目标名称').fill('阅读系统');
  await page.getByLabel('第一个活动').fill('读十页');
  await page.getByRole('button', { name: '保存到本机' }).click({ clickCount: 2 });
  await expect(page.getByRole('heading', { name: '阅读系统' })).toHaveCount(1);
  await expect(page.getByText('1 个可用活动')).toBeVisible();

  await page.getByRole('button', { name: '查看详情' }).click();
  await expect(page.getByRole('heading', { name: '阅读系统' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '读十页' })).toBeVisible();

  await page.getByRole('button', { name: '添加活动' }).click();
  await page.getByLabel('活动名称').fill('整理笔记');
  await page.getByLabel('最短分钟').fill('15');
  await page.getByLabel('最长分钟').fill('25');
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    let failOnce = true;
    Storage.prototype.setItem = function setItem(key: string, value: string): void {
      if (failOnce) {
        failOnce = false;
        throw new Error('injected storage failure');
      }
      originalSetItem.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '保存活动' }).click();
  await expect(page.getByRole('alert')).toContainText('injected storage failure');
  await expect(page.getByLabel('活动名称')).toHaveValue('整理笔记');
  await expect(page.getByRole('heading', { name: '整理笔记' })).toHaveCount(0);
  expect(await page.evaluate(() => {
    const persisted = localStorage.getItem('self-improvement-tracker:v1');
    return persisted ? JSON.parse(persisted).activities.length : -1;
  })).toBe(1);
  await page.getByRole('button', { name: '保存活动' }).click();
  await expect(page.getByRole('heading', { name: '整理笔记' })).toBeVisible();

  const noteCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '整理笔记' }) });
  await noteCard.getByRole('button', { name: '编辑活动' }).click();
  await page.getByLabel('活动名称').fill('整理卡片笔记');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByRole('heading', { name: '整理卡片笔记' })).toBeVisible();

  const readingCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '读十页' }) });
  await readingCard.getByRole('button', { name: '归档活动' }).click();
  const updatedNoteCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '整理卡片笔记' }) });
  await updatedNoteCard.getByRole('button', { name: '归档活动' }).click();
  await expect(page.getByText('这个进行中的目标需要至少一个可用活动。')).toBeVisible();

  await page.getByRole('button', { name: '目标', exact: true }).click();
  await expect(page.getByText('需要活动')).toBeVisible();
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.getByRole('button', { name: '给我三个行动' }).click();
  await expect(page.getByText('当前目标没有可用活动，请先添加或恢复一个活动。')).toBeVisible();

  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByRole('button', { name: '查看详情' }).click();
  await page.getByText('已归档活动（2）').click();
  const archivedReadingCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '读十页' }) });
  await archivedReadingCard.getByRole('button', { name: '编辑活动' }).click();
  await page.getByLabel('活动名称').fill('读十二页');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByRole('heading', { name: '读十二页' })).toBeVisible();
  const archivedNoteCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '整理卡片笔记' }) });
  await archivedNoteCard.getByRole('button', { name: '恢复活动' }).click();
  await expect(page.getByText('这个进行中的目标需要至少一个可用活动。')).toHaveCount(0);

  await page.getByRole('button', { name: '查看此目标的全部历史' }).click();
  await expect(page.getByLabel('筛选目标')).toHaveValue(/.+/);
  await expect(page.getByLabel('筛选目标').locator('option:checked')).toHaveText('阅读系统');
  expect(unexpectedNetworkTargets).toEqual([]);
});

test('installs, clears and reinstalls deterministic development seeds explicitly', async ({ page }) => {
  const unexpectedNetworkTargets: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpectedNetworkTargets.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByText('本地数据与设置', { exact: true }).click();
  await page.getByText('开发种子数据').click();
  await expect(page.getByText('开发种子未安装')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '安装开发种子' }).click();
  await expect(page.getByText('已安装 3 个 Goal 和 6 个 Activity 的开发种子。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '日语学习' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '健身' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '摄影' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清除开发种子' }).click();
  await expect(page.getByRole('heading', { name: '日语学习' })).toHaveCount(0);
  await expect(page.getByText('开发种子未安装')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '安装开发种子' }).click();
  await expect(page.getByRole('heading', { name: '日语学习' })).toBeVisible();
  expect(unexpectedNetworkTargets).toEqual([]);
});
