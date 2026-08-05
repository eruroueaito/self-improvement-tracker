/**
 * 模块名称：N3 伙伴浏览器闭环验收
 * 职责描述：验证真实结算心情、即时撤销、历史峰值解锁和本地 motion 设置
 * 输入/输出：驱动 Vite 开发应用并断言 UI/持久事实/网络边界
 * 依赖关系：Playwright Test、本地应用
 * 注意事项：时间状态只等待最长 2 秒，不通过修改产品 selector 伪造结果
 */
import { expect, test, type Page } from '@playwright/test';

const trackUnexpectedNetwork = (page: Page): string[] => {
  const unexpected: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpected.push(request.url());
  });
  return unexpected;
};

test('celebrates a zero-XP completion without blocking navigation and undo cancels it', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByLabel('目标名称').fill('一分钟也算行动');
  await page.getByLabel('第一个活动').fill('站起来伸展');
  await page.getByLabel('最短分钟').fill('1');
  await page.getByLabel('最长分钟').fill('1');
  await page.getByRole('button', { name: '保存到本机' }).click();
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.getByRole('button', { name: '给我三个行动' }).click();
  await page.getByRole('button', { name: '开始 Flowtime' }).click();
  await expect(page.getByRole('img', { name: /正在专注/ })).toBeVisible();
  await page.getByRole('button', { name: '完成' }).click();
  await page.getByLabel('实际分钟').fill('1');
  await page.getByRole('button', { name: '确认结算' }).click();

  await expect(page.getByText('结算完成：+0 XP')).toBeVisible();
  await expect(page.getByRole('img', { name: /刚刚完成/ })).toBeVisible();
  await page.getByRole('button', { name: '撤销结算' }).click();
  await expect(page.getByRole('img', { name: /刚刚完成/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await expect(page.getByRole('heading', { name: '给现在一个合适的动作' })).toBeVisible();
  expect(unexpectedNetworkTargets).toEqual([]);
});

test('rebuilds peak stage and room unlocks while reduced and none motion stay static', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('self-improvement-tracker:v1', JSON.stringify({
      schemaVersion: 2,
      goals: [{ id: 'goal', title: '历史目标', description: '', status: 'active', importance: 3, feedback: { type: 'experience' }, desiredCadenceDays: null, minimumRestHours: 0, defaultEnergyCost: 3, createdAt: 1, updatedAt: 1 }],
      activities: [{ id: 'activity', goalId: 'goal', title: '历史活动', description: '', minimumMinutes: 1, maximumMinutes: 30, energyCost: 3, contexts: [], minimumRestHours: null, suggestedCadenceDays: null, rewardWeight: 1, createdAt: 1, archivedAt: null }],
      recommendationRuns: [],
      sessions: [{ id: 'session', goalId: 'goal', activityTemplateId: 'activity', recommendationRunId: null, timerMode: 'flowtime', status: 'voided', plannedMinutes: null, startedAt: 1, runningSince: null, accumulatedMs: 60_000, targetDurationMs: null, lastHeartbeatAt: 1, endedAt: 1, endType: 'completed', settlement: { actualMinutes: 1, completionRatio: 1, difficulty: null, effort: null, quantity: null, quantityUnit: null, userNote: '' }, createdAt: 1, settledAt: 1 }],
      rewardEntries: [
        { id: 'settlement', sessionId: 'session', goalId: 'goal', entryType: 'settlement', globalXpDelta: 310, goalXpDelta: 310, ruleVersion: 1, idempotencyKey: 'settle', reversalOfEntryId: null, createdAt: 1 },
        { id: 'reversal', sessionId: 'session', goalId: 'goal', entryType: 'reversal', globalXpDelta: -310, goalXpDelta: -310, ruleVersion: 1, idempotencyKey: 'reverse', reversalOfEntryId: 'settlement', createdAt: 2 },
      ],
      companionProjection: { globalXp: 999, level: 99, evolutionStage: 'seed', mood: 'celebrating', lastUpdatedAt: 1 },
      settings: { theme: 'system', motion: 'reduced', hapticsEnabled: true, notificationsEnabled: true, ai: { enabled: false, historyEnabled: false } },
    }));
  });
  await page.reload();

  await expect(page.getByText('Lv.7')).toBeVisible();
  await expect(page.getByText('0 XP')).toBeVisible();
  await expect(page.getByRole('img', { name: /成长伙伴/ })).toHaveCount(2);
  for (const label of ['桌边小书', '窗边小植株', '照片挂绳']) await expect(page.getByText(label)).toBeAttached();
  expect(await page.locator('.companion-avatar.motion-reduced .companion-eyes i').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');

  await page.getByRole('button', { name: '目标', exact: true }).click();
  await page.getByText('本地数据与设置').click();
  await page.getByLabel('动态效果').selectOption('none');
  await expect(page.getByText('设置已保存在本机。')).toBeVisible();
  await page.reload();
  expect(await page.locator('.companion-avatar.motion-none .companion-eyes i').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByText('Lv.7')).toBeVisible();
  expect(unexpectedNetworkTargets).toEqual([]);
});

test('one-shot UI timer leaves celebration after two seconds without polling', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);
  await page.goto('/');
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('self-improvement-tracker:v1', JSON.stringify({
      schemaVersion: 2,
      goals: [{ id: 'goal', title: '短庆祝目标', description: '', status: 'active', importance: 3, feedback: { type: 'experience' }, desiredCadenceDays: null, minimumRestHours: 0, defaultEnergyCost: 3, createdAt: now, updatedAt: now }],
      activities: [{ id: 'activity', goalId: 'goal', title: '短庆祝活动', description: '', minimumMinutes: 1, maximumMinutes: 30, energyCost: 3, contexts: [], minimumRestHours: null, suggestedCadenceDays: null, rewardWeight: 1, createdAt: now, archivedAt: null }],
      recommendationRuns: [],
      sessions: [{ id: 'session', goalId: 'goal', activityTemplateId: 'activity', recommendationRunId: null, timerMode: 'flowtime', status: 'settled', plannedMinutes: null, startedAt: now, runningSince: null, accumulatedMs: 60_000, targetDurationMs: null, lastHeartbeatAt: now, endedAt: now, endType: 'completed', settlement: { actualMinutes: 1, completionRatio: 1, difficulty: null, effort: null, quantity: null, quantityUnit: null, userNote: '' }, createdAt: now, settledAt: now }],
      rewardEntries: [{ id: 'settlement', sessionId: 'session', goalId: 'goal', entryType: 'settlement', globalXpDelta: 0, goalXpDelta: 0, ruleVersion: 1, idempotencyKey: 'settle', reversalOfEntryId: null, createdAt: now }],
      companionProjection: { globalXp: 0, level: 1, evolutionStage: 'seed', mood: 'idle', lastUpdatedAt: now },
      settings: { theme: 'system', motion: 'none', hapticsEnabled: true, notificationsEnabled: true, ai: { enabled: false, historyEnabled: false } },
    }));
  });
  await page.reload();

  await expect(page.getByRole('img', { name: /刚刚完成/ })).toHaveCount(2);
  await expect(page.getByRole('img', { name: /刚刚完成/ })).toHaveCount(0, { timeout: 4_000 });
  await expect(page.getByRole('img', { name: /安静陪伴|安静休息/ })).toHaveCount(2);
  expect(unexpectedNetworkTargets).toEqual([]);
});
