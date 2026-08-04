# Self Improvement Tracker 调研与发现

## 已知需求

- 项目暂定名为 Self Improvement Tracker（原文可能含拼写 `self improment`）。
- 产品目标为移动应用。
- 运行原则：完全开源、完全本地。
- AI 原则：仅在需要自然语言理解时，调用用户自行配置的大模型 API。

## 附件确认的产品边界

- 核心场景唯一且明确：用户有一段空闲时间但不知道做什么时，从长期目标/兴趣池中给出 3–5 个当前可执行行动；随后计时、自然语言结算，并给出克制的宠物视觉奖励。
- 明确排除：待办、日历、习惯打卡、能力精确量化、完整 RPG、云账户、远程数据库、追踪分析、社交、广告和非用户主动发起的网络请求。
- 离线闭环必须完整：Goals、Roll、计时、手动结算、奖励和历史都不能依赖 AI 或网络；模型失败时仅失去语义整理/解释能力。
- 首发 Android，随后 iOS；领域逻辑必须平台无关。
- 三个主入口：Goals、Roll、History；Focus 和 Settlement 是流程页，不进入底部主导航。

## 附件指定的技术与架构

- TypeScript + React + Vite + Capacitor；SQLite 通过 Capacitor SQLite 接入。
- 四层结构：domain、application、infrastructure、ui。
- UI 只调用应用用例；用例依赖 Repository 接口；SQLite 与内存实现遵守同一契约。
- SQLite 是持久领域事实来源；React/Zustand 仅存临时 UI 状态与未确认草稿。
- Vitest 覆盖领域/Repository/Roll/Reward；Playwright 覆盖 Web 外壳；Android 最小原生冒烟测试。
- API 密钥进入系统安全存储；ProviderAdapter 支持 OpenAI 兼容接口；所有 AI 输出先经 Schema 校验并进入草稿，确认前不写正式数据。

## 附件指定的产品模块

- 领域实体：Goal、ActivityTemplate、Session、RewardEntry、CompanionState、AppSettings。
- 纯确定性服务：RollEngine、RewardEngine、ActivityStateEngine。
- 三类 GoalFeedbackModel：progress、cumulative、experience。
- Flowtime 与 Countdown 两类计时；永久事实基于绝对时间，不基于逐秒递减的 JS 状态。
- Roll 先硬过滤，再线性评分；AI 只能在本地候选池中重述/选择/解释，不能改变确定性规则。
- 奖励采用版本化账本；结算事务原子化；撤销以反向 RewardEntry 完成。
- 宠物只提供正向、克制反馈：一个宠物、三个进化阶段、四种状态；无惩罚、无掉级、无负面胁迫。

## 许可证与供应链约束

- 原创代码 MIT；原创像素素材优先 CC0，否则单独标 MIT。
- 引入前审查第三方代码、素材与模型并登记 `THIRD_PARTY_NOTICES.md`。
- Sidejot、Perfice、Super Productivity、Capacitor、Capacitor SQLite、whisper.cpp 属 MIT 参考/复用候选；复用代码需保留声明。
- Loop Habit Tracker 与 Habitica 只能作为设计参考，禁止复制 GPLv3 代码；Habitica 的 NC 素材也禁止引入。
- 发布前需检查 Capacitor SQLite/SQLCipher 相关加密出口要求，以及 whisper.cpp 模型权重许可与包体积。

## 项目拆分判断

- 附件覆盖八个开发阶段、多个独立高风险子系统和发布级审查，规模明显大于单一规格。
- 建议将总愿景作为产品章程，先只对“阶段 0：仓库治理与可验证领域/存储基础”做可实施规格；Roll、计时、UI、AI、奖励/宠物、可访问性和发布分别后续独立设计。
- 附件已直接指定主技术栈，因此技术评估重点不是重新发明框架，而是验证该方案与备选方案的风险及维护成本。
- 用户没有接受直接进入首个阶段设计，要求先把整个附件视为待审查草案，对全项目结构进行第二轮审查；此前的拆分建议不视为已批准决策。

## 过程发现

