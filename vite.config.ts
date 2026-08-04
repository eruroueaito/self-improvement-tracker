/**
 * 模块名称：Vite 构建配置
 * 职责描述：配置 React 开发服务器、生产构建和 Vitest 运行环境
 * 输入/输出：读取项目源文件并输出 dist 静态资源或测试结果
 * 依赖关系：Vite、React 插件、Vitest
 * 注意事项：测试默认使用 jsdom，测试文件与产品源码共置
 */
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
