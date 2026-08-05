# N2 离线 Goal Catalog 与多活动实施计划

> 状态：规格与实施计划均通过第二轮自动审查，实施中
>
> 设计依据：`docs/superpowers/specs/2026-08-05-n2-offline-goal-catalog-design.md`
>
> 范围边界：只补全离线 Goal Catalog、多 Activity、三反馈、最近记录和开发种子；不进入 N3 伙伴、N4/N5 AI、云或统计。
>
> Review record：计划第一轮问题已修复；第二轮 Approved，无问题或建议

## 1. 交付目标

N2 确定性实现完成后，应用应当：

1. 保持 Roll 为默认页和中央主入口，Catalog 只承担快速创建与简洁浏览。
2. 通过独立 Goal 详情管理 Goal 状态、多个 active/archived Activity 和最近五条记录。
3. 以独立原子命令创建、编辑、归档和恢复 Activity，不再把 Goal 编辑绑定到第一条 Activity。
4. 从 Session/RewardLedger 派生 progress、cumulative、experience，不写第二份进度事实。
5. 允许 active Goal 没有 active Activity，但在 Catalog、详情和 Roll 中给出明确修复路径。
6. 在开发入口安装、清除和重装三组确定性 seed；production artifact 不存在可触发入口。
7. 保持 schema v2、全离线、无 AI、无新增权限或远程依赖。

## 2. 执行原则

- 测试先行：每个应用/selector/seed 行为先写失败测试，再实现最小代码。
- 每个新模块包含项目要求的顶部职责注释。
- `MvpApplication.commit` 和 `DataStore.replace` 继续是唯一原子写边界。
- 每个工作包完成后同步 `task_plan.md`、`findings.md`、`progress.md`。
- 只提交当前工作包文件；每次提交前运行 `git diff --cached --check` 和 `git diff --cached --name-only`。
- W1–W5 每包形成可回滚提交；W6 只收口审查、简化、证据和文档。

## 3. 工作包

### W1：独立 Goal/Activity 命令与 Roll 空原因

> 实施状态：完成；code-review 修复 1 项 Low，simplify 完成，TypeScript 与 15 files/69 tests 通过

改动文件：

- 新增 `src/app/mvpApplication.goals.test.ts`
- 修改 `src/app/mvpApplication.test.ts`
- 修改 `src/app/mvpApplication.ts`
- 修改 `src/modules/recommendations/types.ts`
- 修改 `src/modules/recommendations/rollEngine.ts`
- 修改 `src/modules/recommendations/rollEngine.test.ts`
- 修改 `src/ui/app/App.tsx`

测试先行：

1. Goal-only update 只修改指定 Goal，保持全部 Activity 字节级等价。
2. `createActivity` 生成正确 `goalId`、默认字段、时间和唯一 ID；Goal 不存在时零写入。
3. `updateActivity` 拒绝不存在或属于其他 Goal 的 Activity；合法更新不改 `createdAt/archivedAt`。
4. `archiveActivity` 只在首次调用时写 `archivedAt`；重复调用零写入。`restoreActivity` 对称。
5. Store replace 失败时，应用内存快照和持久快照都保持最后成功状态。
6. active Goal 存在但没有未归档 Activity 时返回 `no-active-activities`；没有 active Goal 仍返回 `no-active-goals`。
7. 多 Activity 中归档一条只排除该条，其他 Activity 继续参与 Roll。

实施步骤：

1. 抽取 `buildActivity(goalId, draft, now, id)`，复用标准化字段构造，避免 createGoal/createActivity 漂移。
2. 将当前联合 `updateGoal` 临时重命名为 `updateGoalAndActivity`，只供旧 UI 在 W3 前保持行为；新增最终形态 `updateGoal(goalId, goalDraft)`。
3. 新增 `createActivity`、`updateActivity`、`archiveActivity`、`restoreActivity`；归档/恢复请求已满足时直接返回，不调用 Store。
4. `EmptyRollReason` 增加 `no-active-activities`，并按 active Goal -> available Activity -> time/context/rest 的顺序判断。
5. `App.tsx` 暂时把旧联合编辑回调接到 `updateGoalAndActivity`；W3 迁移 UI 后删除该临时 API，并用 `rg` 证明无引用。
6. 把 `src/app/mvpApplication.test.ts` 的旧五参数 `updateGoal` 调用迁移为最终两参数 Goal-only 调用；该测试本来没有改变 Activity 字段，不需要依赖临时联合 API。

