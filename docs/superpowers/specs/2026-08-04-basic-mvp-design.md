# Self Improvement Tracker 基本 MVP 设计规格

日期：2026-08-04
状态：已通过独立规格审查（第三轮，2026-08-04）
总体方向：用户已批准方案 B（模块化单体 + 纵向里程碑）

## 1. 目标与截止条件

基本 MVP 必须让用户在完全离线的情况下完成以下闭环：

1. 手动创建长期目标及其可执行活动模板；
2. 输入可用时间，并可选输入当前精力和场景；
3. 由本地确定性 RollEngine 返回最多三个合理行动；
4. 选择行动，使用 Flowtime 或 Countdown 计时；
5. 结束后手动确认完成程度、投入程度、难度、数量和备注；
6. 原子写入 Session、奖励账本和宠物投影；
7. 在 History 中查看、编辑备注并撤销错误结算；
8. 完整导出、清空并重新导入本地数据。

MVP 同时必须具备可生成的 Capacitor Android 工程、基础可访问性和自动化测试。网页仅是开发外壳，发布目标是 Android。

### 1.1 不在本次截止范围

- 大模型 Provider、GoalDraft、SettlementDraft 和 AI 历史；
- AI 改写 Roll 理由或改变候选顺序；
- 完整像素精灵动画、房间装饰和三个精细进化素材；
- 应用内语音识别、whisper.cpp；
- iOS 发布；
- 账户、同步、云数据库、遥测、分析、广告和社交。

## 2. 产品边界

底部导航只有 Goals、Roll、History。Focus 和 Settlement 是临时流程页。Roll 的核心输入是结构化控件；MVP 不提供会在离线状态下失效的自然语言 Roll 输入。

任何网络请求都不属于 MVP。应用不得加载远程字体、图片、脚本或分析 SDK。所有资源随安装包提供。

宠物只提供正向反馈。没有生命值、惩罚、掉级、连续使用压力、货币、商店或战斗。

## 3. 架构

采用单仓库模块化单体：

```text
src/
  modules/
    goals/                 # Goal 与 ActivityTemplate
    recommendations/       # RecommendationRun 与 RollEngine
    sessions/              # Flowtime/Countdown 与结算
    rewards/               # RewardLedger 与 CompanionProjection
  app/
    mvpApplication.ts      # 跨模块用例编排
    ports.ts               # 数据库、时钟、ID、通知、文件端口
    composition.ts         # 唯一依赖装配入口
  adapters/
    memory/                # 契约测试和降级测试实现
    sqlite/                # Capacitor SQLite 发布实现
    browser/               # 浏览器开发持久化实现，非 Android 发布实现
    notifications/         # Capacitor 本地通知
    clock/                 # 系统时钟
  ui/
    app/
    goals/
    roll/
    focus/
    settlement/
    history/
    shared/
```

依赖约束：

- `modules` 不导入 React、Capacitor、SQLite 或浏览器 API；
- `ui` 只调用 `MvpApplication` 暴露的用例；
- `adapters` 实现 `app/ports.ts` 的端口；
- `composition.ts` 是唯一引用具体适配器的位置；
- 不引入事件总线、插件系统、通用工作流引擎或依赖注入框架。

## 4. 数据类型与不变量

所有 ID 是 UUID 字符串。所有持久时间是 Unix epoch 毫秒。显示时才转换为本地时区。

### 4.1 Goal

```ts
type GoalStatus = 'active' | 'paused' | 'archived';

type FeedbackConfig =
  | { type: 'progress'; baseline: number; target: number; unit: string }
  | { type: 'cumulative'; unit: 'minutes' | 'times' }
  | { type: 'experience' };

interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  importance: 1 | 2 | 3 | 4 | 5;
  feedback: FeedbackConfig;
  desiredCadenceDays: number | null;
  minimumRestHours: number;
  defaultEnergyCost: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  updatedAt: number;
}
```

标题去除首尾空白后必须为 1–80 字符。progress 的 target 必须大于 0，baseline 位于 0 到 target 之间。cadence 为空或大于 0，休息时间不得为负。

