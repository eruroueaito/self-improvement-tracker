# Skill Analyzer 分析记录

## 确定性扫描摘要

- 文件数量：22508
- 语言分布：C/C++ (1), CSS (25), HTML (11356), Java (9414), JavaScript (30), Kotlin (657), Markdown (20), Other (949), TypeScript/TSX (56)
- 关键文件：README.md, package.json, tsconfig.json, vite.config.ts
- 可用命令：dev: vite, build: tsc -b && vite build, typecheck: tsc -b --pretty false, test: vitest, test:run: vitest run, test:coverage: vitest run --coverage, e2e: playwright test, cap:sync: npm run build && cap sync android, verify:n0:env: node scripts/verify-n0-environment.mjs, verify:n0:network: node scripts/verify-network-boundary.mjs, verify:n0:android-smoke: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-smoke.ps1, test:n0:android-smoke-runner: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-android-smoke-runner.ps1
- 入口文件：src/main.tsx
- 依赖扫描文件数：88

## 第一层结论

- 已确认：产品源码入口是 `src/main.tsx`；前端由 React + TypeScript + Vite 构建，原生 Android 壳由 Capacitor 同步生成；单元测试使用 Vitest，浏览器流程使用 Playwright。
- 已确认：确定性管线成功生成 6 个分析工件且无脚本错误。
- 已确认：扫描结果包含 `.tools/gradle` 等本地工具缓存，因此 22508 个文件及 HTML/Java/Kotlin 占比不能代表产品源码规模；后续结论只使用 `src/`、`e2e/`、`android/app`、配置和项目文档。
- 推断：N2 不需要新增后端或网络层，主要会沿现有 React UI -> application facade -> domain/store 路径扩展。
- 未知：A/B/C 产品取向尚未由用户确认，因此 Goal 详情的首屏信息顺序、活动管理入口和复盘权重暂不确定。

## 架构记录

- UI 层：`src/ui/goals/GoalsScreen.tsx` 同时承载 Catalog、目标/首活动联合表单、数据导入导出和设置；目标卡已经能显示多条 active 活动名称，但编辑只取第一条 active 活动。
- 路由/视图层：`src/ui/app/App.tsx` 用本地 `Screen` 联合类型切换页面，没有路由库；新增 Goal 详情需要扩展该状态并显式携带 `goalId`，或在 Goals 内部管理详情状态。
- 业务逻辑层：`src/app/mvpApplication.ts` 是唯一写入门面；已有 `createGoal`、`updateGoal`、`setGoalStatus`，但没有独立的 Activity create/update/archive/restore 命令。
- 数据层：`src/modules/goals/types.ts` 的 `Goal` 与 `ActivityTemplate` 已支持一对多和 `archivedAt`；`src/app/snapshots.ts` 已把 `activities` 作为独立事实集合持久化，因此 N2 不需要 schema v3。
- 派生展示：`src/app/selectors.ts::selectGoalFeedback` 已从 `sessions`/`rewardEntries` 派生三种反馈；N2 应扩展 view selector，而不是增加新的进度事实。
- Roll：`src/modules/recommendations/rollEngine.ts` 已只选择 active Goal 下未归档 Activity；“active Goal 无活动”的现有错误被归类成 `no-active-goals`，需要更可操作的空候选解释。
- 构建/配置层：`package.json` 固定 Node 24.14.0/npm 11.12.1，产品无后端依赖；Android 使用 Capacitor 插件壳。
- 测试层：领域/应用契约集中在 `src/**/*.test.ts`，关键移动流程在 `e2e/mvp.spec.ts`；N2 需要同时增加独立 Activity 命令测试、反馈撤销一致性测试和 Goal 详情 E2E。

## 变更目标记录

- 用户目标：从 N2 开始继续推进到 N7；N2 补全 Goal 详情、多 `ActivityTemplate` 管理、反馈模型展示和开发种子模式，同时保持 5 分钟建 Goal、15 秒 Roll 与完全离线体验。
- 表层文件：`src/ui/goals/GoalsScreen.tsx`、待新增的 Goal 详情/Activity 编辑组件、`src/ui/app/App.tsx`、必要时 `src/ui/history/HistoryScreen.tsx`。
- 支撑文件：`src/app/mvpApplication.ts`、`src/app/selectors.ts`、`src/modules/goals/validation.ts`、`src/modules/recommendations/rollEngine.ts`、`src/app/snapshots.ts`；类型本身已足够表达 N2。
- 验证：至少覆盖 TypeScript、Vitest、Playwright、production build、Capacitor sync 与既有网络边界门槛；真实 Android 冒烟仍是独立外部证据。

