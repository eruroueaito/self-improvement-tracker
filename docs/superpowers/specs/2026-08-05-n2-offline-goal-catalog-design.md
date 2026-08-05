# N2 离线 Goal Catalog 与多活动设计规格

- Status: Approved — automated spec review round 2
- Date: 2026-08-05
- Scope: N2 离线产品能力补全
- Product direction: A — Roll 优先
- Review record: round 1 issues closed; round 2 approved with no issues or recommendations

## 1. 背景与决策授权

基础 MVP 已完成 Goal 与首个 `ActivityTemplate` 创建、确定性 Roll、Session、结算、History、奖励、导入导出和本地设置。N1 已把快照升级到 schema v2，并完成迁移、失败恢复和安全导入导出。

N2 要把“一项目标 + 一条首活动”的管理界面升级为可长期使用的离线 Goal Catalog，同时保持首次创建足够快、全局 Roll 足够直接。用户已选择 A（Roll 优先），并明确授权普通产品细节由 Codex 自主选择、通过独立规格审查和自动化验证收敛，不再逐项询问意见。

本规格不替代 N0/N1 的真实 Android 设备证据；SQLite、通知、文件分享和强杀恢复仍需 API 33+ 真机或可用模拟器补证。

## 2. 目标与成功标准

### 2.1 目标

1. Goal Catalog 保持紧凑，复杂管理进入独立 Goal 详情。
2. 一个 Goal 可独立创建、编辑、归档和恢复多个 `ActivityTemplate`。
3. progress、cumulative、experience 三种反馈都从既有 Session/RewardLedger 事实派生并清楚展示。
4. Goal 详情显示最多五条最近结算记录，同时保留 History 作为全局事实入口。
5. 提供显式开发种子入口，生成日语学习、健身和摄影示例，可完整清除并重复安装。
6. 保持全离线、无 AI、无云、无统计分析和无新增远程资源。

### 2.2 可观察成功标准

- 新用户只需一个简化表单即可同时创建 Goal 与首活动；高级字段仍可展开编辑，人工 Android 验收目标为五分钟内完成。
- 已有数据用户打开应用后仍默认进入 Roll，使用默认时间时一次提交即可得到候选；人工 Android 验收目标为十五秒内完成一次 Roll。
- 一个 Goal 至少能管理两条 active Activity；归档 Activity 后它立即退出新 Roll，恢复后重新参与。
- 归档最后一条 active Activity 不被阻止，也不自动暂停 Goal；Catalog/详情显示“需要活动”，Roll 返回独立可操作原因。
- 撤销结算后，三种反馈展示与 RewardLedger/Session 事实重新一致。
- 开发种子不会自动写入，入口不会出现在 production build；清除种子只移除保留 ID 及其依赖事实。

## 3. 非目标

- 不增加周报、月报、趋势预测、精确能力评分、连续打卡或统计图表。
- 不实现云同步、账户、远程后端、分析埋点或自动网络请求。
- 不接入 AI、Provider、SecretStore、自然语言 GoalDraft 或 SettlementDraft；这些属于 N4/N5。
- 不实现 N3 的像素伙伴素材、动画、状态引擎或解锁。
- 不删除正式用户的 Goal、Activity、Session 或 RewardLedger 历史事实；N2 只使用状态和归档字段。由用户显式安装、且 ID 位于 `dev-seed:` 保留命名空间的开发种子及其依赖事实是唯一例外，必须由“清除开发种子”物理移除以满足可重复演示要求。
- 不增加路由库、状态管理框架、Repository 层或 schema v3。

## 4. 方案比较与选择

### 4.1 方案一：紧凑 Catalog + 独立 Goal 详情（采用）

Catalog 只显示状态、标题、反馈摘要、active Activity 数量和“需要活动”提示。点击 Goal 进入独立详情，详情管理状态、反馈、活动和最近记录。全局底部导航仍显示，Roll 始终一跳可达。

优点：符合 Roll 优先；手机小屏信息密度可控；组件和测试边界清楚；无需路由库。代价：管理活动比内联展开多一次点击。

### 4.2 方案二：Catalog 卡片内联展开

在每张 Goal 卡内展开活动列表和编辑表单。优点是管理操作少一次页面切换。缺点是多个 Goal 时页面迅速变长，表单状态复杂，破坏 Catalog 的扫描速度，也会继续放大当前 `GoalsScreen.tsx` 的职责耦合。

### 4.3 方案三：完整路由化管理区