- 当前工作目录未发现既有 `task_plan.md`、`findings.md`、`progress.md`、`AGENTS.md` 或 `README`。
- 当前目录不是 Git 仓库，除三个新建的规划文件外没有其他项目文件。
- MemSkill 已识别项目 ID 为 `self-improvement-tracker`，但召回结果没有该项目的有效历史记忆。
- 附件首次按系统代码页读取时出现乱码；显式 UTF-8 解码后完整恢复。

## 第二轮结构审查：外部事实核验（进行中）

- Capacitor 当前仍活跃，但按 Android SDK 节奏每年发布主版本；架构必须隔离 Capacitor/原生插件边界，并固定兼容版本，不能把升级成本当成零。
- `@capacitor-community/sqlite` 仍覆盖 Android、iOS、Web 和 Electron，支持事务及 JSON 导入导出；原生端即使使用未加密数据库也会链接 SQLCipher，并明确提示加密出口申报风险。其当前 Android 说明要求较新的 JDK/SDK，证明发布工具链本身应单列为风险流。
- 附件中的 Sidejot 旧地址当前重定向到 `sidejot/sidejot`；项目为 MIT，但它的 Next.js、Dexie、Zustand、OpenRouter/Vercel AI SDK 组合与本项目无服务端、SQLite、ProviderAdapter 的目标差异较大。适合借鉴交互与结构化输出思路，不适合按“代码复用源”管理。
- Perfice 当前仍为 MIT、本地优先且使用 Capacitor Android 包装；被点名的 Trackable 可辨识联合与 collections 文件存在。但 Perfice 同时包含关联分析、同步和后端等本项目明确排除的能力，建议只提炼建模原则，不复制其领域模型或数据库抽象。
- Super Productivity 的 Focus Mode 模型和策略文件当前存在；模型同时包含 Pomodoro、休息周期、UI 屏幕和多种内部标志。附件要求的 Flowtime/Countdown 远小于该状态机，直接移植再删除 Angular/多余状态会继承不必要复杂度。建议根据明确行为从头写一个小型会话时钟领域模型；若确实复制代码，再按 MIT 保留归属。
- Loop Habit Tracker 当前明确采用 GPL-3.0，附件“只参考算法、不复制代码”的限制正确；甚至不应沿用其函数命名、常量或测试向量，activityScore 应由本项目需求和独立测试推导。
- Habitica 仓库当前仍把产品定位为带惩罚的 RPG，并单独链接代码许可；它与本项目“无惩罚、克制奖励”的原则相反。二审建议把 Habitica 从工程参考源降为反例/产品边界说明，不再让其任务结算实现影响模块设计。
- whisper.cpp 项目仍活跃，但它涉及原生 C/C++、平台桥接、模型权重、包体和性能；继续放在 v1 总结构中会扩大移动发布面。应移出 v1 路线，仅保留系统输入法语音说明，离线 ASR 作为发布后独立实验 RFC。

## 第二轮结构审查：技术栈比较（进行中）

