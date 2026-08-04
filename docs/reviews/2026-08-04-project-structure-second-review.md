# Self Improvement Tracker 项目结构第二轮审查

日期：2026-08-04  
状态：审查完成；用户已于 2026-08-04 确认方案 B  
范围：产品边界、架构、数据模型、阶段依赖、离线与安全、许可证、测试与发布

## 结论

项目的核心方向是成立的：本地优先、离线闭环、确定性推荐、AI 只做语义处理、奖励不惩罚用户，这五条应保留为不可轻易修改的产品原则。

但当前附件还不能直接作为实现规格。它把产品章程、字段设计、第三方源码研究、开发路线和最终审计混在一份文档中；若原样执行，会在代码很多以后才暴露计时恢复、结算事务、推荐反馈、密钥存储和原生生命周期等结构性问题。

建议采用“模块化单体 + 端口/适配器 + 纵向可运行里程碑”。保留 TypeScript、React、Vite、Capacitor 与 SQLite，但必须先用一个 Android 风险探针验证 SQLite、安全存储、本地通知、导入导出和冷启动恢复，再锁定具体版本。

## 保留、修改、删除与延后

| 处理 | 内容 | 原因 |
|---|---|---|
| 保留 | 唯一核心任务：帮助用户从空闲快速开始一个长期目标相关行动 | 产品定位清楚，能约束功能膨胀 |
| 保留 | 离线完成 Goals → Roll → Focus → 手动结算 → Reward → History | 保证模型/API 故障不摧毁核心价值 |
| 保留 | Roll 与奖励使用确定性规则，奖励采用可追溯账本 | 可测试、可解释、可撤销 |
| 保留 | UI 不直接访问 SQL，领域不依赖 React/Capacitor | 边界合理且便于测试 |
| 修改 | 四个全局横向目录 | 改为按 Goals、Recommendations、Sessions、Rewards 划分业务模块；每个模块内部再分 domain/application，避免全局层目录逐渐变成杂物箱 |
| 修改 | 每个实体一个 Repository | 改为按聚合和事务边界设计存储端口，例如 GoalCatalogStore、SessionStore、SettlementTransaction、HistoryQuery |
| 修改 | AI 可从本地候选中重新选择 3–5 项 | v1 中 AI 只允许改写理由，不改变本地排序和选择；Goal/Settlement 的自然语言解析仍保留 |
| 修改 | Roll 页以自然语言输入为主要入口 | 离线核心输入应是时间、精力、场景等结构化控件；自然语言备注只能是可选增强，离线时不得造成“输入了却无效果”的错觉 |
| 修改 | Goal 使用大量可空反馈字段 | 使用可辨识的 FeedbackConfig，并明确 progress/cumulative/experience 各自数据；公共字段与类型专属字段分开 |
| 修改 | Session 只有 startedAt、endedAt、actualMinutes | 增加 timerMode、lifecycleStatus、runningSince、accumulatedMs、targetDurationMs、lastHeartbeatAt 等恢复所需事实，并明确暂停段与系统时间异常策略 |
| 修改 | RewardEntry 只有 delta、unlockId、calculationVersion | 增加 idempotencyKey、entryType、reversalOfEntryId、ruleVersion；同一 Session 只允许一个有效结算 |
| 修改 | 第四阶段 UI 使用模拟数据 | 存储层完成后，最小 UI 必须连接真实用例和真实 SQLite；仅原生插件可由测试适配器替代 |
| 删除 | “直接复用并简化”多个外部项目的笼统指令 | 应逐段决定“概念参考、独立重写、带归属移植”三者之一，不能用一个词掩盖许可与维护成本 |
| 删除 | AI 返回候选池外 suggestion | 扩大提示注入、验证和产品边界；未来若需要，应作为独立的目标发现功能设计 |
| 删除 | 每个巨大阶段只能有一个 Git commit | 改成一个里程碑可含多个原子提交，里程碑结束时打标签并记录验收结果 |
| 延后 | whisper.cpp 与应用内麦克风 | 属于独立原生/模型分发项目，不应阻塞 v1；v1 只说明可使用系统输入法语音，并披露系统输入法可能有自己的网络行为 |
| 延后 | AI 对 Roll 的语言润色 | Goal 创建草稿与 Settlement 信息提取价值更明确；Roll 先用本地 reasonCode 模板即可 |
| 延后 | 完整像素宠物素材 | 先用静态占位验证奖励账本与无阻塞反馈，再制作素材和动画 |

