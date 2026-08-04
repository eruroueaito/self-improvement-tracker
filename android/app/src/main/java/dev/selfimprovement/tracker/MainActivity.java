/**
 * 模块名称：Android 应用入口
 * 职责描述：承载 Capacitor BridgeActivity 并加载随安装包发布的本地 Web 资源
 * 输入/输出：接收 Android Activity 生命周期事件，输出应用 WebView 容器
 * 依赖关系：Capacitor Android BridgeActivity
 * 注意事项：业务逻辑位于 TypeScript 模块，本入口不添加网络或数据处理逻辑
 */
package dev.selfimprovement.tracker;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