引入 route stack，为 Goal、Activity 和 History 建立可深链页面。优点是导航表达力最强。缺点是 N2 没有分享深链或浏览器历史需求，引入路由库和持久导航状态属于过度设计。

### 4.4 结论

采用方案一。它能直接复用当前 `App.tsx` 的本地 screen state，并把当前过大的 `GoalsScreen` 拆成职责单一的 Catalog、详情和表单组件。

## 5. 信息架构与交互

### 5.1 全局导航

- 应用无 active/ended Session 时继续默认进入 `roll`。
- 底部导航继续是“目标 / Roll / 历史”，Roll 保持中央主入口。
- Goal 详情也显示底部导航；点击 Roll 或 History 离开详情，点击目标返回 Catalog。
- Focus 和 Settlement 保持沉浸式页面，不显示底部导航。

### 5.2 Goal Catalog

Catalog 的每张卡只显示：

- Goal 状态与标题；
- 一行反馈摘要；
- active Activity 数量；
- 没有 active Activity 时的“需要添加活动”提示；
- 一个明确的“查看详情”按钮。

暂停、归档、恢复、活动编辑等操作不放在 Catalog，避免误触和视觉拥挤。Catalog 顶部保留“新建目标”，底部保留本地数据与设置入口。

### 5.3 快速创建

创建仍以一个原子操作同时生成 Goal 与首个 Activity，避免产生不可 Roll 的半成品。首屏字段为：

- Goal 名称；
- 首活动名称；
- 最短/最长分钟；
- 精力消耗。

默认值为 importance=3、feedback=cumulative times、minimum=10、maximum=30、energy=3、rewardWeight=1、无场景/节奏/休息限制。描述、反馈模型、节奏、休息、场景和奖励权重放在可展开的“高级设置”内，但仍能在创建前修改。

提交继续调用一个 `createGoal(goalDraft, activityDraft)`，由应用层单次原子写入两条事实。

### 5.4 Goal 详情

详情按以下顺序显示：

1. 返回 Catalog、Goal 标题和状态；
2. Goal 编辑、暂停、恢复、归档或重新启用动作；
3. 反馈卡；
4. active Activity 列表和“添加活动”；
5. 折叠的 archived Activity 列表与恢复动作；
6. 最多五条最近结算记录；
7. 跳转全局 History 并预选当前 Goal 的入口。

详情找不到 Goal 时不渲染陈旧引用：清除选择、返回 Catalog，并显示“目标已不存在或数据已被导入替换”。

### 5.5 Activity 管理

Activity 新建和编辑使用独立表单，覆盖 `ActivityDraft` 的全部字段。每条 active Activity 提供编辑和归档；每条 archived Activity 只提供查看摘要和恢复。

归档最后一条 active Activity 时：

- 允许操作并保留 Goal 当前状态；
- 详情和 Catalog 立即显示“需要活动”；
- Roll 不再把该 Activity 作为候选；
- 不删除任何历史 Session 或 RewardLedger；
- 不自动暂停 Goal，也不弹阻塞确认。

### 5.6 最近活动与 History

Goal 详情只显示该 Goal 最近五条具有 Settlement 的 Session，按 `settledAt` 降序、Session ID 升序作为稳定次级键，包含时间、Activity 标题、实际分钟、完成比例和 settled/voided 状态。voided 记录继续可见，以解释撤销后的反馈变化。

“查看全部历史”由 `App.tsx` 写入一次性的 `historyGoalId` 并切到 History；`HistoryScreen` 用它初始化筛选。用户直接点击底部“历史”时清空该上下文并显示全部。History 仍是备注编辑和撤销结算的唯一入口；详情不复制写操作。

## 6. 应用层与领域边界

### 6.1 保留的原子用例

`createGoal(goalDraft, activityDraft)` 保持不变，继续一次创建 Goal 与首活动。

### 6.2 拆分的命令

把当前联合 `updateGoal(goalId, goalDraft, activityId, activityDraft)` 拆为：

- `updateGoal(goalId, goalDraft): Promise<void>`
- `createActivity(goalId, activityDraft): Promise<ActivityTemplate>`
- `updateActivity(goalId, activityId, activityDraft): Promise<void>`
- `archiveActivity(goalId, activityId): Promise<void>`
- `restoreActivity(goalId, activityId): Promise<void>`

所有命令先在克隆快照中完成存在性、归属和草稿校验，再调用现有 `commit` 单次 `DataStore.replace`。写入失败时内存快照和持久快照都保持最后成功状态。