## 必须先修正的结构问题

### P0：结算事务跨 Repository，但没有事务所有者

附件要求一次结算原子写入 Session、RewardEntry 和 CompanionState，同时又把它们拆成独立 Repository。若每个 Repository 自己管理连接，应用层无法保证原子性。

建议定义一个 `SettlementTransaction` 端口，由 SQLite 适配器在一个连接和一个事务中实现：

1. 校验 Session 尚未结算；
2. 固化用户确认的 Settlement；
3. 写入版本化 RewardLedgerEntry；
4. 更新或重建 CompanionProjection；
5. 以唯一 idempotencyKey 防止重复确认；
6. 失败则整体回滚。

### P0：Session 模型不足以支持暂停、强杀恢复和系统时间改变

`startedAt + elapsed` 适合 UI 状态，不足以表达多次暂停、倒计时目标、重启恢复和墙上时钟跳变。建议把时间读取封装为 `Clock` 端口，并持久化当前运行段与累计时长。通知只是尽力提醒，不能成为状态事实。

Capacitor 官方说明 Android 12+ 的精确通知可能需要额外设置，权限改变还会删除已排程通知；Android 13 也需要通知权限。因此通知拒绝、Doze 或通知丢失时，Session 仍必须在下次前台/重启时通过持久事实恢复。[Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)

### P0：Roll 惩罚项没有数据来源

评分包含 recentRejectionPenalty，但当前实体没有保存“这次 Roll 展示了什么、用户选择了什么、关闭了什么”。建议加入本地 `RecommendationRun`：保存输入上下文、候选 ID、各分项得分、reasonCode、最终排序和选择结果。没有明确拒绝动作时，不应把用户关闭页面自动解释为拒绝。

### P0：AI 重新选择候选会改变核心功能

草案一方面说 Roll 是确定性的，另一方面允许模型从八个候选中重新选择三到五个。这样在线与离线会得到不同结果，模型也实际参与了核心排序。

建议 v1 始终由本地引擎确定返回项；AI 最多根据候选 ID 改写说明，校验失败时直接使用本地 reasonCode 文案。这样“AI 只处理语义”才是可验证的架构约束。

### P0：本地优先没有覆盖操作系统备份与网络出口

“没有自建云服务”不等于“数据不会离开设备”。需要明确：

- Android Auto Backup 和 iOS 备份是否排除 SQLite、普通设置与密钥；
- 真实 API 密钥在 Web 调试环境中禁止持久化；
- WebView 使用 CSP 禁止远程字体、远程图片、脚本和任意导航；
- 所有模型请求只经 ProviderAdapter，UI 和领域代码不能直接 fetch；
- 导出文件明确不含密钥，并提示导出文件由用户自行保管。