Goal 的反馈值是派生视图，不由结算直接累加到 Goal 行：

- `progress`：`min(target, baseline + sum(quantity))`，只汇总该 Goal 下“有效完成”的、未撤销 Session；这些 Session 的 quantity 必须存在，quantityUnit 展示为 Goal 的 unit；
- `cumulative/minutes`：汇总该 Goal 下所有未撤销、非 abandoned 结算的 actualMinutes；
- `cumulative/times`：统计该 Goal 下“有效完成”的 Session 数；
- `experience`：显示 RewardLedger 中该 Goal 的净 goalXp 及 `floor(max(0, goalXp) / 50) + 1`。

编辑 progress 的 baseline 只改变之后的派生起点，不改历史 Session。撤销通过排除 voided Session 和 reversal 账目自然反映到反馈视图，不执行容易重复的反向字段更新。

### 4.2 ActivityTemplate

```ts
interface ActivityTemplate {
  id: string;
  goalId: string;
  title: string;
  description: string;
  minimumMinutes: number;
  maximumMinutes: number;
  energyCost: 1 | 2 | 3 | 4 | 5;
  contexts: string[];
  minimumRestHours: number | null;
  suggestedCadenceDays: number | null;
  rewardWeight: number;
  createdAt: number;
  archivedAt: number | null;
}
```

分钟为整数，`1 <= minimumMinutes <= maximumMinutes <= 480`。`rewardWeight` 必须是 0.25–3 之间的有限数。contexts 经过去空白、小写化和去重。MVP 中活动 contexts 表示所需场景；用户未提供当前场景时不做场景过滤，提供时活动的所有非空 contexts 必须包含在当前场景集合中。

### 4.3 RecommendationRun

```ts
interface RollContext {
  availableMinutes: number;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  contexts: string[];
}

interface RecommendationCandidate {
  activityTemplateId: string;
  goalId: string;
  suggestedMinutes: number;
  score: number;
  scoreParts: Record<string, number>;
  reasonCodes: string[];
}

interface RecommendationRun {
  id: string;
  requestedAt: number;
  context: RollContext;
  candidates: RecommendationCandidate[];
  chosenActivityTemplateId: string | null;
  dismissedActivityTemplateIds: string[];
}
```

Roll 历史保存在本地，用于解释评分和显式“暂不想做”惩罚。关闭结果不自动等于拒绝。

`availableMinutes` 必须是 1–480 的整数。RollContext.contexts 与活动 contexts 使用相同的标准化规则。

### 4.4 Session 与 Settlement

```ts
type TimerMode = 'flowtime' | 'countdown';
type SessionStatus = 'running' | 'paused' | 'ended' | 'settled' | 'voided';
type SessionEndType = 'completed' | 'interrupted' | 'abandoned';

interface Session {
  id: string;
  goalId: string;
  activityTemplateId: string;
  recommendationRunId: string | null;
  timerMode: TimerMode;
  status: SessionStatus;
  plannedMinutes: number | null;
  startedAt: number;
  runningSince: number | null;
  accumulatedMs: number;
  targetDurationMs: number | null;
  lastHeartbeatAt: number;
  endedAt: number | null;
  endType: SessionEndType | null;
  settlement: Settlement | null;
  createdAt: number;
  settledAt: number | null;
}

interface Settlement {
  actualMinutes: number;
  completionRatio: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  effort: 1 | 2 | 3 | 4 | 5 | null;
  quantity: number | null;
  quantityUnit: string | null;
  userNote: string;
}
```

Flowtime 的 plannedMinutes 和 targetDurationMs 为空。Countdown 两者必须存在。展示时长通过 `accumulatedMs + max(0, now - runningSince)` 计算；页面每秒刷新不写永久状态。

同一时刻只能有一个非 voided 的 running/paused Session。系统时间向后跳时本次运行段按 0 增量处理并显示恢复提示；系统时间向前跳超过 24 小时时要求用户确认结束时间，不自动奖励。

