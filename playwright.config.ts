/**
 * 模块名称：Playwright 端到端配置
 * 职责描述：以本机 Edge 和移动视口运行离线 MVP 浏览器闭环
 * 输入/输出：启动独立 Vite 服务并把测试产物写入 output/playwright
 * 依赖关系：Playwright Test、Vite 开发脚本
 * 注意事项：测试不下载 Chrome，也不访问外部网络
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './output/playwright/test-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'msedge',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
});