验证：

```powershell
npm run typecheck
npx vitest run src/app/mvpApplication.goals.test.ts src/modules/recommendations/rollEngine.test.ts
npm run test:run
```

提交：`feat: add independent goal activity commands`

### W2：Goal Catalog/详情只读 selectors

> 实施状态：完成；code-review 补齐 1 项 Medium 测试缺口，simplify 完成，TypeScript 与 16 files/74 tests 通过

改动文件：

- 修改 `src/app/selectors.ts`
- 新增 `src/app/selectors.test.ts`

测试先行：

1. progress feedback 使用 `clamp((value-baseline)/(target-baseline),0,1)`；baseline==target 时 ratio=1。
2. cumulative times 只计有效完成；minutes 只计 settled 且非 abandoned；experience 汇总 settlement/reversal delta 且展示值不低于 0。
3. 为 progress、cumulative times、cumulative minutes、experience 分别构造“结算前 -> 结算后 -> 撤销/voided 后”断言：前三种在 Session voided 后回退，experience 在 reversal ledger 后回退，避免只验证一种模型替代三种语义。
4. Catalog item 返回 active Activity 数量和 `needsActivity`，不把 archived Activity 计入。
5. Detail 把 active/archived Activities 分组并按 `createdAt`、ID 稳定排序。
6. 最近记录只收具有 Settlement 的 Session，按 `settledAt` 降序、ID 升序，最多五条并保留 voided。
7. selectors 不修改传入快照；重复调用返回等价结果。

实施步骤：

1. 扩充 `GoalFeedbackView` 的 type/baseline/value/target/unit/ratio，同时保留现有 `primary` 文本兼容 Catalog。
2. 定义窄的 `GoalCatalogItemView`、`GoalRecentActivityView`、`GoalDetailView`。
3. 实现 `selectGoalCatalogItems` 和 `selectGoalDetail`；只做纯派生，不读时钟、不缓存、不写快照。
4. Activity/Goal 标题从现有事实解析；N2 不物理删除正式事实，因此无需新增“已删除”替代事实。

验证：

```powershell
npx vitest run src/app/selectors.test.ts
npm run typecheck
npm run test:run
```

提交：`feat: add goal catalog detail selectors`

### W3：紧凑 Catalog、Goal 详情与多 Activity UI

> 实施状态：完成；code-review 补齐 1 项 Medium 验收缺口，simplify 完成，TypeScript、16 files/74 tests、3 E2E、build 与 Android cap sync 通过

改动文件：

- 重构 `src/ui/goals/GoalsScreen.tsx`
- 新增 `src/ui/goals/GoalForm.tsx`
- 新增 `src/ui/goals/GoalDetailScreen.tsx`
- 新增 `src/ui/goals/ActivityForm.tsx`
- 新增 `src/ui/goals/GoalFeedbackCard.tsx`
- 修改 `src/ui/app/App.tsx`
- 修改 `src/ui/history/HistoryScreen.tsx`
- 修改 `src/ui/styles.css`
- 扩展 `e2e/mvp.spec.ts` 或新增 `e2e/n2-goal-catalog.spec.ts`
- 删除 `MvpApplication.updateGoalAndActivity` 临时 API 及对应引用

实施步骤：

1. 把快速创建状态移入 `GoalForm`；首屏只显示 Goal 名称、首活动名称、分钟和精力，其余字段放入 `details/summary` 高级设置。
2. Catalog 卡只显示状态、标题、反馈、active Activity 数量、needsActivity 和“查看详情”。状态动作全部移入详情。
3. `App.tsx` 增加 `goal-detail` screen、`selectedGoalId`、详情打开/返回和独立命令回调；详情仍显示底部导航。
4. `GoalDetailScreen` 按规格顺序显示状态动作、反馈、active/archived Activities、最近记录和 History 入口。
5. `ActivityForm` 覆盖完整 `ActivityDraft`；新建和编辑共享字段，但标题/提交文案明确区分。
6. `GoalFeedbackCard` 对 progress 使用可访问 progressbar；cumulative/experience 只显示数值文字。
7. `HistoryScreen` 接受一次性 `initialGoalId`；底部直接进入 History 时 App 清空该上下文。
8. 导入成功、清空全部数据或详情 Goal 消失时清除选择并返回 Catalog。
9. 迁移完成后删除 `updateGoalAndActivity`，运行 `rg -n "updateGoalAndActivity" src` 必须无匹配。
10. 为 `App.execute` 增加同步 `commandInFlight` ref：在 React busy 状态渲染前就拒绝第二个并发命令，并在 finally 清除；所有 Goal/Activity/seed 写命令复用该入口。