Settlement 的验证边界：actualMinutes 是 0–1440 的有限数，completionRatio 是 0–1 的有限数，quantity 为空或为 0–1,000,000 的有限数，quantityUnit 去除首尾空白后最多 24 字符，userNote 最多 2,000 字符。progress Goal 的“有效完成”结算必须提供 quantity；其他反馈类型允许 quantity 为空。

本规格中的“有效完成”统一指：Session 已结算且未撤销（`status === 'settled'`），`endType === 'completed'`，并且 `completionRatio >= 0.5`。休息期、cadence、recency、variety、最近完成惩罚和 cumulative/times 全部只查询有效完成；若某项规则需要别的集合，会明确写出。

### 4.5 RewardLedgerEntry 与 CompanionProjection

```ts
interface RewardLedgerEntry {
  id: string;
  sessionId: string;
  goalId: string;
  entryType: 'settlement' | 'reversal';
  globalXpDelta: number;
  goalXpDelta: number;
  ruleVersion: 1;
  idempotencyKey: string;
  reversalOfEntryId: string | null;
  createdAt: number;
}

interface CompanionProjection {
  globalXp: number;
  level: number;
  evolutionStage: 'seed' | 'sprout' | 'companion';
  mood: 'idle' | 'working' | 'celebrating' | 'sleeping';
  lastUpdatedAt: number;
}
```

RewardLedger 是奖励事实来源。CompanionProjection 是可重建缓存。等级和进化阶段由累计 XP 单调推导；撤销会减少账本净 XP，但显示等级采用历史达到的最高等级，不向下掉级。

## 5. RollEngine

### 5.1 硬过滤

依次排除：

- Goal 不是 active；
- ActivityTemplate 已归档；
- minimumMinutes 大于 availableMinutes；
- 用户提供场景且不包含活动所需的全部 contexts；
- 上次完成同一活动后尚未满足活动级或目标级 minimumRestHours。

用户未提供精力或场景时不推断限制。

### 5.2 评分

每个分项先限制到稳定范围，再线性相加：

- importance：`goal.importance * 10`；
- cadenceNeed：`cadence = activity.suggestedCadenceDays ?? goal.desiredCadenceDays`；活动 cadence 存在时使用该活动上次有效完成，只有目标 cadence 时使用该目标任一活动上次有效完成；无 cadence 给 0，无历史给 20，否则为 `clamp(elapsedDays / cadence * 20, 0, 20)`；
- recencyNeed：使用该活动上次有效完成；无历史给 10，否则为 `clamp(elapsedDays / 30 * 10, 0, 10)`；
- timeFit：`clamp(suggestedMinutes / availableMinutes * 15, 0, 15)`；
- energyFit：未提供精力给 5，否则为 `clamp(10 - 2.5 * abs(context.energy - activity.energyCost), 0, 10)`；
- varietyBonus：最近两次结算未出现该 goal 时加 6；
- explicitDismissPenalty：24 小时内用户明确点过“暂不想做”减 12；
- recentCompletionPenalty：24 小时内完成过同一活动减 15。

`elapsedDays = max(0, now - settledAt) / 86_400_000`。最近两次结算仅指按 `settledAt` 降序、Session id 升序打破同时间平局的两次有效完成。dismiss 仅来自 RecommendationRun.dismissedActivityTemplateIds；同一活动只施加一次 -12。suggestedMinutes 是 `availableMinutes` 限制在活动 minimum/maximum 之间的整数。每个 scorePart 和总 score 在计算完成后四舍五入到小数点后三位；最终按 score 降序、activityTemplateId 升序稳定排序，返回最多三个。每次权重变化必须由测试说明预期行为变化。

## 6. Session 状态机

