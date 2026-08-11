# 项目一页理解

Self Improvement Tracker 是一个完全开源、local-first 的移动行动助手：用户把长期目标拆成可执行活动，应用只根据本机结构化事实完成 Roll、计时、结算、奖励和温和反馈。基础版本没有账户、云同步、分析、广告或自动 AI 请求；Android 通过 Capacitor 包装同一套 TypeScript 领域和 React 界面。

最简单的心智模型是：`AppSnapshot` 保存所有事实，`MvpApplication` 是唯一写入口，领域模块负责确定性规则，React 页面只显示快照并转发命令，SQLite/localStorage 适配器负责平台存储。N2 要把当前“一项目标 + 一条首活动”的管理表单升级为长期可用的 Goal Catalog，而不改变 local-first、无后端和单一事实来源边界。

对当前开发最重要的结论：`Goal` 与 `ActivityTemplate` 已经是一对多数据结构，N2 不需要 schema v3；需要拆开的，是 `MvpApplication.updateGoal` 和 `GoalsScreen` 中把 Goal 与第一条 active Activity 捆绑编辑的交互。

# 技术栈翻译

| 范围 | 检测到的工具 | 含义 | 证据 |
| --- | --- | --- | --- |
| 前端 | React 19 + TypeScript | 生成可见页面和受控表单；UI 不直接写数据库 | `package.json`, `src/main.tsx`, `src/ui/app/App.tsx` |
| 后端 | 无 | 没有远程服务器；应用命令在设备内执行 | `package.json`, `README.md`, `docs/adr/0001-local-first-modular-monolith.md` |
| 数据 | SQLite / localStorage + versioned `AppSnapshot` | Android 使用 SQLite，浏览器开发壳使用 localStorage；两者遵循同一原子 replace 合约 | `src/app/composition.ts`, `src/app/ports.ts`, `src/app/snapshots.ts` |
| 构建 | Vite + Capacitor + Gradle | Vite 生成 Web 资源，Capacitor 同步到 Android 壳，Gradle 组装 APK | `package.json`, `capacitor.config.ts`, `android/` |
| 测试 | Vitest + Playwright + Android CI/smoke runner | 分别覆盖纯规则、应用契约、浏览器闭环和原生设备证据 | `package.json`, `src/**/*.test.ts`, `e2e/mvp.spec.ts`, `scripts/run-android-smoke.ps1` |

# 代码地图

| 层级 | 路径 | 职责 | 何时先读 |
| --- | --- | --- | --- |
| UI | `src/ui/goals/GoalsScreen.tsx` | 当前 Goal Catalog、Goal/首活动联合表单、导入导出与设置 | 设计 N2 页面拆分时首先检查 |
| 路由/视图 | `src/ui/app/App.tsx` | 用本地 `Screen` 状态切换 Goals/Roll/Focus/Settlement/History，并连接应用命令 | 增加 Goal 详情选择和返回导航时 |
| 业务逻辑 | `src/app/mvpApplication.ts` | 唯一写入门面；校验、构造事实并原子提交快照 | 增加独立 Activity 命令时首先修改 |
| 派生读取 | `src/app/selectors.ts` | 从 Session/RewardLedger 派生三种 Goal 反馈 | 做反馈进度条与最近活动时扩展 |
| 领域规则 | `src/modules/goals/`, `src/modules/recommendations/` | 定义 Goal/Activity 类型、校验和确定性 Roll | 修改活动边界或空候选原因时 |
| 数据 | `src/app/snapshots.ts`, `src/adapters/` | 定义版本化事实集合和平台存储实现 | 判断是否需要迁移或平台适配时 |
| 配置 | `package.json`, `vite.config.ts`, `capacitor.config.ts`, `android/` | 固定工具链、Web 构建与 Android 容器 | 构建、同步和原生验证时 |
| 测试 | `src/app/mvpApplication.test.ts`, `src/modules/**.test.ts`, `e2e/mvp.spec.ts` | 覆盖离线闭环、领域边界和真实 UI 流程 | 每个 N2 工作包完成后同步扩展 |

# 执行路径

```text
用户创建目标 -> src/main.tsx -> App -> GoalsScreen -> MvpApplication.createGoal -> normalizeGoalDraft/normalizeActivityDraft -> DataStore.replace -> Goal 与首个 Activity 同时持久化
```

```text
用户发起 Roll -> RollScreen -> App -> MvpApplication.roll -> runRollEngine -> 过滤 active Goal 与未归档 Activity -> 保存 RecommendationRun -> 显示最多 3 个候选
```

```text
Goal 反馈显示 -> GoalsScreen -> selectGoalFeedback -> 读取 Session/RewardLedgerEntry -> 派生 progress/cumulative/experience -> 只读展示，不新增事实
```

依赖图说明：`src/modules/goals/types.ts` 被应用、导入校验、Roll、结算和 Goals UI 广泛依赖，因此应避免为 N2 改动持久字段；`src/app/mvpApplication.ts` 的反向依赖主要是装配和测试，适合承载新的独立命令；`src/app/selectors.ts` 当前只被 Goals UI 使用，扩展详情只读模型的回归面较小。