- Capacitor 的优势是保留 React/Vite/Web 测试经验，领域代码可保持普通 TypeScript；代价是数据库、安全存储、本地通知和后台行为依赖多个原生插件，各插件必须与 Capacitor 主版本锁步，集成风险集中在基础设施层。
- React Native/Expo 目前由官方维护 SQLite、SecureStore、Notifications 等模块，Android/iOS 能力组合更完整；但 UI 不再是 DOM，既有 Web 组件/Playwright Web 外壳策略需改写，原生测试与新架构升级成本更高。
- Flutter 的 SQL/移动平台方案成熟、运行时一致性好，但需要 Dart 与全新 UI/测试生态，和附件偏好的 TypeScript/React 复用目标冲突，当前看属于高迁移成本备选。
- 计时恢复不应依赖任何“后台 JS 每秒运行”能力。Expo 官方也明确后台任务是系统择机执行且杀死应用后会停止；正确结构仍是持久化绝对时间 + 安排本地通知 + 前台/重启时重算状态。
- Capacitor 草案存在一个关键遗漏：官方 Preferences 不等于安全存储，而当前较完整的 Capawesome Secure Preferences 是付费 Insiders 插件，且 Web 端不加密。完全开源目标下不能默认采用它；必须在开工前选定并审计一个真正开源的 Keychain/Keystore 适配器，或自行维护极小原生桥接。
- Capacitor SQLite 的 SQLCipher 与 API 密钥安全存储是两件事：即使数据库链接 SQLCipher，也不应把模型密钥放入 SQLite；`SecretStore` 必须是独立端口，导出和清库流程不得触碰密钥。
- 进一步核验后，完全开源的 Capacitor 安全存储候选并非不存在：`@aparajita/capacitor-secure-storage` 与 `capacitor-secure-storage-plugin` 均标注 MIT，并使用 iOS Keychain / Android Keystore。二审应把问题改写为“开工前固定一个经审计的 MIT 实现并封装在 `SecretStore` 后”，而不是自行造原生桥接；Web 调试环境不得持久化真实 API 密钥，因为这些插件在 Web 上只能退化到未加密 localStorage。
- Capacitor 官方本地通知可无服务端调度，但 Android 13 需要通知权限，Android 12+ 精确定时还受 exact alarm 设置影响，Doze/私密空间也会影响可见性。倒计时完成必须以领域时钟恢复结果为准；通知只是尽力提醒，权限拒绝或通知丢失不能改变 Session 状态。
- 严格“本地”还需处理操作系统备份：SQLite、普通偏好和安全存储的 Android/iOS 备份策略必须明确。若承诺数据不离开设备，应默认排除云备份；否则文案必须诚实说明系统备份可能发生。

## 第二轮结构审查：总判断

- 技术栈保留 React/Vite/Capacitor/SQLite，但新增 M0 Android 原生风险探针并锁定插件兼容矩阵；Expo 为可行备选，Flutter 不符合最小学习/迁移成本原则。
- 代码组织从全局四层目录改为按 Goals、Recommendations、Sessions、Rewards 四个业务模块组织，每个模块内部保持 domain/application 边界；adapters、ui 与 composition 分离。
- 结算需要独立 `SettlementTransaction`，Roll 需要持久 `RecommendationRun`，时间需要 `Clock` 端口，密钥需要独立 `SecretStore`。
- v1 的 AI 不再改变 Roll 的选择和顺序；GoalDraft 与 SettlementDraft 仍属于合适的语义用例。
- 开发顺序改为：原生风险探针 → Goal/真实存储 → 确定性 Roll/最小 UI → 可靠 Session/手动结算/History → Reward/宠物 → AI → 发布硬化。
- 完整结论已写入 `docs/reviews/2026-08-04-project-structure-second-review.md`。
- 用户于 2026-08-04 明确确认方案 B；可视化点击记录曾在 A/B 间比较，最终浏览器选择和对话文字均落在 B。该方向现为已批准总体架构，不再是候选建议。

## 基本 MVP 截止范围

- 包含：真实本地持久化、Goal/ActivityTemplate 管理、确定性 Roll、Flowtime/Countdown、手动结算、奖励账本、静态宠物反馈、History、版本化导入导出、Capacitor Android 工程和自动化测试。
- 暂不包含：LLM Provider/自然语言草稿、完整像素动画、whisper.cpp、iOS 发布、账户/云/分析/社交。
- 该边界不是把最终产品缩小，而是用户明确要求的“基本 MVP”截止点；模块接口仍遵守已批准的本地优先与 AI 隔离原则。

## MVP 启动环境

- 当前工作区只有规划/审查文档，没有 Git 仓库或应用源码；需要从治理和脚手架开始。
- Node.js `v25.8.2`、npm `11.12.1`、Java 21 已可用。
- `ANDROID_HOME` 与 `ANDROID_SDK_ROOT` 未设置；需在 M0 风险基线中查找本机 Android SDK，找不到时仍可生成 Android 工程并完成 Web/TypeScript 验证，但不能把原生构建误报为已验证。
- `writing-plans` skill 未出现在当前可用技能列表；在已批准方案 B 下，用现有 `planning-with-files` 和项目内实施计划作为最小安全回退。
