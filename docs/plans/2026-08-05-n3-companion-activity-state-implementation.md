# N3 完整伙伴反馈与 ActivityStateEngine 实施计划

> 状态：Approved — automated plan review passed in round 2
>
> 设计依据：`docs/superpowers/specs/2026-08-05-n3-companion-activity-state-design.md`
>
> 范围边界：只实现可重建的伙伴投影、ActivityState v1、原创 CSS 伙伴、公平性与滥用测试；不新增 schema、AI、网络、权限、伙伴 Tab 或负向反馈。
>
> 计划来源：brainstorming 要求的 `writing-plans` skill 当前不可用，按项目强制的 planning-with-files 流程提供等价逐文件计划，并继续执行独立自动审查。
>
> Review record：计划第一轮两项问题已修复；第二轮 Approved，无问题或建议

## 1. 交付目标

N3 确定性实现完成后，应用应当：

1. 从 Session/RewardLedger 事实重建 ActivityState、当前/历史最高 XP、阶段、等级和三个稳定 unlock，不信任持久缓存。
2. 保持 schema v2 原样；旧 `CompanionProjection.mood` 只作兼容字段且重建恒为 `idle`，运行时心情只由纯 selector 派生。
3. 在顶栏和 Roll hero 使用原创本地 CSS/DOM 伙伴，完整覆盖 3 阶段 × 4 状态与中文可访问文本。
4. 庆祝最长 2 秒且不阻塞；撤销立即取消；`system | reduced | none` 与系统减少动态均有可理解的静态结果。
5. 用固定 30 天闭环证明现有 Roll 公平性，并证明 ActivityState/伙伴从未成为 Roll 输入。
6. 通过 unit/component、dev E2E、production computed-style、离线扫描与 Android CI；真实设备视觉继续标记 `native evidence pending`。

## 2. 执行原则

- 测试先行：每个引擎/selector/UI 状态先建立失败断言，再写最小实现。
- 新建模块均写项目要求的顶部职责注释；复杂时间与账本规则只注释“为什么”。
- `Session`/`RewardLedgerEntry` 是唯一事实；不把 ActivityState、unlock、运行时 mood 或动画状态写入 Store/导出。
- 不改 `AppSettings.motion`、`CURRENT_SCHEMA_VERSION`、SQLite 表或 Android 权限。
- 不改变 Roll 算法；30 天仿真若意外失败，先形成独立规格修订并自动复核，禁止以伙伴输入调权。
- 每个工作包完成后更新 `task_plan.md`、`findings.md`、`progress.md`，执行 code-review 与 simplify，再按文件精确暂存。
- 每次提交前运行 `git diff --check`、`git diff --cached --check` 和 `git diff --cached --name-only`。

## 3. 工作包

### W1：共享完成判定、ActivityState v1 与奖励重放

> 实施状态：完成；code-review 修复 1 项 Medium 重复 reversal 导入缺口，simplify 完成，TypeScript 与 18 files/86 tests 通过

改动文件：

- 新增 `src/modules/sessions/completion.ts`
- 修改 `src/modules/recommendations/rollEngine.ts`
- 修改 `src/app/selectors.ts`
- 新增 `src/modules/companion/types.ts`
- 新增 `src/modules/companion/activityStateEngine.ts`
- 新增 `src/modules/companion/activityStateEngine.test.ts`
- 修改 `src/modules/rewards/types.ts`
- 修改 `src/modules/rewards/rewardEngine.ts`
- 修改 `src/modules/rewards/rewardEngine.test.ts`
- 修改 `src/app/importValidation.ts`
- 修改 `src/app/importExport.test.ts`
- 修改 `src/app/mvpApplication.ts`
- 修改 `src/app/mvpApplication.test.ts`

测试先行：

1. 把 `isEffectiveCompletion` 原样迁到 Session 领域后，Roll 与 Goal feedback 既有测试保持等价。
2. ActivityState 精确覆盖 UTC ordinal 的 D-6/D-13 包含、D-7/D-14 排除、同日去重、3 Goal cap、future、voided、interrupted、abandoned 和完成率低于 50% 排除。
3. 改变 rewardWeight、XP delta 或同日重复次数不改变 ActivityState；一分钟有效完成仍只贡献当日/Goal 一次。
4. 账本规范序固定为 `createdAt -> settlement before reversal -> id`；输入数组乱序与同毫秒 ID 反序仍先应用原 settlement，再应用对应 reversal。
5. `currentXp` 可因 reversal 回落，`highestXp`/level/stage 不回落；负总和 clamp 为 0；0 XP settlement 仍是有效账目。
6. 导入拒绝 `reversal.createdAt < original.createdAt`，拒绝前不写 Store；相同毫秒合法通过。
7. 系统时钟回拨到原 settlement 之前时，undo 仍以 `max(clock.now(), settlement.createdAt)` 写入合法因果时间；重复撤销返回同一账目。
8. settle、undo、initialize/import/seed cleanup 后的持久 `CompanionProjection.mood` 恒为 `idle`，旧导入 mood 可被接收但不影响重建结果。

