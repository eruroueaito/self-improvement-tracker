# N3 完整伙伴反馈与 ActivityStateEngine 设计规格

- Status: Draft — awaiting automated spec review
- Date: 2026-08-05
- Scope: N3 完整伙伴反馈、公平性与本地视觉状态
- Decision authority: 用户已授权普通产品决策自动收敛并自动审查，不再逐项询问

## 1. 目标与边界

N3 把当前 emoji + XP 文本升级为一只原创、克制、正向的本地像素伙伴。伙伴只反映已经发生的 Session/RewardLedger 事实，不制造新的任务、提醒、损失、连胜、生命值或惩罚，也不改变 Roll 候选、分数或顺序。

本阶段交付：

1. 版本化、可解释的 `ActivityStateEngine`；
2. 从 Session/RewardLedger 重建的伙伴等级、进化、心情与三件房间物品；
3. 一套原创 CSS 像素伙伴，覆盖 3 个进化阶段 × 4 个非负面状态；
4. 最长 2 秒且不阻塞操作的庆祝反馈，以及 reduced/none motion 静态降级；
5. 30 天公平性、时间修改、重复确认、撤销和请求重放自动测试。

不在 N3 实现：AI、网络、云、账户、商店、金币、战斗、统计面板、精确能力评分、推送提醒、schema v3 或新的 Android 权限。

## 2. 自动方案比较与决定

### A. 原创 CSS 像素伙伴（采用）

- 优点：所有形态共用同一 DOM 骨架，12 个阶段/状态组合保持一致；无二进制资源、无远程资产、MIT 归属清楚；CSS 状态与 reduced-motion 易自动测试。
- 缺点：细节少于手绘 sprite sheet，需要克制地使用矩形、圆角和阴影构造像素感。

### B. PNG sprite sheet

- 优点：更接近传统像素游戏美术，可逐帧精修。
- 缺点：12 组状态的一致性、密度缩放、生成过程和授权登记成本更高；二进制 diff 难审查。

### C. Canvas 程序动画

- 优点：状态组合灵活。
- 缺点：实现和无障碍成本最高，截图外难以稳定断言，也不符合当前最简架构。

选择 A。用户此前已拒绝视觉伴随工具，本规格以低刺激文字规则冻结视觉方向，不再暂停询问风格偏好。CSS/DOM 资产作为仓库原创代码按 MIT 发布，不调用图像模型，不引入第三方素材。

## 3. 事实与投影边界

### 3.1 不新增持久事实

N3 沿用 schema v2：

- `Session` 决定近期活动和 working 状态；
- `RewardLedgerEntry` 是 XP、历史最高 XP、等级、进化和解锁的唯一奖励事实；
- `CompanionProjection` 继续作为可重建缓存，不能成为第二事实来源；
- 心情、活动分数和解锁视图不持久化，由 selector 每次从当前快照与显式时间输入派生。

不增加迁移、不修改 SQLite 表结构，也不把 CSS 状态写入导出文件。

### 3.2 历史最高值

按 `createdAt` 升序、ID 升序重放 RewardLedger：

- `currentXp = max(0, 所有 globalXpDelta 之和)`；
- `highestXp = max(0, 重放过程中的最高 running XP)`；
- Level、EvolutionStage、Unlocks 使用 `highestXp`，撤销后不倒退；
- 当前 XP 文本使用 `currentXp`，允许如实回落到 0；
- reversal 只抵消现值，不创建第二奖励或重复解锁。

既有阶段阈值保持：`seed < 100`、`sprout 100–299`、`companion >= 300`。房间物品阈值为：

- 50 XP：`desk-book`（桌边小书）；
- 150 XP：`window-plant`（窗边小植株）；
- 300 XP：`photo-string`（照片挂绳）。

## 4. ActivityStateEngine v1

### 4.1 输入输出

纯函数接收 `{ sessions, now }`，只统计 `isEffectiveCompletion(session)` 且 `settledAt <= now` 的事实，输出：