Capacitor 生态存在活跃的 MIT Keychain/Keystore 插件候选，但应先审计并封装在 `SecretStore` 后；其 Web 实现不能提供等价安全性。[Aparajita Capacitor Secure Storage](https://github.com/aparajita/capacitor-secure-storage)

### P0：路线图过晚验证原生风险

原路线到最后阶段才 Android 打包，会把数据库插件、权限、冷启动、备份和通知问题推迟到大量 Web 代码之后。应在阶段 0 就让真实 Android debug build 完成 SQLite 往返、安全存储、本地通知、冷启动和导入导出风险探针。

## 建议的模块结构

```text
src/
  modules/
    goals/                 # Goal + ActivityTemplate 聚合、规则、用例、端口
    recommendations/       # Roll 请求、硬过滤、评分、RecommendationRun
    sessions/              # Flowtime/Countdown 生命周期、恢复、结算草稿
    rewards/               # 版本化账本、撤销、CompanionProjection
  app/
    workflows/             # 跨模块用例与事务编排
    composition/           # 唯一依赖装配入口
  adapters/
    sqlite/                # 迁移、查询、事务、导入导出
    secret-store/          # Keychain / Keystore
    notifications/         # 本地通知
    ai/                    # ProviderAdapter + Schema 校验
    files/                 # 版本化 JSON 导入导出
    clock/                 # 系统时钟与测试时钟
  ui/
    goals/
    roll/
    focus/
    settlement/
    history/
    shared/
```

依赖规则：

- modules 不导入 React、Capacitor、SQLite 或网络库；
- ui 只调用 app 暴露的用例；
- adapters 实现 modules/app 定义的端口；
- composition 是唯一允许同时引用用例和具体适配器的位置；
- 不引入插件系统、事件总线或通用工作流引擎。

## 建议的数据事实来源

| 数据 | 事实来源 | 备注 |
|---|---|---|
| Goal 与 ActivityTemplate | GoalCatalogStore / SQLite | FeedbackConfig 使用可辨识联合，不用大量空列冒充类型安全 |
| Roll 输入、候选与选择 | RecommendationRun / SQLite | 支持解释评分、拒绝惩罚和 30 天公平性仿真 |
| 计时生命周期 | SessionStore / SQLite | UI 每秒只重算显示，不逐秒写数据库 |
| 结算与奖励 | Settlement + RewardLedgerEntry / SQLite | 原子事务、幂等、反向账目；不删除历史 |
| 宠物等级与解锁 | RewardLedger 的可重建投影 | CompanionProjection 可缓存，但必须能从账本重建 |
| 普通设置 | SettingsStore / SQLite 或原生偏好 | 不含秘密 |
| API 密钥 | SecretStore / Keychain/Keystore | 不导出、不记录、不进入 Web localStorage |
| AI 调用历史 | 可选 AIInteractionLog / SQLite | 默认只存元数据和已验证输出；不存完整头部或密钥 |

另外需要消除重复事实：`Goal.companionAffinityXp`、`Goal.lastActivityAt`、`CompanionState.globalXp` 若保留为缓存，必须标记为投影并提供重建/校验；否则应从 Session/RewardLedger 查询计算。

## 技术栈二次评估

| 方案 | 成熟度/社区 | 与项目复杂度匹配 | 维护成本 | 学习曲线 | 结论 |
|---|---|---|---|---|---|
| React + Vite + Capacitor + SQLite | 高；Capacitor 活跃且支持现代 Web 项目 | 高：UI 普通、领域逻辑以 TS 纯函数为主 | 中：原生插件需随 Capacitor 主版本升级 | 低 | 推荐，但先做 Android 风险探针并固定插件矩阵 |
| React Native + Expo | 高；SQLite、SecureStore、Notifications 等官方模块较齐 | 中高：原生能力整合较顺，但 DOM/Web 复用减少 | 中：Expo SDK 与原生构建升级需持续跟进 | 中 | 若原生交互明显增长则更合适；当前不是最简单方案 |
| Flutter | 高；移动和 SQL 生态成熟 | 中：性能与一致性好，但本项目没有必须依赖 Flutter 的复杂 UI | 中 | 高：Dart、组件与测试生态全部重学 | 不推荐 |

Capacitor 仍是最简单且够用的方案，但“Web 技术栈”不代表“只做 Web 测试”。Capacitor 官方定位就是用现代 Web 项目承载跨平台原生应用，原生能力通过插件访问。[Capacitor 官方文档](https://capacitorjs.com/docs)

Capacitor 社区 SQLite 当前支持事务、JSON 导入导出和 Android/iOS/Web，但原生端链接 SQLCipher，并明确提示加密出口合规问题；版本和发布要求必须在风险探针中验证。[Capacitor Community SQLite](https://github.com/capacitor-community/sqlite)

## 外部项目的正确使用方式

| 项目 | 许可/现状 | 二审后的用途 |
|---|---|---|
| Sidejot | MIT；当前仓库地址已迁移/重定向 | 只参考结构化输出与卡片交互，不复制 Next.js 路由、Dexie 数据层或 Provider 绑定 |
| Perfice | MIT；本地优先但包含关联分析、同步与后端 | 只参考可辨识联合与接口/实现分离原则 |
| Super Productivity | MIT；Focus 模型包含 Pomodoro、休息周期和多种 UI/内部状态 | 不整体移植；根据本项目两个计时模式从头实现更小状态机。若复制具体代码，逐文件保留归属 |
| Loop Habit Tracker | GPL-3.0 | 只作为“平滑活跃度”概念来源；activityScore、常量和测试独立推导，不复制代码 |
| Habitica | 代码/素材许可复杂且产品含惩罚机制 | 从工程参考降为反例，不复制代码和素材 |
| whisper.cpp | 代码 MIT；模型权重需单独核查 | 移出 v1，作为独立实验 RFC |

来源核验：[Sidejot](https://github.com/sidejot/sidejot)、[Perfice](https://github.com/p0lloc/perfice)、[Super Productivity Focus 模型](https://github.com/super-productivity/super-productivity/blob/master/src/app/features/focus-mode/focus-mode.model.ts)、[Loop Habit Tracker](https://github.com/iSoron/uhabits)、[whisper.cpp](https://github.com/ggml-org/whisper.cpp)。

## 重排后的里程碑

### M0：治理与原生风险探针

- 初始化仓库、许可与贡献文档、ADR、依赖许可清单和 CI；
- Android debug build 验证 SQLite、迁移、SecretStore、本地通知、文件导入导出、冷启动；
- 设置网络/CSP/备份基线；
- iOS 暂不发布，但从一开始避免选择 Android 独占依赖。

### M1：Goal Catalog 与真实存储

- 手动创建、编辑、暂停、归档、恢复 Goal 和 ActivityTemplate；
- 使用真实 SQLite 与真实版本化导入导出；
- 内存适配器和 SQLite 运行同一组契约测试。

### M2：确定性 Roll 与最小 UI

- RecommendationRun、硬过滤、评分、reasonCode、公平性仿真；
- Goals + Roll 最小界面直接连接真实用例；
- 不接入 AI。

### M3：可靠会话、手动结算与 History

- Flowtime、Countdown、暂停/恢复、通知降级、强杀恢复；
- Focus、手动 Settlement、History；
- 完成第一个真实的全离线纵向闭环。

### M4：奖励账本与静态宠物反馈

- RewardLedger、幂等结算、反向账目、投影重建；
- 先静态视觉，再加入进化与最多两秒的非阻塞动画；
- 奖励阶段排在 AI 前，因为它属于核心产品承诺。

### M5：AI 语义适配

- 先 GoalDraft，再 SettlementDraft；
- ProviderAdapter、SecretStore、Zod、超时/取消/降级；
- AI 默认不改变 Roll 排序，所有结果先进入可编辑草稿。

### M6：可访问性、隐私与发布硬化

- 大字体、屏幕阅读器、深色、减少动态、无动画；
- 迁移失败、磁盘不足、时区变化、非法模型输出、网络出口和秘密扫描；
- Android 发布验收；iOS 适配随后进行，但平台兼容风险不应拖到最后才发现。

## 测试与审查策略调整

- 领域规则：Vitest 纯单元测试，时间、UUID 和随机性全部注入；
- 存储：内存与 SQLite 共享契约测试，另测事务、迁移、约束和回滚；
- Roll/Reward：确定性表格测试 + 固定种子的性质/仿真测试；
- Web UI：Playwright 只验证 Web 壳和用户流，不宣称覆盖原生插件；
- Android：每个涉及 SQLite、通知、安全存储、文件或生命周期的里程碑都运行真机/模拟器冒烟测试；
- AI：录制的 Provider contract fixtures、非法 JSON、缺字段、越界、超长输出、候选 ID 注入；
- 第一性原理与对抗性审查不只放在项目末尾：相关失败模式应在对应里程碑进入测试，最终文档负责汇总而不是首次发现。

## 二审后的确认决策

用户已确认选择方案 B，以下内容成为后续正式设计的总体方向：

1. 保留 Capacitor 技术栈，但加入 M0 原生风险探针；
2. 从“全局四层 + 实体 Repository”改为“按业务模块组织 + 明确事务端口”；
3. 把 AI 从 Roll 决策链移出，只保留语义草稿与可选文案；
4. 先完成真实离线纵向闭环和奖励账本，再接 AI；
5. 把第三方项目全部重新分类为概念参考、独立重写或带归属移植；
6. whisper.cpp 移出 v1。

下一步不是直接编码，而是把产品章程拆成总纲，并逐个确认：产品/交互结构、领域与数据结构、平台与安全结构、里程碑与验收结构。