实施步骤：

1. 抽出无依赖的 `isEffectiveCompletion(session)` 到 Session 模块，并迁移 Roll/Goal selector import；不改变现有完成定义。
2. 在 companion types 中定义 `ActivityStateV1`、`CompanionMood`、`CompanionStage`、`CompanionUnlockId` 和后续 view 所需的只读类型；不修改持久快照联合。
3. ActivityStateEngine 只接收 `{ sessions, now }`，用整数 UTC ordinal Set 计算 active day 与 Goal breadth；非法/非有限 `now` 抛 `ValidationError`。
4. 在 rewards 中新增非持久 `RewardReplayState` 与纯 `replayRewardLedger`；`rebuildCompanionProjection` 复用它并继续返回原 schema v2 形状。
5. import validation 在已解析 reversal/original 配对处增加因果时间断言；不增加键、不重排导出文件。
6. 删除 settle 对 projection mood 的特殊覆盖，所有应用写路径只调用统一重建函数；undo 在时钟回拨时把 reversal 时间钳制到原 settlement 时间，避免应用自己产生导入会拒绝的数据。

验证：

```powershell
npm run typecheck
npx vitest run src/modules/companion/activityStateEngine.test.ts src/modules/rewards/rewardEngine.test.ts src/app/importExport.test.ts src/app/mvpApplication.test.ts
npm run test:run
```

提交：`feat: add deterministic companion state engines`

### W2：CompanionView selector、unlock 与 Roll 不变性

> 实施状态：完成；code-review 修复 1 项 Medium 2 秒等号/定时器矛盾，独立规格复核 Approved，simplify 完成，TypeScript 与 20 files/105 tests 通过

改动文件：

- 新增 `src/app/companionSelectors.ts`
- 新增 `src/app/companionSelectors.test.ts`
- 新增 `src/modules/recommendations/rollEngine.fairness.test.ts`

测试先行：

1. 空快照在白天返回 seed/Lv.1/0 XP/idle，夜间返回 sleeping；所有输入保持不可变。
2. unlock 在历史最高 50/150/300 XP 精确边界出现，reversal 后不消失；当前 XP 如实回落。
3. mood 优先级为 working > celebrating > sleeping > idle；running 与 paused 都是 working。
4. settlement 仅在 `(now-2000, now]` 半开区间庆祝；0 XP 也庆祝；future 不庆祝；任一 `createdAt <= now` 的对应 reversal 立即使原 settlement 失去资格。对应 reversal 若仍在未来则不能提前取消庆祝，推进 now 到 reversal 时间后才取消。
5. selector 返回 `celebratingUntil = settlement.createdAt + 2000`，否则为 null；非法 localHour/now 抛 `ValidationError`。
6. 相同 Roll 输入在调用 selector 前后产生深度/JSON 字节级等价结果，且 selector 接口不接受 ActivityState、stage、mood、level 或 unlock 作为 Roll 参数。
7. 固定 30 天闭环首选序列冻结为：`study, fitness, study, photo, study, fitness, study, fitness, study, fitness, study, fitness, study, fitness, study, fitness, study, fitness, study, photo, study, fitness, study, fitness, study, fitness, study, fitness, study, fitness`；汇总为 study=15、fitness=13、photo=2，任一占比 <=60%、连续同 Goal <=3，摄影在第 10–16 日不进入候选。

实施步骤：

1. `selectCompanionView(snapshot, { now, localHour })` 组合 reward replay、ActivityState 和活动 Session；只返回运行时视图，不缓存、不写快照。
2. unlock ID 以阈值常量有序派生，selector 不包含 UI 文案；未知 ID 的展示回退留在 UI 层。
3. celebration 先找时间窗口内最新 settlement，再只用 `createdAt <= now` 的 reversal 引用集合排除已撤销项；未来 reversal 保持无效，排序沿用 W1 规范序。
4. 30 天仿真只使用现有 Roll API 和事实输入，每天执行 top candidate 并加入有效 Session/previousRun；测试同时保存逐日序列和统计断言。

验证：

```powershell
npx vitest run src/app/companionSelectors.test.ts src/modules/recommendations/rollEngine.fairness.test.ts
npm run typecheck
npm run test:run
```