```ts
interface ActivityStateV1 {
  version: 1;
  score: number; // 0–100，仅内部视觉信号，不作为人的能力分数
  activeDays7: number;
  distinctGoals14: number;
  recentActivityPoints: number;
  breadthPoints: number;
}
```

### 4.2 算法

为避免刷短任务或单一高 rewardWeight 垄断：

1. 使用 UTC day ordinal，避免平台 locale 导致重放不同；
2. 最近 7 个 UTC 日内，每个有至少一次有效完成的日期计 10 分，同日重复无限次仍只计一次，最多 70 分；
3. 最近 14 个 UTC 日内，每个出现有效完成的不同 Goal 计 10 分，最多计 3 个 Goal、30 分；
4. `score = clamp(recentActivityPoints + breadthPoints, 0, 100)`；
5. 未来 `settledAt` 不计入，voided/interrupted/abandoned/低于 50% 完成不计入；
6. rewardWeight、XP、Goal importance 和伙伴状态都不进入算法。

分数不直接显示为“能力”或“健康度”，只映射正向氛围文字：0 为“安静陪伴”，1–49 为“最近有行动”，50–100 为“稳步积累”。分数下降不触发通知、掉级、负面表情或 Roll 改变。

## 5. CompanionView selector

新增纯 `selectCompanionView(snapshot, { now, localHour })`：

- `projection`：由 RewardLedger 重建的 current XP、level、stage；
- `activityState`：ActivityStateEngine v1 输出；
- `unlocks`：按 `highestXp` 派生的稳定 ID 数组；
- `mood`：只取 `idle | working | celebrating | sleeping`；
- `celebratingUntil`：存在时供 UI 安排一次性刷新。

心情优先级：

1. 存在 running/paused Session：`working`；
2. 最近一条 settlement RewardLedger 距 `now` 不超过 2,000ms：`celebrating`；零 XP 的合法结算也庆祝，reversal 不庆祝；
3. `localHour >= 22 || localHour < 7`：`sleeping`；
4. 其他：`idle`。

`localHour` 由 UI 显式传入 0–23，领域函数不隐式读取系统时区。working 高于 celebrating，避免专注中出现庆祝动画。时间回拨只会让未来奖励不触发庆祝，不修改事实。

## 6. 视觉与交互

### 6.1 原创 CSS 资产

新增 `CompanionAvatar`，以语义容器和本地 CSS 元素构造单一伙伴：

- seed：小种子身体与一片芽；
- sprout：较高身体、双叶和短手；
- companion：完整圆润身体、双叶冠和可见手脚；
- idle：睁眼静立；working：前倾、专注眼；celebrating：举手与两枚本地像素星；sleeping：闭眼与文字 `Z`。

每个状态同时提供中文可访问名称，不只依赖颜色、姿势或动画。素材说明写入 `docs/assets/companion-css.md`，声明原创过程、MIT 许可、无第三方来源和 12 组合清单。

### 6.2 页面位置

- 顶栏：用 compact `CompanionAvatar` 取代 emoji，保留 Level/XP 文字；
- Roll hero：显示 expanded 伙伴、当前正向状态文字和已解锁房间物品；
- Focus：顶栏由 selector 自动显示 working；
- 结算后进入 History：最多 2 秒 celebrating，不覆盖页面、不拦截导航、不锁按钮；
- 不新增伙伴专属 Tab，Roll 仍是中央默认入口。

### 6.3 动效降级

- `motion=full/system`：允许轻微 idle blink 和一次性 celebration，celebration 总时长 <= 2 秒；
- `motion=reduced/none`：取消位移、闪烁和循环，只保留静态姿势与“正在专注/刚刚完成”等文字；
- `prefers-reduced-motion: reduce` 始终关闭动画，即使设置为 full；
- sleeping/working 默认静态，避免持续吸引注意。