## 执行路径与约束

- 创建路径：`GoalsScreen` 联合表单 -> `App.tsx` 回调 -> `MvpApplication.createGoal` -> 同时构造一个 `Goal` 和首个 `ActivityTemplate` -> `DataStore.replace` 原子提交 -> UI 刷新快照。
- 编辑路径：当前 `GoalsScreen.editGoal` 只查找该 Goal 的第一条未归档 Activity，并调用 `MvpApplication.updateGoal` 同时改 Goal/Activity；这正是 N2 必须拆分独立命令的耦合点。
- Roll 路径：`RollScreen` -> `MvpApplication.roll` -> `runRollEngine` -> active Goal + `archivedAt === null` Activity 硬过滤 -> 最多 3 个候选；新增/归档活动可以沿现有数据直接生效。
- 反馈路径：`Goal` 的 feedback 配置 + `Session`/`RewardLedgerEntry` 事实 -> `selectGoalFeedback` -> Goals 卡片文字；撤销通过 reversal ledger 和 voided session 保留，可用于验证详情反馈一致性。
- 最近活动：现有 `HistoryScreen` 已按 `settledAt` 倒序并支持 Goal 筛选，但没有可复用 selector、数量上限或 Goal 详情跳转；应把详情所需的精简列表下沉到 selector，避免复制筛选逻辑。
- 数据约束：`SnapshotFacts` 已独立持有 `goals`、`activities`、`sessions`、`rewardEntries`，N2 无需迁移 schema；导入白名单已经覆盖 Activity 全字段，新命令只改变已有事实集合。

## N2 变更地图

| 优先级 | 路径 | 为什么重要 | 风险 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `src/app/mvpApplication.ts` | 增加 Goal-only update 与 Activity create/update/archive/restore 原子命令 | 误改归属、归档最后一个可执行活动后静默无候选 | 应用层契约测试 + store failure 原子性 |
| 1 | `src/app/selectors.ts` | 统一派生反馈进度、最近活动和活动分组 | 把派生值错误持久化成第二事实来源 | 三种模型、撤销前后与 voided 历史测试 |
| 1 | `src/ui/goals/GoalsScreen.tsx` 与待新增详情组件 | Catalog/详情职责拆分，承载多活动管理 | 手机小屏信息过载；A/B/C 未确认 | Testing Library/Playwright 可见行为 |
| 2 | `src/ui/app/App.tsx` | 连接详情选择状态和独立应用命令 | 返回导航丢失选中 Goal | E2E 导航与刷新 |
| 2 | `src/modules/recommendations/rollEngine.ts` / `src/ui/app/App.tsx` | 为 active Goal 无活动提供可操作原因 | 改动 reason code 破坏导入白名单 | RollEngine 单测 + import/export 回归 |
| 2 | `src/test/fixtures/` | 放置日语学习、健身、摄影确定性 seed | 演示入口误触写正式库、重复创建 | 明确开发开关、重复创建/清除测试 |
| 3 | `src/ui/history/HistoryScreen.tsx` | 只需保持全局原始记录与可能的 Goal 上下文入口一致 | 详情与全局 History 逻辑漂移 | Goal 筛选与详情 recent list 对照 |

## 已确认的最小编辑顺序

1. 先在应用层补独立 Activity 命令与失败边界测试；不改 schema。
2. 扩展 selectors，让详情只读模型稳定后再做 UI。
3. 按用户确认的 A/B/C 取向拆出 Catalog、GoalDetail、ActivityEditor。
4. 增加显式开发 seed 入口与重复/清除契约。
5. 补 E2E 的多活动 -> Roll、归档 -> 空候选解释、三反馈 -> 撤销一致性。

## 未决项

- 唯一阻止 N2 规格冻结的产品问题仍是首要取向：A Roll 优先、B 管理优先、C 复盘优先。
- 真机/模拟器不可用不阻止上述共享逻辑和浏览器契约实现，但 N0/N1/N2 的 Android 原生证据必须继续单列，不能被浏览器 E2E 替代。
