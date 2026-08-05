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

const trackUnexpectedNetwork = (page: Page): string[] => {
  const unexpected: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) unexpected.push(request.url());
  });
  return unexpected;
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

test('production companion matrix has real 3x4 computed-style differences', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);

  await page.goto('/?companion-matrix=1');
  const cards = page.locator('.companion-matrix-card');
  await expect(cards).toHaveCount(12);
  await expect(page.getByRole('img')).toHaveCount(12);
  const styles = await cards.evaluateAll((elements) => elements.map((card) => {
    const style = (selector: string) => getComputedStyle(card.querySelector(selector)!);
    return {
      stage: card.getAttribute('data-stage'),
      mood: card.getAttribute('data-mood'),
      bodyHeight: style('.companion-body').height,
      bodyTransform: style('.companion-body').transform,
      rightLeafOpacity: style('.leaf-right').opacity,
      centerLeafOpacity: style('.leaf-center').opacity,
      eyeHeight: style('.companion-eyes i').height,
      eyeAnimation: style('.companion-eyes i').animationName,
      starOpacity: style('.companion-stars').opacity,
      starAnimation: style('.companion-stars').animationName,
      sleepOpacity: style('.companion-sleep-z').opacity,
    };
  }));

  expect(new Set(styles.filter((state) => state.mood === 'idle').map((state) => state.bodyHeight)).size).toBe(3);
  expect(styles.find((state) => state.stage === 'seed' && state.mood === 'idle')).toMatchObject({ rightLeafOpacity: '0', centerLeafOpacity: '0' });
  expect(styles.find((state) => state.stage === 'sprout' && state.mood === 'idle')).toMatchObject({ rightLeafOpacity: '1', centerLeafOpacity: '0' });
  expect(styles.find((state) => state.stage === 'companion' && state.mood === 'idle')).toMatchObject({ rightLeafOpacity: '1', centerLeafOpacity: '1' });
  for (const stage of ['seed', 'sprout', 'companion']) {
    const idle = styles.find((state) => state.stage === stage && state.mood === 'idle')!;
    const working = styles.find((state) => state.stage === stage && state.mood === 'working')!;
    const celebrating = styles.find((state) => state.stage === stage && state.mood === 'celebrating')!;
    const sleeping = styles.find((state) => state.stage === stage && state.mood === 'sleeping')!;
    expect(working.bodyTransform).not.toBe(idle.bodyTransform);
    expect(working.eyeHeight).not.toBe(idle.eyeHeight);
    expect(idle.eyeAnimation).toBe('companion-blink');
    expect(Number(celebrating.starOpacity)).toBeGreaterThan(0);
    expect(celebrating.starAnimation).toBe('companion-star-pop');
    expect(idle.starOpacity).toBe('0');
    expect(sleeping.sleepOpacity).toBe('1');
    expect(idle.sleepOpacity).toBe('0');
  }
  expect(await page.evaluate(() => localStorage.getItem('self-improvement-tracker:v1'))).toBeNull();
  expect(unexpectedNetworkTargets).toEqual([]);
});

test('production companion matrix disables every animation through all reduced-motion paths', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);
  const assertStaticMatrix = async (): Promise<void> => {
    await expect(page.getByRole('img')).toHaveCount(12);
    const animations = await page.locator('.companion-avatar [data-part], .companion-avatar [data-part] *').evaluateAll((elements) =>
      elements.map((element) => ({ name: getComputedStyle(element).animationName, duration: getComputedStyle(element).animationDuration })),
    );
    expect(animations.every((animation) => animation.name === 'none' && animation.duration === '0s')).toBe(true);
    const pseudoAnimations = await page.locator('.companion-avatar [data-part]').evaluateAll((elements) =>
      elements.flatMap((element) => ['::before', '::after'].map((pseudo) => ({
        name: getComputedStyle(element, pseudo).animationName,
        duration: getComputedStyle(element, pseudo).animationDuration,
      }))),
    );
    expect(pseudoAnimations.every((animation) => animation.name === 'none' && animation.duration === '0s')).toBe(true);
    await expect(page.getByRole('img', { name: /刚刚完成/ })).toHaveCount(3);
  };

  await page.goto('/?companion-matrix=1&motion=reduced');
  await expect(page.locator('.companion-matrix-page')).toHaveAttribute('data-motion', 'reduced');
  await assertStaticMatrix();
  await page.goto('/?companion-matrix=1&motion=none');
  await expect(page.locator('.companion-matrix-page')).toHaveAttribute('data-motion', 'none');
  await assertStaticMatrix();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?companion-matrix=1&motion=system');
  await expect(page.locator('.companion-matrix-page')).toHaveAttribute('data-motion', 'system');
  await assertStaticMatrix();
  expect(unexpectedNetworkTargets).toEqual([]);
});

test('production mobile Roll remains inside 320x640 and clickable above decoration', async ({ page }) => {
  const unexpectedNetworkTargets = trackUnexpectedNetwork(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const rollButton = page.getByRole('button', { name: 'Roll', exact: true });
  const box = await rollButton.boundingBox();
  expect(box).not.toBeNull();
  expect(await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.textContent;
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 })).toContain('Roll');
  await rollButton.click();
  await expect(page.getByRole('heading', { name: '给现在一个合适的动作' })).toBeVisible();
  expect(await page.locator('.companion-avatar').first().evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
  expect(unexpectedNetworkTargets).toEqual([]);
});