`archiveActivity` 和 `restoreActivity` 是幂等命令：目标已处于请求状态时直接成功且不重复写入。归档只设置 `archivedAt=clock.now()`；恢复只设置 `archivedAt=null`。

### 6.3 Roll 空候选原因

`EmptyRollReason` 增加 `no-active-activities`：

- 没有 active Goal：`no-active-goals`；
- 存在 active Goal，但全部缺少未归档 Activity：`no-active-activities`；
- 之后才判断 time、context 和 rest。

该原因只存在于当前 `RollResult`，不进入 `RecommendationRun` 持久事实，因此不触发 schema 或导入格式变化。UI 文案为“进行中的目标还没有可执行活动，请到目标详情添加或恢复活动”。

## 7. 只读 selectors

扩展 `src/app/selectors.ts`，不把任何展示值写入快照：

- `selectGoalFeedback(snapshot, goal)`：保留现有主文本并补充 feedback type、baseline、value、target、unit、ratio。progress 在 baseline==target 时 ratio=1；否则严格使用 `clamp((value - baseline) / (target - baseline), 0, 1)`。cumulative 和 experience 的 ratio=null，不伪造百分比。
- `selectGoalCatalogItems(snapshot)`：为每个 Goal 返回 feedback、activeActivityCount 和 needsActivity。
- `selectGoalDetail(snapshot, goalId)`：返回 Goal、feedback、按 createdAt 稳定排序的 active/archived Activities，以及最近五条 Settlement 记录。

反馈事实规则保持：

- progress：baseline + 有效完成 Session 的 quantity，封顶 target；
- cumulative times：有效完成次数；
- cumulative minutes：settled 且非 abandoned 的实际分钟；
- experience：同 Goal 全部 RewardLedger delta 之和，包含 reversal；显示值最小为 0。

selector 不修改输入、不缓存跨快照结果、不访问时间、存储或平台 API。

## 8. 组件边界

把 `src/ui/goals/GoalsScreen.tsx` 拆为：

- `GoalsScreen`：Catalog、快速创建、本地数据与设置入口；
- `GoalForm`：Goal 创建/编辑字段与高级设置；
- `GoalDetailScreen`：详情编排和只读展示；
- `ActivityForm`：Activity 新建/编辑；
- `GoalFeedbackCard`：三种反馈的可访问展示；
- `DevelopmentSeedPanel`：仅开发模式的显式种子操作。

`App.tsx` 保留应用门面和跨页状态，新增 `goal-detail` screen 与 `selectedGoalId`。UI 组件不直接访问 Store、SQLite、localStorage 或 RollEngine。

## 9. 开发种子模式

### 9.1 可见性

`DevelopmentSeedPanel` 仅在 `import.meta.env.DEV` 为 true 时渲染，放在“本地数据与设置”内的独立折叠区。production build 不显示入口，也不会自动执行种子命令。

production 分支不构造、不传递 seed UI callbacks；`MvpApplication` 实例保持在 React 闭包内，不挂到 `window` 或其他公共运行时接口。因此 production 用户没有可触发 seed 命令的产品路径。应用层方法可以保留以便契约测试，但“存在于源代码”不得被误解为“对 production 用户可调用”。

### 9.2 确定性事实

新增纯 `createDevelopmentSeedFacts(now)`，使用 `dev-seed:` 保留 ID，生成三项目标、每项两条活动：

- 日语学习：progress 反馈；十分钟复习、二十五分钟阅读；
- 健身：cumulative minutes；十分钟活动度、三十分钟力量；
- 摄影：experience；十五分钟拍摄散步、二十五分钟整理照片。

三组数据覆盖不同时间、精力和场景，便于测试多活动和三种反馈。时间戳由传入 `now` 决定，不使用随机数或网络。

### 9.3 安装与清除

- `installDevelopmentSeed()` 只在用户点击并确认后执行；若任一保留 ID 已存在则拒绝，防止重复和碰撞。
- `clearDevelopmentSeed()` 原子移除所有保留 Goal/Activity，以及引用它们的 Session 和 RewardLedger；随后从剩余 RewardLedger 重建 CompanionProjection。
- RecommendationRun 不能粗暴整行删除：混合包含 demo/用户候选的 run 要移除 demo candidates/dismissed IDs，并在 chosen Activity 属于 demo 时置 null；清理后既无候选、又不被剩余 Session 引用的 run 才删除。这样保留非 demo Session 的 `recommendationRunId` 引用完整性。
- 清除不碰触非 `dev-seed:` Goal/Activity 及其事实。
- 清除后可再次安装；无种子时清除为幂等成功。