浏览器验收：

- 快速创建仍成功且高级设置可用。
- 详情新增第二 Activity，编辑字段刷新后保留。
- 归档/恢复状态立即反映在 Catalog/详情/Roll。
- 归档最后一条后同时看到 needsActivity 和 Roll 可操作提示。
- 详情最近记录与 History 当前 Goal 初始筛选一致。
- 对保存按钮执行快速双击，断言只创建/更新一次；不能只观察按钮最终 disabled 状态。
- 在浏览器中注入一次 `Storage.setItem` 失败，断言错误可见、Goal/Activity 表单原输入仍保留、Catalog/持久快照不出现半提交；恢复 Storage 后同一表单可重试成功。

验证：

```powershell
npm run typecheck
npm run test:run
npm run e2e
npm run verify:n0:network
```

提交：`feat: add roll-first goal catalog details`

### W4：确定性开发种子与安全清理

改动文件：

- 新增 `src/app/developmentSeed.ts`
- 新增 `src/app/developmentSeed.test.ts`
- 扩展 `src/app/mvpApplication.goals.test.ts`
- 修改 `src/app/mvpApplication.ts`
- 新增 `src/ui/goals/DevelopmentSeedPanel.tsx`
- 修改 `src/ui/goals/GoalsScreen.tsx`
- 修改 `src/ui/app/App.tsx`
- 修改 `src/ui/styles.css`

测试先行：

1. 同一 now 输入生成完全相同的 3 Goal/6 Activity；ID 全部使用 `dev-seed:` 保留前缀。
2. 三种反馈、分钟、精力和场景覆盖规格矩阵；不使用 ID generator、随机数、网络或 AI。
3. 安装 seed 只追加事实；任一保留 ID 冲突时零写入并显示明确错误。
4. 清理移除 demo Goal/Activity/Session/Reward，并从剩余 ledger 重建 CompanionProjection。
5. 混合 RecommendationRun 被安全净化：移除 demo candidate/dismissed/chosen；保持非 demo Session 的 run 引用。
6. 既无候选又未被剩余 Session 引用的 run 删除；其余 run 保留。
7. 非 demo 用户事实保持等价；清理后再次安装成功；无 seed 清理幂等且零写入。

实施步骤：

1. 在纯模块中定义保留 ID 常量、fixture builder 和 snapshot cleanup；不访问 Store/UI/平台。
2. `MvpApplication.installDevelopmentSeed/clearDevelopmentSeed` 只负责快照克隆、验证和一次 commit。
3. `DevelopmentSeedPanel` 只在 `import.meta.env.DEV` 分支创建和传递 callbacks；production 分支不渲染、不挂 `window`。
4. 安装与清理都要求显式确认；开发 UI 给出成功数量和不可逆 demo 历史清理说明。

验证：

```powershell
npx vitest run src/app/developmentSeed.test.ts src/app/mvpApplication.goals.test.ts
npm run typecheck
npm run test:run
npm run e2e
```

提交：`feat: add explicit development goal seeds`

### W5：N2 E2E、production 边界与 CI

改动文件：

- 新增或扩展 `e2e/n2-goal-catalog.spec.ts`
- 新增 `e2e/production.spec.ts`
- 修改 `playwright.config.ts`，排除 production 专用 spec
- 新增 `playwright.production.config.ts`
- 修改 `package.json`/`package-lock.json`
- 修改 `.github/workflows/ci.yml`
- 必要时补充 `docs/testing/android-smoke.md` 的 N2 人工检查项

实施步骤：