- `start`：创建 running Session；Countdown 同时安排本地通知；
- `pause`：把当前运行段累加到 accumulatedMs，runningSince 置空；
- `resume`：runningSince 设为当前时间；
- `end`：固化 actual elapsed，取消通知，按下面的唯一映射写入 endType 并进入 ended；
- `recover`：应用启动或回到前台时根据持久字段重新计算；Countdown 到期后进入 ended/completed，通知是否展示不影响结果；
- `settle`：只允许 ended Session，原子写 Settlement + RewardLedger + CompanionProjection；
- `undo`：对已结算 Session 创建唯一 reversal entry，并把 Session 标为 voided；历史记录保留。

重复 settle、重复 undo 和重复按钮点击必须幂等。

结束动作与 endType 的唯一映射：

- Flowtime 点击普通“完成”：`completed`；
- Flowtime 在退出确认中选择“中断并结算”：`interrupted`；
- Countdown 自然到期，或恢复时发现已到目标：`completed`；
- Countdown 未到目标时点击“提前结束”，或在退出确认中选择“中断并结算”：`interrupted`；
- 任一模式在退出确认中选择“放弃本次”：`abandoned`；
- “继续后台计时”不结束 Session，也不设置 endType。

Flowtime 普通“完成”表达用户主观确认已完成，不以时长阈值改写。Countdown 到期前不存在 `completed` 快捷路径；用户若已提前做完，应使用“提前结束”，在 Settlement 中用 completionRatio 表达完成程度，但 endType 仍是 `interrupted`。一旦 Session 进入 ended，Settlement 不允许更改 endType，避免奖励和长期反馈被表单重分类。

## 7. 奖励规则 v1

基础 XP：

- 小于 5 分钟：0；
- 5–14 分钟：5；
- 15–24 分钟：12；
- 25–44 分钟：20；
- 45–59 分钟：30；
- 60 分钟及以上：40。

`xp = round(baseXp * completionRatio * effortMultiplier * rewardWeight)`，effort 为空时 multiplier 为 1；1–5 映射为 0.9、0.975、1.05、1.125、1.2。结果限制在 0–50。

abandoned 的 XP 固定为 0。completed 和 interrupted 在 completionRatio 大于 0 时可按公式获得 XP，因此部分投入不会被抹掉，但只有符合第 4.4 节定义的“有效完成”才影响 cadence 等长期反馈。

同一活动 30 分钟内第二次“可奖励结算”乘 0.5，第三次及以后为 0，但 Session 仍保存。“可奖励结算”指未撤销、非 abandoned 且 completionRatio 大于 0 的 settled Session；窗口按当前 settledAt 与此前 settledAt 比较。difficulty 不影响 XP。

目标 XP 等于最终 XP。全局 XP 与目标 XP 都通过同一账本事务写入。stage 阈值为 seed `<100`、sprout `100–299`、companion `>=300`；level 为 `floor(globalXp / 50) + 1`，并保存历史最高等级避免撤销导致掉级。

## 8. 存储与迁移

Android 发布适配器使用 `@capacitor-community/sqlite`。SQLite schema 版本从 1 开始，包含 goals、activities、recommendation_runs、sessions、reward_entries、companion_projection 和 app_meta。

浏览器开发外壳使用版本化 localStorage 适配器，数据形状与端口契约相同，但不作为 Android 发布证据。内存适配器用于契约测试。

`SettlementTransaction` 必须由适配器一次性提交 Session、RewardLedger 和 CompanionProjection。SQLite 使用单连接事务；浏览器/内存适配器使用复制后提交，异常时不替换旧快照。

导出格式：

```ts
interface ExportEnvelopeV1 {
  format: 'self-improvement-tracker';
  version: 1;
  exportedAt: number;
  data: {
    goals: Goal[];
    activities: ActivityTemplate[];
    recommendationRuns: RecommendationRun[];
    sessions: Session[];
    rewardEntries: RewardLedgerEntry[];
    companionProjection: CompanionProjection;
  };
}
```

导入先完整校验，再在单事务中替换数据。验证失败不修改现有数据。导入不信任导出的 CompanionProjection：替换事实表后按 RewardLedger 的 createdAt 升序、entry id 升序重放，重建净 XP、历史最高 level、stage 与投影；导出的 projection 只用于格式完整性校验。导出不含密钥、临时 UI 状态或通知 ID。

