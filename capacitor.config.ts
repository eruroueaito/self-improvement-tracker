/**
 * 模块名称：Capacitor 原生容器配置
 * 职责描述：定义 Android 应用标识、名称和 Web 构建目录
 * 输入/输出：供 Capacitor CLI 生成与同步原生工程
 * 依赖关系：Capacitor CLI
 * 注意事项：不启用远程服务器，发布包只加载本地 dist 资源
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.selfimprovement.tracker',
  appName: 'Self Improvement Tracker',
  webDir: 'dist',
};

export default config;