提交：`feat: add companion view selectors`

### W3：原创 CSS 伙伴、页面接线与一次性庆祝

> 实施状态：完成；code-review 修复 1 项 Medium reduced-motion 后代动画泄漏，visual review 修复 2 项 Low 可读性问题，simplify 完成，TypeScript、21 files/122 tests、8 dev E2E、build 与网络边界通过

改动文件：

- 新增 `src/ui/companion/CompanionAvatar.tsx`
- 新增 `src/ui/companion/CompanionAvatar.test.tsx`
- 新增 `src/ui/companion/CompanionMatrixScreen.tsx`
- 修改 `src/ui/app/App.tsx`
- 修改 `src/ui/roll/RollScreen.tsx`
- 修改 `src/ui/shared/presentation.ts`
- 修改 `src/main.tsx`
- 修改 `src/ui/styles.css`
- 新增 `docs/assets/companion-css.md`

组件测试先行：

1. 3 stage × 4 mood 的 12 个组合均渲染唯一稳定 class、中文状态文字与可访问名称。
2. seed/sprout/companion DOM 共用同一骨架，阶段元素只通过 class/aria-hidden 控制，不动态注入图片、SVG URL 或 Canvas。
3. idle/working/celebrating/sleeping 的静态眼睛、手臂、星光、Z 标记可被 DOM 断言；语义不依赖动画或颜色。
4. `system | reduced | none` 只生成既有设置对应 class；不存在 `full` 分支。
5. unlock 文案按稳定 ID 显示，未知 ID 回退显示 ID；组件不写 Store、不发事件、不阻塞点击。

实施步骤：

1. `CompanionAvatar` 接收 `stage/mood/size/motion` 和可选 unlock；使用本地 span/div 构造像素身体、叶冠、眼睛、手脚、星光和 Z。
2. `App.tsx` 每次渲染把显式 `Date.now()` 与本地小时传给 selector；复用已测试的 `selectCompanionRefreshDelay`，只在正延时存在时注册一次 timeout 并清理旧 timeout；半开窗口的等号边界返回 null，不安排 0ms timer 或常驻计时器。
3. 顶栏 compact 伙伴只显示可访问 mood、Lv/current XP；Roll hero 使用 expanded 伙伴、正向 ActivityState 文案和已解锁物品。
4. Focus 通过 Session 自动得到 working；Settlement 后 History 立即可导航；undo 刷新后 selector 立即取消 celebration。
5. CSS 的 system 动效最长 2 秒且不改变布局/命中区域；`.motion-reduced`、`.motion-none` 与 `@media (prefers-reduced-motion: reduce)` 对伙伴全部设置 animation none/0s。working/sleeping 默认静态。
6. `CompanionMatrixScreen` 只在根 URL 明确带 `?companion-matrix=1` 时由 `main.tsx` 渲染；无导航入口、无应用初始化、无持久写入，支持 query motion 参数但非法值回退 system。
7. 资产文档登记原创 CSS/DOM、MIT、无第三方/远程素材、12 组合和 unlock 清单。

验证：

```powershell
npx vitest run src/ui/companion/CompanionAvatar.test.tsx
npm run typecheck
npm run test:run
npm run build
npm run verify:n0:network
```

提交：`feat: add local pixel companion interface`

### W4：浏览器 production 样式、滥用与 Android 清单验收

> 实施状态：完成；code-review 无产品缺陷，修正 2 项测试断言与开发 E2E 总预算，simplify 完成，TypeScript、21 files/122 tests、11 dev E2E、4 production E2E、网络边界与 Android cap sync 通过

改动文件：

- 新增 `e2e/n3-companion.spec.ts`
- 修改 `e2e/production.spec.ts`
- 修改 `docs/testing/android-smoke.md`
- 必要时修改 `.github/workflows/ci.yml`（仅当现有 production E2E 门槛不能自动发现新增用例）

开发 E2E：

1. 创建一分钟 Activity，Roll→Focus→完成→0 XP 结算后仍显示 celebrating；主导航可立即点击且伙伴不覆盖按钮。
2. 使用稳定本地快照覆盖 stage/unlock 阈值与历史 peak；刷新后 current XP/level/stage/unlocks 一致，撤销后 stage/unlock 不退。
3. running/paused 显示 working；settlement 后最多 2 秒回到 idle/sleeping；即时 undo 不继续庆祝。
4. 设置 motion reduced/none 后刷新仍保留静态状态文字，且没有外网请求。

Production E2E：