## 9. UI 流程

### Goals

- 卡片显示目标名、反馈类型、最近活动和状态；
- 可创建/编辑 Goal 和至少一个 ActivityTemplate；
- 可暂停、恢复、归档；
- 设置入口提供导出、导入、清空全部本地数据和减少动态选项。应用默认不写示例数据；清空操作二次确认后以单事务删除全部事实与投影数据，并回到空白首次使用状态。

### Roll

- 顶部显示静态宠物投影和简短状态；
- 时间快捷值 10/15/25/45/60 分钟，可自定义；
- 精力与场景可选；
- 结果卡显示活动、目标、建议时长、确定性理由、预计 XP、开始和“暂不想做”；
- 没有候选时解释缺少目标、时间不足或恢复期，而不是空白。

### Focus

- 只显示活动名、计时、暂停/继续、完成或提前结束，以及退出；按钮文案按第 6 节的 endType 映射变化；
- Countdown 到期进入 Settlement；通知拒绝不阻止流程；
- 退出前明确选择继续后台计时、中断并结算或放弃本次。

### Settlement

- 默认实际时长来自 Session；
- completionRatio、effort、difficulty、quantity 和 note 可手动编辑；
- 用户确认后才提交事务；
- 显示 XP 和静态宠物状态；十秒内提供撤销入口，History 仍可撤销。

### History

- 按本地日期倒序分组；
- 可按 Goal 过滤、编辑备注、撤销结算；
- 不提供统计图、周报、月报或 AI 总结。

## 10. 错误与降级

- 数据库初始化或迁移失败：显示可恢复错误页，允许导出可读数据；不静默清库；
- 导入失败：保留旧数据并显示具体校验错误；
- 通知权限拒绝：Countdown 正常工作，显示应用内提示；
- 系统时间异常：不自动发奖励，要求确认；
- 写事务失败：Session 保持 ended，用户可重试结算；
- 无候选：返回结构化原因；
- localStorage 容量不足：保持内存中的未提交编辑并提示导出/释放空间。

## 11. 可访问性

- 所有核心按钮有可见文字和语义名称；
- 状态不只依靠颜色和宠物图形；
- 支持系统大字体、键盘焦点和减少动态；
- 奖励动画关闭后 XP 与结算结果仍可见；
- 触摸目标至少 44×44 CSS 像素。

## 12. 测试与 MVP 验收

### 自动化

- Vitest：实体校验、RollEngine、Session 状态机、RewardEngine；
- 契约测试：内存与浏览器持久化适配器；SQLite 适配器在可用原生环境运行相同核心契约；
- Playwright：Goal 创建 → Roll → Focus → Settlement → History → Undo；
- 构建：TypeScript、Vite production build、Capacitor sync；
- Android SDK 可用时运行 Gradle assembleDebug，否则明确报告为未验证门槛。

### 验收场景

1. 首次用户五分钟内创建目标和活动；
2. 已有目标时十五秒内完成 Roll；
3. 断网时所有 MVP 流程可用；
4. 刷新/重启后目标、计时、历史和 XP 保持；
5. Countdown 通知被拒绝仍可在回前台时正确完成；
6. 重复结算不重复加 XP；
7. 撤销产生反向账目且不删除历史；
8. 导出、清空、导入后数据完整恢复；
9. paused/archived/恢复期/超时长活动不进入候选；
10. 所有自动化测试与生产构建通过；
11. Android 工程存在并完成 `cap sync`；若本机 SDK 存在，debug APK 构建通过。

## 13. 许可与供应链

原创代码 MIT。依赖引入前记录包名、版本、许可证、来源和用途到 `THIRD_PARTY_NOTICES.md`。禁止 GPL/AGPL/SSPL/NC 或许可证不明依赖进入发布包。MVP 不复制 Sidejot、Perfice、Super Productivity、Loop 或 Habitica 的代码和素材。