1. 开发服务器 E2E 覆盖：快速创建、多 Activity、归档/恢复、空原因、三反馈、最近记录、History 过滤、seed 安装/清理/重装。
2. 对 progress、cumulative times、cumulative minutes、experience 每一种模型完成结算后详情断言，再从 History 撤销并断言详情值按各自事实规则回退；不得用 experience 一例代表其他模型。
3. 增加并发与失败 UI 回归：Goal/Activity/seed 写按钮快速双击只执行一次；Storage 写失败后表单输入保留、快照不变、恢复后可重试。
4. 每条 E2E 监听 request，断言除本机测试源外没有网络目标。
5. 正常 Playwright config 用 `testIgnore` 排除 `production.spec.ts`。
6. production config 先使用 `npm run build` 生成 `dist`，再启动 `vite preview`；只运行 production spec。
7. production spec 遍历公开导航，断言没有 seed 区/按钮/accessible name；预置无 seed localStorage，断言操作后仍无 `dev-seed:` 事实。
8. 增加 `preview` 与 `e2e:production` scripts；CI 在常规 E2E 后运行 production E2E。
9. 更新 Android smoke 人工清单：详情小屏、多个 Activity、最后活动归档提示和三反馈展示；不把浏览器结果当原生证据。

验证：

```powershell
npm run typecheck
npm run test:run
npm run verify:n0:network
npm run e2e
npm run e2e:production
npm run cap:sync
```

提交：`test: add N2 offline and production acceptance`

### W6：代码审查、简化、全量证据与阶段提交

1. 使用 code-review 审查 W1–W5 的完整 diff，优先检查：
   - Store 失败时内存/持久状态分裂；
   - Activity 跨 Goal 越权修改；
   - seed cleanup 破坏非 demo 引用；
   - feedback/reversal 产生第二事实来源或错误 ratio；
   - production 暴露 seed 或新增网络出口；
   - selected Goal/History 上下文在导入后悬空。
2. 修复所有 High/Medium 正确性问题并补回归测试。
3. 使用 simplify 只整理本阶段修改代码，保持行为和安全边界不变。
4. 运行完整本地确定性门槛：

```powershell
npm run typecheck
npm run test:run
npm audit --omit=dev
npm run verify:n0:network
npm run e2e
npm run e2e:production
npm run build
npm run cap:sync
npm run test:n0:android-smoke-runner
git diff --check
```

5. 扫描产品源码，确认没有新 secret-shaped 字段、fetch/XHR/WebSocket 或 INTERNET 权限。
6. 更新 planning files、规格状态和 N2 证据摘要，形成收口提交：`docs: record deterministic N2 completion`。
7. 确认草稿 PR #1 仍以 `agent/android-alpha` 为 head；若 PR 不存在则先创建 draft PR。推送该分支后必须由 pull_request 事件触发 CI，记录与最终 head SHA 一致的 run URL/ID；单独 branch push 不是证据。
8. 等待远端 Android CI 完成 debug APK、manifest/hash 和 artifact 上传，并用 `gh run view` 核对 conclusion=success 与 head SHA。
9. 只有自动证据全部通过且审查无未关闭高严重度问题时，才标记 N2“确定性实现完成”；真实 Android 设备证据继续单列。

## 4. 提交策略

计划提交包：

1. `feat: add independent goal activity commands`
2. `feat: add goal catalog detail selectors`
3. `feat: add roll-first goal catalog details`
4. `feat: add explicit development goal seeds`
5. `test: add N2 offline and production acceptance`
6. `docs: record deterministic N2 completion`

每个提交必须能被后续提交线性迁移，不使用全量 `git add .`，不重写或合并既有 N0/N1 历史。

## 5. 阻塞与降级

- 无 Android 设备：不阻止 W1–W6 的共享逻辑、浏览器与 CI APK；阻止 N0/N1/N2 原生体验最终签收。
- production preview 失败：不能以 dev E2E 替代；修正 build/preview 配置或 seed gate 后重跑。
- seed cleanup 引用不一致：fail closed，保留原快照，不做部分清理。
- 规格与代码冲突：以已审查规格为准；必要时修订规格并重新自动审查，不向用户抛普通设计选择。
- N3–N7 的外部签名、Apple 资产和真实设备权限不在 N2 内伪造或提前声明通过。

## 6. 完成定义

N2 的确定性实现只有在规格第 13 节全部自动门槛成立、W1–W6 记录齐全、远端 Android CI 全绿后才完成。N0/N1/N2 的真实设备证据保持待补，不影响继续设计 N3，但不能在 N7 总完成审计时遗漏。