开发种子是确定性脚本功能，不使用 AI/Agent。

## 10. 错误处理与一致性

- Goal/Activity 不存在、Activity 不属于 Goal、保留种子 ID 冲突均抛出可直接显示的 `ValidationError`。
- 表单保持受控；命令失败后保留用户输入和最后成功快照。
- busy 状态禁用重复提交；应用命令仍保持幂等或原子，不能只依赖 UI 防双击。
- 导入成功后清除 `selectedGoalId` 并按现有 active/ended Session 规则导航，避免详情引用旧数据。
- Goal 状态改变不级联修改 Activity；Activity 归档不修改 Goal 状态。
- archived Goal 的 Activity 可查看和编辑，但不能参与 Roll；恢复 Goal 后仅未归档 Activity 重新参与。
- 所有新增功能不得增加 `fetch`、XHR、WebSocket、远程图片、远程字体或 INTERNET 权限。

## 11. 可访问性与移动布局

- Goal 卡使用明确按钮打开详情，不把整张 article 伪装成无语义点击区。
- feedback progress 使用原生 `progress` 或等价 `role=progressbar`，提供当前值、最小值和最大值；cumulative/experience 使用等价文字，不伪造百分比。
- 表单 label 与 input 明确关联，折叠区使用 `details/summary`，状态消息进入 `aria-live`。
- 触控目标至少沿用现有按钮尺寸；窄屏采用单列，活动操作允许换行。
- reduced/none motion 设置下不新增依赖动画；N2 不引入任何必需动画。

## 12. 验证策略

### 12.1 单元与应用契约

- Goal-only update 不修改任何 Activity。
- Activity create/update 校验 Goal 归属并在失败时保持原子。
- archive/restore 幂等，历史 Session/RewardLedger 保留。
- 多 Activity Roll、归档排除、恢复重新参与。
- `no-active-goals` 与 `no-active-activities` 正确区分。
- 三种反馈模型及 reversal/voided 后的一致性。
- 最近活动最多五条、稳定排序、仅包含已结算记录。
- 开发种子确定性、冲突拒绝、清除保留用户数据、清除后可重装。

### 12.2 UI 与 E2E

- 快速创建 Goal/首活动后进入 Catalog，并能从详情添加第二条 Activity。
- 归档第一条后 Roll 只推荐第二条；归档最后一条后出现“需要活动”和可操作 Roll 提示；恢复后重新可 Roll。
- progress/cumulative/experience 都显示正确；结算撤销后详情刷新一致。
- Goal 详情最近记录与 History 当前 Goal 筛选一致。
- 开发种子入口只在开发服务器出现，安装、清除和重装闭环通过。
- production 验证必须先执行 `npm run build`，再用 Playwright 启动 `vite preview` 访问真实 `dist`：断言没有开发种子区、按钮或可访问名称；遍历全部公开导航后仍不存在 seed 控件，且预置的无 seed 本地快照不产生任何 `dev-seed:` 事实。仅有 build 成功不能满足该边界。
- 全流程监听请求并断言没有测试源以外的网络目标。

### 12.3 工程门槛

- `npm run typecheck`
- `npm run test:run`
- `npm run verify:n0:network`
- `npm run e2e`
- `npm run e2e:production`（启动 `vite preview` 验证 production artifact 的 seed 不可达边界）
- `npm run build`
- `npm run cap:sync`
- Android CI `assembleDebug`、manifest/hash 复核和 artifact 上传
- API 33+ 设备可用后补原生布局、SQLite 持久化、后台/强杀和文件/通知回归

五分钟创建和十五秒 Roll 不用不稳定的 CI 墙钟断言冒充真机体验：自动化验证交互步数和无阻塞路径，真实 Android 设备上用人工计时作为最终证据。

## 13. N2 退出标准

N2 只有在以下条件同时满足时才可标记确定性完成：

1. 独立 Goal/Activity 命令及失败原子性测试通过；
2. Catalog、详情、多活动、三反馈、最近记录和开发种子全部实现；
3. 多活动正确参与 Roll，最后活动归档有明确提示；
4. 撤销后反馈投影与事实一致；
5. TypeScript、Vitest、网络边界、Playwright、production build、Capacitor sync 和 Android CI 全绿；
6. code-review 与 simplify 完成且无未关闭高严重度问题；
7. 无新增 AI、云、统计或非用户主动网络依赖。

真实 Android 设备证据若仍因环境不可用，可继续作为 N0/N1/N2 共用原生门槛挂起，但不得被浏览器 E2E 或 CI APK 构建替代。
