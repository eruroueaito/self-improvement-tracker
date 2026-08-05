/**
 * 模块名称：Playwright production 产物配置
 * 职责描述：构建真实 dist 并通过 Vite preview 只运行 production 边界验收
 * 输入/输出：启动 4175 端口的 production preview，输出独立测试证据
 * 依赖关系：Playwright Test、Vite build/preview 脚本
 * 注意事项：不得复用开发服务器；本机可通过 PLAYWRIGHT_CHANNEL=msedge 交叉验证
 */
import { defineConfig } from '@playwright/test';

const browserChannel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/production.spec.ts'],
  outputDir: './output/playwright/production-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    ...(browserChannel ? { channel: browserChannel } : {}),
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
});