# 变更导航

| 优先级 | 路径 | 为什么重要 | 风险 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `src/app/mvpApplication.ts` | 新增 Goal-only update 与 Activity create/update/archive/restore 命令 | Activity 归属串错；写入失败造成半提交；最后一条活动归档后无提示 | Vitest 应用契约与 store failure 测试 |
| 1 | `src/app/selectors.ts` | 统一产生详情反馈、最近记录和活动分组 | 把投影误当持久事实；撤销后显示不一致 | 三反馈模型与 reversal/voided 测试 |
| 1 | `src/ui/goals/GoalsScreen.tsx`、待新增 Goal 详情/Activity 编辑组件 | 把 Catalog 与复杂管理解耦 | 手机小屏信息过载；A/B/C 未确认导致错误信息层级 | Testing Library + Playwright |
| 2 | `src/ui/app/App.tsx` | 传递所选 `goalId` 并接入独立命令 | 返回或导入后引用不存在 Goal | 导航、导入、归档 E2E |
| 2 | `src/modules/recommendations/rollEngine.ts` 与空原因文案 | 让 active Goal 无可执行 Activity 时给出明确修复路径 | 新 reason code 与导入白名单不一致 | Roll 单测 + import/export 回归 |
| 2 | `src/test/fixtures/` 与显式开发入口 | 生成日语、健身、摄影三个确定性示例 | 演示数据误写正式用户库；重复生成 | 开发开关、幂等生成和完整清除测试 |
| 3 | `src/ui/history/HistoryScreen.tsx` | 保持全局原始历史与 Goal 详情最近记录一致 | 重复筛选逻辑产生漂移 | 同一快照对照测试 |

建议编辑顺序：先应用命令和原子性测试，再 selectors，再按用户确认的 A/B/C 取向拆 UI，最后补 seed 和跨页面 E2E。数据结构和迁移层暂不改。

# 术语表

| 术语 | 通俗解释 | 出现位置 |
| --- | --- | --- |
| local-first | 数据与主要功能默认在用户设备本地完成，不依赖远程服务器 | `README.md`, ADR 0001 |
| application facade | UI 修改数据时必须经过的单一应用门面 | `src/app/mvpApplication.ts` |
| AppSnapshot | 当前所有目标、活动、Roll、Session、奖励与设置的版本化事实快照 | `src/app/snapshots.ts` |
| selector | 只读取事实并算出展示值、不写存储的函数 | `src/app/selectors.ts` |
| reverse dependency | 哪些文件依赖当前文件，用来判断改动波及范围 | `skill-analyzer-output/dependencies.json` |
| atomic replace | 整个快照要么完整保存，要么失败并保留旧状态 | `src/app/ports.ts` |
| Capacitor | 把本地 Web 应用包装为 Android/iOS 原生容器的工具 | `package.json`, `src/app/composition.ts` |

# 证据与不确定性

证据：

- 确定性扫描命令：`python <CODEX_HOME>/skills/skill-analyzer/scripts/run_analysis.py <project-root>`，结果 `ok: true`，依赖扫描 88 个源码文件。
- 直接查阅：`README.md`, `package.json`, `src/main.tsx`, `src/app/composition.ts`, `src/app/ports.ts`, `src/app/snapshots.ts`, `src/app/mvpApplication.ts`, `src/app/selectors.ts`。
- 直接查阅：`src/modules/goals/types.ts`, `src/modules/goals/validation.ts`, `src/modules/recommendations/rollEngine.ts`, `src/ui/app/App.tsx`, `src/ui/goals/GoalsScreen.tsx`, `src/ui/roll/RollScreen.tsx`, `src/ui/history/HistoryScreen.tsx`。
- 测试证据：`src/app/mvpApplication.test.ts`, `src/modules/goals/validation.test.ts`, `e2e/mvp.spec.ts`。
- 路线证据：`docs/plans/2026-08-04-post-mvp-roadmap.md` 的 N2 工作包和退出标准。

不确定性：

- A/B/C 产品取向尚未确认，因此 Goal 详情首屏的信息顺序和 Catalog 到详情的交互仍不能冻结。
- 当前分析是静态代码与既有测试证据；N0/N1 的 Android SQLite、文件选择/分享、通知和强杀恢复仍缺真实 API 33+ 设备证据。
- 初次 inventory 包含 `.tools/gradle` 缓存，因此全仓语言统计有噪声；本报告的架构结论只依据产品源码和配置，不依据该占比。
- `README.md` 中“原环境未生成 APK”的说明已经落后于当前 CI 状态，后续里程碑整理时需要同步更新。

建议下一步阅读：

1. `docs/plans/2026-08-04-post-mvp-roadmap.md`
2. `src/ui/goals/GoalsScreen.tsx`
3. `src/app/mvpApplication.ts`
4. `src/app/selectors.ts`
5. `src/modules/recommendations/rollEngine.ts`
6. `e2e/mvp.spec.ts`
7. `npm run test:run` 与 `npm run e2e`
