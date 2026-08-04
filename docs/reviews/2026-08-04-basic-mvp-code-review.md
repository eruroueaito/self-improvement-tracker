# Basic MVP 代码审查

日期：2026-08-04
范围：方案 B 基本 MVP 的领域、应用、适配器、React UI、Android 工程与自动化
结论：通过；未发现仍阻塞基本 MVP 的 P0/P1 问题

## 已发现并修复

1. SQLite `execute/run` 默认会各自开启事务，可能破坏 SettlementTransaction 的单事务语义。现已在显式外层事务中把内层 transaction 参数设为 false。
2. Focus 切换 Settlement 时 React 曾用旧 Session 初始化表单，completed 显示 50%。现已在切屏前刷新已持久化快照，Playwright 复验为 100%。
3. 前台 Countdown 到期曾只把显示归零，不触发状态恢复。现由应用壳按 tick 调用同一 recover 状态机并进入结算。
4. 导入曾只检查顶层数组。现校验版本、字段边界、唯一 ID、跨表引用、Session 状态、幂等键与 reversal 对称性，失败时不替换旧快照。
5. 过期 RecommendationRun 可在 Goal 暂停/活动归档后启动，且可重复启动。现启动前重新验证当前事实并限制每次 run 只开始一次。
6. 浏览器 Blob 下载不能证明 Android 可导出。现通过端口区分浏览器下载与 Android Filesystem + Share 系统面板。
7. Capacitor 生成的 Android 仪器测试断言了错误包名。现改为 `dev.selfimprovement.tracker` 并补齐模块注释。
8. Android 默认允许系统备份且声明 INTERNET 权限，与完全本地边界不一致。现关闭备份/明文流量并移除不需要的网络权限。

## Simplify 结果

- 把 500+ 行 `App.tsx` 拆分为 `ui/goals`、`ui/roll`、`ui/focus`、`ui/settlement`、`ui/history` 与 `ui/shared`；应用壳只保留导航、恢复和用例编排。
- 共享宠物/理由展示映射集中到 `ui/shared/presentation.ts`，不复制领域逻辑。
- 未添加事件总线、状态管理框架、DI 框架或推测性抽象。

## 验证证据

- TypeScript：通过
- Vitest：6 files / 14 tests 通过
- Playwright：1 个完整离线闭环测试通过
- Vite production build：通过
- Capacitor Android sync：通过；识别 SQLite、Filesystem、Local Notifications、Share 四个插件
- `npm audit --omit=dev`：0 vulnerabilities
- `git diff --check`：通过

## 已知环境门槛

本机没有完整 Android SDK，Gradle 8.14.3 分发包下载也在两次有限尝试中超时，因此 `assembleDebug` 尚未验证。该门槛不影响源码、Web 构建、Android 工程生成或 `cap sync` 的通过状态，但发布前必须在已安装 Android SDK 36 的环境运行 `android/gradlew assembleDebug`。