App 只在 `celebratingUntil > now` 时安排一个一次性 `setTimeout` 触发重算，不启用常驻 1 秒全局计时器。

## 7. Roll 与公平性硬边界

N3 不把 `activityScore`、mood、stage、level 或 unlocks 传给 `runRollEngine`。路线文档中“可作为 Roll 因素”在 N3 明确不采用，因为退出标准要求伙伴不能产生 Roll 偏置。

自动测试必须证明：

- 相同 Goals/Activities/Sessions/Runs/Context 在计算伙伴视图前后产生字节级等价 RollResult；
- 30 天固定仿真包含每日学习、隔日健身、偶尔摄影和暂停 Goal；在均可执行窗口内单一 Goal 不长期获得全部选择；暂停 Goal 不入选，恢复期和最近完成惩罚继续生效；
- 同 Goal 同日多次有效完成只增加一个 active day；rewardWeight 不改变 ActivityState；
- 一分钟任务可记录活动事实但 XP 仍遵守 RewardEngine v1，不通过伙伴获得额外奖励；
- 重复 settle、撤销重试和请求重放继续依赖既有 idempotency key，不产生重复账目或 unlock。

若 30 天仿真暴露 RollEngine 既有公平性缺陷，只能用独立、版本化 Roll 规则和回归测试修复；不得通过伙伴状态暗中调权。

## 8. 错误处理与一致性

- selector 对空快照返回 seed/Lv.1/0 XP/idle 或 sleeping，不抛错；
- 非法 `localHour` 抛 `ValidationError`，不隐式修正；
- 未来 Session/Reward 时间不产生额外活动分或庆祝；
- UI 找不到 unlock 文案时显示稳定 ID，不写回数据；
- 任何视觉渲染失败都不能阻止 Roll、Focus、Settlement、History 或数据导出；
- import/clear/seed cleanup 后下一次 selector 自动重建视图，不保留旧组件缓存。

## 9. 测试与验收

### 9.1 单元/组件

- ActivityState v1：7/14 日边界、UTC、同日去重、Goal breadth cap、future/voided/低完成排除；
- Reward replay：current/highest、撤销不降 stage/unlock、0 XP settlement；
- mood 四态优先级与 2,000ms 边界；
- `CompanionAvatar` 3 × 4 参数矩阵均有唯一 class、状态文字和可访问名称；
- reduced/none class 不包含必须依赖动画才能理解的内容；
- Roll invariance 与 30 天公平性仿真。

### 9.2 浏览器/production

- 开发 E2E：开始 Session 后显示 working；结算后 celebrating 且导航可立即点击；2 秒后回到 idle/sleeping；撤销不降已到达阶段和 unlock；
- production preview：无远程素材请求，CSS 伙伴、状态文字和房间物品正常；
- 每条 E2E 继续断言无本机测试源以外请求。

### 9.3 Android

- CI 重新构建 debug APK，复核 merged manifest 与 SHA，上传 artifact；
- smoke 清单增加 3 阶段、4 状态、reduced motion、小屏不遮挡 Roll；
- 浏览器与 CI APK 不冒充真实 WebView/设备视觉证据。真实 API 33+ 设备仍是 N7 总验收前必须补齐的外部证据。

## 10. 完成定义

N3 确定性实现完成必须同时满足：

1. ActivityState/Companion selectors 无第二事实来源且无 schema v3；
2. 3 阶段 × 4 状态全部可访问、全本地、原创并登记许可；
3. 庆祝 <= 2 秒且不阻塞，reduced/none 与系统减少动态均有等价静态结果；
4. Roll invariance、30 天公平性和滥用测试全绿；
5. code-review/simplify 无未关闭 High/Medium；
6. dev/production E2E、网络扫描、Android build/manifest/hash/artifact 全绿；
7. 真实 Android 显示证据若仍不可用，明确保持 pending，不影响进入 N4 确定性设计，但不能在 N7 总完成审计中遗漏。