1. 打开 `/?companion-matrix=1`，确认 12 个真实 `CompanionAvatar` 同时存在且没有开发 seed/网络/持久写入。
2. 对每个组合读取关键元素 computed style：阶段尺寸/叶冠，状态眼睛/手臂/星光/Z 至少有对应可见差异；不能只比较 class 名。
3. 分别用 query `motion=reduced`、`motion=none` 与 Playwright `reducedMotion: reduce` 重开矩阵，逐项断言动画名为 none、时长为 0s，文字/accessible name 仍存在。
4. 在 320×640 与 390×844 视口检查 expanded hero、顶栏和底部 Roll 导航无重叠，点击命中正常。
5. 每条 E2E 监听 request，除本机 preview/dev source 外目标数组必须为空。

Android 清单：

1. 增加 3 阶段×4 状态、system/reduced/none、320dp 小屏、庆祝不遮挡 Roll/History 的人工检查项。
2. CI APK 只证明构建、manifest、hash 与 artifact；真实 API 33+ WebView 截图/交互证据仍标记 pending。

验证：

```powershell
npm run typecheck
npm run test:run
npm run e2e
npm run e2e:production
npm run verify:n0:network
npm run build
npm run cap:sync
```

提交：`test: add N3 companion production acceptance`

### W5：阶段审查、简化、完整证据与远端 Android CI

1. 对 W1–W4 完整 diff 执行 code-review，重点检查：
   - imported/reordered ledger 是否伪造历史 peak 或让 reversal 先发生；
   - 旧持久 mood 是否仍可能驱动 UI；
   - future/时钟回拨、2 秒边界和 timeout cleanup 是否产生常驻刷新或卸载后 setState；
   - reduced-motion 是否只改 class 却仍保留实际 animation；
   - matrix 验收面是否初始化/写入正式数据或引入远程资产；
   - ActivityState/companion 是否以任何形式进入 Roll 分数、候选或顺序。
2. 修复所有 High/Medium 并补回归；使用 simplify 仅整理本阶段变更，保持事实/时序/可访问边界。
3. 运行完整本地门槛：

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

4. 扫描产品源码，确认无新增 secret-shaped 字段、fetch/XHR/WebSocket、远程图片/font URL 或 Android INTERNET 权限。
5. 先把设计规格/实施计划/README/planning files 更新为“release candidate awaiting exact-head CI”，记录本地证据与 native evidence pending，形成候选文档提交并推送。
6. 冻结候选 `git rev-parse HEAD`；用 `gh pr view 1 --json headRefOid,headRefName,state,isDraft` 证明 PR #1 的 `headRefOid` 与该 SHA 完全一致，再只接受 `event=pull_request`、`headSha` 完全一致、`conclusion=success` 的 run。核对该 run 的 production matrix、Android sync、assembleDebug、merged manifest/hash 和新 artifact ID 全绿；旧 SHA/run/artifact 不得复用。
7. 候选 exact-head CI 通过后，才把规格/计划/task_plan/progress 状态改为“N3 确定性实现完成 / native evidence pending”，写入候选 SHA/run/artifact 证据，形成唯一最终状态提交 `docs: record deterministic N3 completion` 并推送。
8. 再次冻结最终状态提交 SHA；重复核对 PR `headRefOid`、workflow `event`、run `headSha`、`conclusion`、production matrix、Android build/manifest/hash 与本次 artifact，且之后不再产生任何提交。只有这个最终不可变 revision 的自动证据全绿、code-review/simplify 无未关闭 High/Medium，才在任务状态中声明 N3 完成并自动进入 N4 设计。

## 4. 提交策略

计划提交包：

1. `feat: add deterministic companion state engines`
2. `feat: add companion view selectors`
3. `feat: add local pixel companion interface`
4. `test: add N3 companion production acceptance`
5. `docs: record deterministic N3 completion`

每个提交保持线性可回滚，不使用 `git add .`，不重写已推送 N0–N2 历史。规格/计划提交与产品代码提交分离。

## 5. 阻塞与自动降级

- 无 Android 设备/WHPX：继续完成共享代码、浏览器、production 与 CI APK；原生视觉证据保持 pending，到 N7 总审计前继续尝试物理设备或可用虚拟化环境。
- production computed style 不可证：不能用 jsdom class 测试替代；修复 matrix 验收面或 Playwright 断言后重跑。
- 30 天仿真失败：不得接入伙伴调权；自动形成独立 Roll 规则修订、更新规格并重新自动审查。
- 账本因果非法：导入 fail closed，不静默重排反向时间数据，不做部分写入。
- 视觉渲染异常：保留文字/Lv/XP 与 Roll 操作，伙伴装饰不得阻断核心流程。
