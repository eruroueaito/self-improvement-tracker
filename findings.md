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
- 2026-08-04 npm 核验的兼容基线：React 19.2.8、Vite 8.2.0、Capacitor 8.5.0、Capacitor Community SQLite 8.1.0、Capacitor Local Notifications 8.2.1、Vitest 4.1.10，均标注 MIT；SQLite/通知插件 peer dependency 均接受 Capacitor Core 8+。
- Playwright Test 1.62.1 标注 Apache-2.0，Node 要求 >=20，与当前环境兼容。
- 常见 Android SDK 目录未找到，但 `D:\tools\platform-tools\adb.exe` 存在；当前证据只证明 platform-tools 可用，不证明 Gradle Android 构建所需的 SDK Platforms/Build Tools 已安装。
- 进一步检查确认没有可调用的 `sdkmanager` 或系统 Gradle，`D:\tools` 也只有独立 platform-tools；本机当前不能证明具备 Android SDK。Capacitor 自带 Gradle Wrapper 可在工程生成后使用，但仍需要后续 SDK 平台包。

## MVP 独立规格审查

- 第一轮独立审查确认总体边界可实施，但指出确定性 Roll 若只有区间没有公式，会让实现和测试产生不同排序；评分公式、舍入、历史集合和 cadence 优先级必须全部落到规格。
- Goal 的 progress/cumulative/experience 采用事实派生视图，避免结算和撤销重复修改 Goal 聚合字段；progress 以 baseline 加未撤销有效完成的 quantity 推导。
- “有效完成”统一为 settled、未撤销、completed 且 completionRatio >= 0.5；部分/中断投入仍可获得按比例 XP，但不推进 cadence、rest、times 等长期反馈。
- 全量清空与示例数据清理不能共用含糊文案；MVP 默认不写示例数据，设置中的操作明确为二次确认后的全量本地事实/投影清空。
- 导入后的 CompanionProjection 必须从 RewardLedger 重放重建，不能信任导出缓存。

## 基本 MVP 实现与验证结论

- Capacitor SQLite 的 `execute/run` 默认 `transaction=true`；已经显式开始外层 SettlementTransaction 时，所有内层调用必须传 `false`，否则“看起来有事务”的代码仍可能分段提交。
- Android WebView 的普通 Blob download 不能作为可靠移动端导出证据；MVP 通过 Filesystem cache + 系统 Share sheet 交付 JSON，浏览器仍保留本地下载适配器。
- Android 清单默认的 `allowBackup=true` 和 INTERNET 权限不符合本项目完全本地边界；已关闭备份/明文流量并移除网络权限。
- `npm audit --omit=dev` 为 0；完整 audit 的 3 个 moderate 都位于 Capacitor CLI → xcode → uuid 的开发期 iOS 解析链，不进入 Android 运行时包。
- Gradle wrapper 两次有限下载均未获得任何分发包字节，且本机没有完整 Android SDK；APK 构建不能声称通过。Android 工程生成、四插件识别与 cap sync 已独立通过。
- 初次超时安装产生的可重建损坏 node_modules/lockfile 已清理；源码、文档和本地产品数据未删除。

## Post-MVP 路线差距（2026-08-04）

- 基础 MVP 已在 `998d494` 完成；后续计划必须把该提交视为基线，不重复 Goals、确定性 Roll、Session、手动结算、RewardLedger、静态伙伴、History 和导入导出。
- 当前最高优先级风险不是新功能，而是 Android 原生证据缺口：尚未完成 `assembleDebug`、安装到模拟器/真机、SQLite 冷启动恢复、通知权限拒绝、后台/强杀恢复和系统文件分享的原生冒烟验证。
- 当前 `AppSnapshot.schemaVersion` 固定为 1，`DataStore` 只有整包 `load/replace`；进入 AppSettings、AI 调用历史、伙伴状态和更多活动管理前，必须先建立可回滚迁移与 SQLite 契约测试门槛。
- 当前代码没有 `ProviderAdapter`、`SecretStore`、`SettingsStore`、GoalDraft/SettlementDraft Schema 或 AI 历史；这些应作为独立 AI 基础阶段加入，不能塞进现有 UI 或领域引擎。
- 当前伙伴只是 `CompanionProjection` 加 emoji 展示；三阶段像素素材、四种正向状态、活动状态计算、解锁物品和无动画降级仍未实现。
- 当前已具备 `prefers-reduced-motion` 基础样式和语义标签，但深色模式、系统字体缩放矩阵、屏幕阅读器验收、触觉反馈开关、通知设置与系统输入法语音说明仍缺失。
- 原始八阶段顺序需要按现状重排：原生发布门槛先行，随后补齐离线产品/数据可靠性，再做完整伙伴，之后依次接入 GoalDraft 和 SettlementDraft；AI 的 Roll 文案润色是可选项且不得改变本地候选 ID 或顺序。
- whisper.cpp 从 v1 关键路径移除，只保留发布后的独立 RFC；iOS 适配在 Android v1 达标后启动。

## N0 启动发现（2026-08-04）

- 用户已把持续目标明确为从 N0 开发到 N7，并以 N7 完成作为唯一截止目标。
- N0 首轮环境探测确认 Java 21 可用；独立 `D:\tools\platform-tools\adb.exe` 能启动 adb server，但当前输出没有列出已连接设备。
- 首轮批量环境探测没有可靠回显 Node、SDK 候选目录和 Gradle cache 细节；不能据此判断这些项存在或不存在，下一步改用显式结构化输出分别核验，不重复依赖该批量输出。
- 分项核验确认 Node `v25.8.2`、npm `11.12.1` 位于 `C:\Program Files\nodejs`；它们可运行，但 Node 25 不是 N0 推荐的 LTS 固定基线。
- Java 21 可运行，但 `JAVA_HOME` 未设置；命令入口来自 Oracle javapath，需要为 Gradle 确定真实 JDK 目录。
- `ANDROID_HOME`、`ANDROID_SDK_ROOT`、`sdkmanager` 和系统 Gradle 均不存在；常见 Android Studio/SDK 路径也不存在。
- `D:\tools\platform-tools` 只包含 adb/fastboot 等平台工具；Gradle 8.14.3 wrapper cache 不存在，因此 N0 必须安装 SDK command-line tools、Platform 36/Build Tools 并获取 Gradle 分发包。
- Codex 工作区自带 Node `v24.14.0`，可作为不改用户全局 Node 安装的 N0 LTS 构建运行时；后续用版本文件和 `package.json.engines` 固定 Node 24。
- Java 的真实目录是 `C:\Program Files\Java\jdk-21`；可在任务进程内设置 `JAVA_HOME`，无需修改用户全局环境。
- Android 工程当前使用 Android Gradle Plugin `8.13.0`、compile/target SDK 36 和 Gradle `8.14.3-all`；wrapper 仍指向 `services.gradle.org`，本地 cache 未命中。
- 官方 Android 下载页当前提供 Windows command-line tools `15859902`（155.7 MB，SHA-256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`）；官方建议脚本固定具体版本，而不是长期跟随 `latest`。
- 官方 AGP 8.13 兼容表要求至少 Gradle 8.13、Build Tools 35.0.0、JDK 17，最大 API 36.1；当前项目的 Gradle 8.14.3、JDK 21、compile SDK 36 位于兼容边界内。
- Gradle 官方分发目录确认 `gradle-8.14.3-all.zip` 与校验文件存在；N0 下载后应校验 SHA-256，再交给 wrapper 使用。
- 官方下载页明确 command-line tools 受 Android SDK License Agreement 约束；SDK 包安装必须保留许可证接受记录，不把下载工具混入仓库或发布包。
- N0 独立规格首轮审查发现四项必须修正：CI 必须强制构建 debug-signed APK；Node/npm/JDK/SDK/Gradle 和 CI 浏览器必须精确固定；通知允许态必须证明排程/展示/取消；飞行模式之外还要以 merged manifest、CSP、静态扫描和在线请求记录证明无意外出口。
- Gradle 8.14.3 all 分发包的官方 SHA-256 为 `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`。
- 当前 Playwright 配置硬编码本机 Edge，CI 不能复用；N0 应改为默认 Playwright Chromium，并只通过可选环境变量保留本机 Edge 交叉验证。
- 当前 `index.html` 无 CSP；产品源码静态扫描未发现 fetch/XHR/WebSocket/远程资源，唯一 URL 命中是本地 data favicon 和 XML namespace，但仍需把这一边界变成自动化门槛。
- NativeNotificationService 已使用 `allowWhileIdle: true`，通知始终只是提醒；N0 原生测试需区分“允许态确实展示/取消”和“Doze/权限拒绝时 Session 事实仍正确”。
- N0 第二轮规格复审结果为 Approved，可以进入实现。
- N0 工具链固定方案不改用户全局 Node/Java：仓库固定 Node 24.14.0/npm 11.12.1，当前进程使用 Codex Node 24 与现有 npm CLI；Android SDK 用显式 `SdkRoot` 安装，Gradle wrapper 以官方 SHA 校验。
- 用 Node 24 直接调用 `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` 得到 npm 11.11.1，和 `npm.ps1` 在 Node 25 下显示的 11.12.1 不一致；N0 将在被忽略的 `.tools/npm` 安装精确 npm 11.12.1，避免修改用户全局安装。
- 首次执行 Windows SDK 安装器时，系统 curl 连接官方 `dl.google.com` 约三分钟仍未创建下载文件（0 字节）；已终止而非继续盲等，安装器改用 Windows BITS，缺少 BITS 时才回退 Invoke-WebRequest。
- BITS 已成功下载完整的 155,655,386 字节 command-line tools，并通过安装器解压到 `D:\Android\Sdk\cmdline-tools\latest`；后续 sdkmanager 许可证/组件阶段仍在运行。
- 非管理员调用 `Get-BitsTransfer -AllUsers` 返回 Access denied；这是诊断命令权限限制，不影响已完成的 BITS 文件下载，不需要提权。
- sdkmanager 已完成许可证子进程并进入明确的组件安装命令：platform-tools、platforms;android-36、build-tools;35.0.0、emulator、API 36 Google APIs x86_64；Java 进程对 Google 443 连接已建立。
- sdkmanager 组件进程随后数分钟 CPU 几乎为零且 SDK 目录保持 179,901,603 字节不变；已终止批量安装。command-line tools 保留，下一步改为 BITS 下载官方仓库元数据并逐包安装，先构建组件、后模拟器。
- BITS 成功下载官方 `repository2-3.xml`（406,352 字节）；元数据确认 Windows 构建包为 `platform-36_r02.zip`、`build-tools_r35_windows.zip`、`platform-tools_r37.0.1-win.zip`，模拟器稳定/候选条目需按版本和 URL 进一步固定。
- Android repository XML 的 archive 使用 `<host-os>` 与 SHA-1 checksum；逐包安装器需按 XML local-name 解析，不能依赖 PowerShell 属性名自动映射。
- 稳定模拟器固定为 `emulator-windows_x64-15917651.zip`（37.1.11，SHA-1 `54fa750822ff462d57e04fc8e98e60f08df2bb61`）；API 36 Google APIs x86_64 镜像为 `x86_64-36_r07.zip`（约 1.90 GB，SHA-1 `c6bf44bdcd885bb902b4ba752d111a073ad7a817`）。
- 构建包 SHA-1：platform-tools 37.0.1 `e03e78b1d80b396f1c3358e31251cb31740e1110`；Platform 36 r02 `2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576`；Build Tools 35.0.0 `af059bb67cf7786f45ee0db85e2d24985df1b4b6`。
- Windows PowerShell 5.1 对无 BOM UTF-8 `.ps1` 仍可能按系统代码页解析；新增中文错误文本触发了解析器字符串错位。安装器的模块头和运行时文本改为 ASCII English，避免依赖 BOM 或全局代码页。
- 修改后的安装器已确认只含 ASCII 并能被 PowerShell 5.1 解析；逐包运行已启动，但首个目标归档尚未出现在唯一临时目录，需确认是否仍停在 license 子步骤。
- 逐包重试确认停在 `sdkmanager --licenses` 的远端读取，且没有生成 licenses 目录；已终止。安装器现在要求显式 `-AcceptSdkLicense`，本地逐包下载不再依赖 sdkmanager 网络，CI 仍运行并记录官方 sdkmanager license step。
- BITS 逐包安装已成功完成 Platform Tools 37.0.1、Platform 36 r02 和 Build Tools 35.0.0；每个归档都通过官方大小和 SHA-1 校验，SDK 根目录为 `D:\Android\Sdk`。
- Gradle 8.14.3 all 归档已通过 BITS 完整下载为 224,584,249 字节并进入 7,500+ 文件解压；PowerShell 进程持续消耗 CPU，属于实际解压进度而非网络卡死。
- Gradle 8.14.3 最终安装到仓库忽略目录 `.tools/gradle/gradle-8.14.3`；首次环境验证仅因 Node `shell:true` 错误拆分带空格的 `.bat` 路径而失败，SDK/Gradle 文件本身存在。
- `cmd.exe /c` 的第二种引用形式仍把外层转义字符当作命令文本；本地环境验证改为直接用 Java 调用 Gradle launcher JAR，完全绕开带空格 `.bat` 的 shell 转义，CI 仍验证 wrapper。
- N0 精确环境验证已通过：Node 24.14.0、npm 11.12.1、JDK 21.0.6、SDK 36、Build Tools 35.0.0、Gradle 8.14.3。
- 精确 Node/npm 下 `npm ci` 已重建 228 个包，build 与 cap sync 通过并识别 4 个原生插件；runtime audit 仍需单独按 `--omit=dev` 复核。
- 首次直接 Gradle 构建命令在 `android/` 工作目录错误使用了仓库根相对 `.tools` 路径，导致 launcher 为空并让 Java 把 Gradle 参数当 JVM 参数；未进入 Gradle 或修改构建产物。
- 绝对 launcher 重试已进入真实 Gradle 进程；Gradle modules metadata cache 出现约 137 KB 内容，Java 连接本机代理端口 4887，但尚无 APK 或完整依赖缓存，需继续观察实际增长。
- `assembleDebug` 再观察约两分钟后 CPU、文件数、137,278 字节 cache 和最新写入时间完全不变；已终止该 Java 网络进程。下一步先核对代理配置，不重复相同 Gradle 在线等待。
- Windows Internet Settings 启用了 `127.0.0.1:7897`，但无 PROXY/GRADLE/JAVA 环境变量、无用户 Gradle properties，WinHTTP 也是 direct；Gradle 未自动继承系统代理。
- 显式引用 JVM 代理参数后 Gradle cache 从 137 KB 增长到约 105 MB/572 个文件，证明代理构建路径有效；当前仍在构建，不能只凭依赖下载宣称 APK 完成。
- 首次代理构建继续增长到约 779 MB/10,120 个 Gradle cache 文件，最新写入持续更新；APK 尚不存在，进程仍在依赖/转换阶段。
- 本地 `assembleDebug` 最终以 exit 0 完成；APK 25,205,649 字节，SHA-256 `1d4d00c230f23acd3bdbd3e1fe9a8c5c2efdefd922a52fdf9ab8503f3f7bd047`，v2 debug 签名有效，包名 `dev.selfimprovement.tracker`，min/target/compile SDK 为 24/36/36。
- merged manifest 直接扫描确认无 INTERNET，但网络验证器因通用文件收集器只允许源码扩展而漏掉 `.xml`；已改为对 merged manifest 使用独立 `.xml` 扩展集合。
- APK badging 显示 SQLite 插件合并了当前未使用的 USE_BIOMETRIC/USE_FINGERPRINT；N0 使用 no-encryption，manifest 已用 `tools:node="remove"` 显式剔除，待重建验证。
- 增量重建已通过：新 APK SHA-256 为 `5ae8393023016f1462af85a825b927f43b0e9e2968d0bafd1cee90fb03ddecfe`，v2 签名有效，最终 badging 无 INTERNET/USE_BIOMETRIC/USE_FINGERPRINT；网络边界检查覆盖 38 个产品文件与 2 个 manifest。
- Emulator 37.1.11 已安装；API 36 system image 的 1,895,447,397 字节归档通过大小与官方 SHA-1 后，PowerShell 5.1 `Expand-Archive` 在 ZIP64 解压阶段失败。安装器改用 Windows `tar.exe`，避免该实现限制。
- ZIP64 修复后 API 36 system image 安装成功；`avdmanager` 随后识别到平台和镜像，但 standalone emulator 归档本身不含 SDK `package.xml`，所以需要由固定版本安装器补写本地包登记元数据。
- 专用 AVD 已创建；首次启动日志确认镜像、磁盘与宿主兼容性检查通过，但最终 WHPX/AEHD 加速检测返回 code 6。宿主显示固件虚拟化与 HypervisorPresent=true，当前会话无权读取/更改需提升权限的 Windows Optional Features，因此先走 emulator 官方支持的 `-accel off` 软件回退验证。
- x86_64 `-accel off` 实例持续 ADB offline 且 QEMU CPU 近零，不能作为可用门槛。官方元数据确认同版 API 36 Google APIs arm64-v8a r07：1,872,691,175 字节、SHA-1 `5a99183b6d924da606260e45fd41a3eb8eca6eb7`；安装器增加显式 ARM64 回退开关。
- 实测 QEMU2 明确拒绝在 x86_64 Windows 宿主运行 ARM64 AVD，因此 ARM64 不能作为回退。code review 已移除该开关，并发现/修复现有包仅凭目录跳过、下载回退声明不实、JDK build/Platform Tools 核验不足和 CI license 退出码被掩盖的问题。
- N0 runtime 依赖审计为 0 漏洞；完整依赖树仍有 3 个 moderate 开发链告警，不影响发布包，后续供应链阶段继续处理。
- Playwright 固定 Chromium 在本机下载受直连超时/代理 TLS reset 阻断；备用 Edge 通道完成 1 项全闭环 E2E（14.2 秒）并证明没有 localhost 之外请求。CI 配置没有降级，仍强制安装默认 Playwright Chromium。
- 固定 npm 已把 Node/npm engines 同步进 package-lock 根元数据，未改变任何依赖版本。
- N0 最终可运行本地链通过：精确环境、TypeScript、6 files/14 tests、runtime audit 0、38 个产品文件与 2 个 manifest 网络检查、Vite build、4 插件 cap sync、Edge E2E、assembleDebug、APK v2 签名/权限/哈希和 CI YAML 解析。
- 原生运行唯一剩余环境门槛是 WHPX/物理设备：API 36 x86_64 AVD 已创建，宿主 `emulator-check accel` 返回 6；该操作需要 Windows 功能变更与重启，当前非提升会话不能安全代办。
- 自动续跑复核确认宿主自 2026-07-24 未重启、`emulator-check accel` 仍为 6、adb 仍无设备；N0 原生门槛没有外部状态变化。
- N1 路线已获用户对 N0–N7 总体方案授权；当前先按 brainstorming 工作流深化版本迁移、AppSettings、原子恢复与导入导出 v2 的独立规格，实现在书面规格审查/用户复核前不启动。
- 当前 `DataStore.replace` 已是完整快照原子提交边界，`MvpApplication.commit` 只在持久写入成功后替换内存快照；N1 应保留这一可靠结构，不全面重写 Repository。
- SQLite 当前每次初始化都 `INSERT OR REPLACE schema_version=1`，`load` 也硬编码 v1 且不读取 app_meta；这是 v1→v2 迁移的首要真实缺陷。
- SQLite 的领域表保存 JSON payload，表结构本身无需为 v2 大改；可在同一连接事务内读取 v1、补 AppSettings、写回 v2 并最后更新 schema_version，失败即 rollback。
- 浏览器存储 key 固定为 `self-improvement-tracker:v1`；N1 不应换 key 遗失现有开发数据，而应在原 key 内识别/迁移快照版本。
- 当前 `AppSnapshot` 把 `schemaVersion` 固定为字面量 1，导出 envelope 和导入校验也只支持 v1；N1 需要显式 `PersistedSnapshotV1`、`CurrentAppSnapshot(v2)` 与 v1/v2 envelope 联合，而不是用可选字段模糊兼容。
- 当前导入在选中文件后立即替换，没有数据规模预览或二次确认；N1 需要先完整解析/校验并返回 counts/settings 摘要，再由 UI 确认后调用同一受验证导入路径。
- `importValidation.ts` 已集中完成事实、引用和账本校验；v2 不应复制整套校验，而应把“envelope 解析/版本迁移”与“当前事实校验”分层复用。
- 推荐最小迁移边界：`DataStore.load` 返回明确的 v1/v2 persisted union，应用初始化调用纯 `MigrationRunner` 得到 CurrentAppSnapshot；只有迁移和校验全部成功后才用现有原子 replace 写回 v2。这样浏览器/SQLite 共用迁移，失败不触碰旧数据。
- AppSettings v2 只保存非秘密字段：theme(system/light/dark)、motion(system/reduced/none)、haptics、notifications、AI 总开关、AI history；默认 AI 与 AI history 均关闭。Provider key 不属于该类型。
- N1 不新增独立 settings store：非秘密设置是当前快照的一部分，沿用 DataStore 原子提交；SecretStore 明确留到 N4。
- 原始需求明确把 AppSettings、模型调用历史都列为本地数据，并要求每个 AI 功能可单独关闭、AI 历史可关闭；因此 v2 的 AI 开关属于持久设置底座，但本阶段不接入网络或模型。
- `998d494` 的真实 v1 形状与当前基线一致：七组事实/投影、SQLite payload 表、app_meta=1、localStorage 原 key 和 v1 envelope。N1 测试应直接保存这一形状为 fixture，避免用 v2 类型伪造“旧数据”。
- 导入 v2 的兼容路径应为：解析 envelope version → v1/v2 数据转 persisted snapshot → 运行同一迁移链 → 当前事实/设置校验 → 生成预览；确认后才原子 replace。v1 导出继续可导入，但新导出只生成 v2。
- SQLite 插件的 `createConnection(version)` 与 `addUpgradeStatement` 管理原生数据库/DDL 版本；项目的 `app_meta.schema_version` 管理应用快照数据版本。N1 规格必须显式区分两者：插件升级只创建 v2 settings 表，纯 MigrationRunner 负责数据补全和校验。
- 插件 npm 包未附 README 所链接的增量升级文档，但本地类型确认 `addUpgradeStatement(database, capSQLiteVersionUpgrade[])` 和连接 version 均可用；实现前应直接依据已安装版本类型/API，而非网络示例。
- 已安装 SQLite Android 源码确认 `capSQLiteVersionUpgrade` 只有 `toVersion/statements`，插件会按版本顺序在事务内执行 DDL，成功后设置原生 DB version；N1 可用它仅创建 `app_settings` 表，应用数据迁移仍由纯 runner 完成。
- v1→v2 的安全顺序应为：打开前记录数据库是否已存在 → 既有库在未注册 upgrade statement 的检查连接中读取 native version、app_meta 与必需表结构 → 拒绝不一致状态 → 注册 DDL upgrade 并以 target 2 打开 → 仅对“新建且已证明为空”的数据库初始化 meta2 → native2+meta1 执行纯迁移与校验 → 单次 replace 写 settings，并只在同一事务的最后更新 meta2。
- N1 独立规格首轮审查发现两项 High：缺少 SQLite DDL/app_meta 完整状态矩阵；“原始恢复备份”可能把非法 settings 秘密导出。规格已改为 existence-aware 新库初始化、明确 `DDL2+meta1` 重试态，并只允许深度白名单恢复导出。
- N1 独立规格第二轮确认恢复导出问题已关闭，但指出 `998d494` 从未执行 native upgrade statement，因此真实 `user_version` 是 0 而非 1。已按插件 `Database.open`/`UtilsUpgrade` 源码修正为升级前预检、`0→2`、DDL 失败恢复到 `0+meta1`、数据失败停在 `2+meta1`，并在升级前拒绝任意 `native<2+meta2`。
- 自动续跑再次确认系统自 2026-07-24 未重启、ADB 无 ready 设备、emulator accel 仍返回 6；`HypervisorPresent=True` 只证明 hypervisor 已加载，不证明 WHPX API 可供 Android Emulator 使用。DISM 读取可选功能状态需要管理员权限，本轮不提权。
- N0 原生冒烟可在等待设备期间继续自动化：脚本负责唯一设备选择、API 级别、安装/启动/进程、无 INTERNET、通知权限、网络状态、SQLite 文件存在、alarm 与应用错误证据；Goal/Roll/Session/通知展示/分享面板等语义体验仍需人工操作，不能由 ADB 元数据冒充。
- 实机不可用时，smoke runner 的编排正确性仍可通过注入 fake ADB 做契约测试；fixture 必须在文档与输出中明确为非原生证据，并覆盖成功路径以及 API、设备选择、安装哈希、INTERNET 权限和崩溃拒绝路径。
- 用户已于 2026-08-04 明确批准 N1 书面规格，原审批阻塞解除。当前可实施纯迁移、AppSettings、导入预览与适配器契约；N0/N1 的 SQLite 原生证据仍需真实 Android runtime。
- 全路线已知硬外部风险：N0 需要 Android 设备/WHPX 与远端 CI；N6 release signing 需要由发布所有者保管的正式签名身份；N7 TestFlight 构建与验收需要 macOS/Xcode、Apple 开发者签名权限和可用 iOS 运行环境。
- 后续内部高风险点：N1 SQLite 旧库双版本迁移；N3 原创像素素材与状态公平性；N4 SecretStore、任意 Provider 兼容与严格按需网络边界；N5 模型输出不得进入奖励/计时事实链；N6/N7 的可访问性、生命周期和平台隐私清单。
- 2026-08-04 官方发布前置复核：Xcode 26 需要运行 macOS Sequoia 15.6+ 的 Mac；App Store Connect 上传需要已创建 app record 和 Account Holder/Admin/App Manager/Developer 角色，TestFlight 构建还需 Apple 侧处理。当前 Windows 主机不能独立完成 N7 的构建上传证据。
- Android 官方要求所有可安装 APK/更新均使用持续一致的签名证书；Google Play 新应用还需要 upload key/Play App Signing 流程。N6 不能由仓库生成并长期托管发布私钥，必须由发布所有者确认签名归属与安全保存方式。
- Capacitor 官方仍支持向现有 Web 项目增加 iOS 平台；本仓库尚未安装 `@capacitor/ios`。Capacitor 8 早期 SPM 插件链接问题已在后续 8.3.x 发布中集中修复，而本仓库当前核心/CLI 为 8.5.0；N7 仍须在真实 Xcode 上验证 SQLite/通知/文件插件的 iOS 链接，不能仅由版本号推定通过。
- 当前 Git 仓库没有任何 remote，虽然本机 `gh` 已登录且 token 具有 `repo/workflow` scope，但在用户决定 GitHub 仓库归属并授权创建/推送前，N0 的“远端 CI 真实运行记录”无法形成；本地 YAML 解析与等价命令不能替代该证据。
- 当前宿主是 Windows 11 23H2；N7 不只是“缺一个命令”，而是缺少能运行 Xcode 26 的 Mac、签名团队权限、App Store Connect app record/角色和 iOS 设备/模拟器证据。应最迟在 N4 前确认获取路径，避免做到 N6 才发现截止目标物理不可达。
- 路线本身还有明确决策门：N3 伙伴视觉需要风格/素材批准，N4 Provider/SecretStore 需要依赖审计和网络策略批准，N6 发布身份/签名和 N7 Apple 资产需要发布所有者参与。可预先设计和测试，但不能代替所有者决策或凭据。
- N1 代码映射确认运行态边界集中在 `ports.ts`/`mvpApplication.ts`，持久化边界为 Memory、localStorage 与 SQLite 三个适配器；领域 Goals/Roll/Session/Rewards 类型无需为 v2 改写。
- UI 实际位于 `src/ui/app` 与按功能拆分的子目录；N1 应沿用该结构，并新增独立 E2E 文件，避免覆盖当前尚未提交的 N0 `e2e/mvp.spec.ts` 变更。
- 当前 N0 与 N1 将暂时共享脏工作树；N1 必须逐文件暂存并检查 cached diff，不能用全量 `git add`，否则会把尚缺原生证据的 N0 改动混入 N1 里程碑。
- W1 实现选择把 `AppSettings` 放在规格约定的独立 settings 模块，把 v1/v2 快照联合放在应用层；既有 `AppSnapshot` 保留为 `CurrentAppSnapshot` 类型别名，以减少 UI/领域用例的无意义改名。
- 既有导入校验器已包含最完整的事实引用/账本校验，因此先提取 `validateSnapshotFacts` 供迁移器复用；迁移器额外严格校验快照顶层键和 settings 深层键，避免未知配置被静默透传。
- 根 `tsconfig.json` 只声明 project references；直接 `tsc --noEmit` 不会检查应用项目。仓库的权威类型门槛必须是 `npm run typecheck`/`tsc -b`，N1 实施计划已据此修正。
- W2 保持浏览器 key `self-improvement-tracker:v1` 不变：key 是介质位置而不是当前 schema 声明，版本判断只读取 JSON 内的 `schemaVersion`，避免换 key 导致旧开发数据看似消失。
- W1–W2 阶段审查发现当前 SQLite `replace` 虽已被端口要求接收 v2，却仍只写事实且初始化强制 meta1；若先提交，会让 Android settings 丢失并在每次启动重复迁移。应先完成 W4 双版本状态机，再形成 N1 首个代码提交。
- 2026-08-05 用户明确把近期策略调整为 Android 优先：外部设备和 iOS 条件不阻止可确定开发；GitHub 新仓库按项目“完全开源”目标默认创建为 public，已提交基线先上传，工作树中的 N0/N1 变更仍按验证边界拆分提交。
- GitHub 发布前凭据检查确认 `gh` 2.91.0 已登录 `eruroueaito` 且具备 repo/workflow scope；目标名 `eruroueaito/self-improvement-tracker` 尚未占用。首轮工作树扫描只命中两个使用字面量 `secret-value` 的安全拒绝测试，既有 Git 历史未发现私钥/token 前缀。
- GitHub Actions run `30928023596` 在 job 分配前失败且 jobs/logs 为空；官方 context availability 表证明 `jobs.<job_id>.env` 只允许 github/needs/strategy/matrix/vars/secrets/inputs，不允许 runner，因此 `${{ runner.temp }}` 是确定根因。改用允许的 `${{ github.workspace }}` 保持路径动态且不依赖 runner context。
- SQLite 8.1.0 Android 源码再次确认：打开连接时只有 `_version > curVersion` 且存在 upgrade dictionary 才执行升级；没有注册 upgrade 的检查连接即使 target=2 也不会修改旧库 native version，适合 preflight 读取证据。
- 插件升级流程按 `toVersion` 排序，对每步 statements 启事务，执行成功后才 `setVersion`；异常时外层 `Database.open` 恢复 backup DB。因此 W4 可把 DDL 失败视为原生 0+meta1 可重试，把应用 replace 失败视为原生 2+meta1 可重试。
- CI 第二轮两份 job 均在 setup-java 同点失败：Temurin inventory 的精确标识是 `21.0.6+7.0.LTS`。GitHub API 同时确认官方 action 当前 release majors 为 checkout v7、setup-node v7、setup-java v5、upload-artifact v7；N0 CI 升级到这些 Node 24 代际，消除 v4 action 的 Node 20 弃用警告。
- W4 阶段审查发现 singleton 若用 `WHERE id=1` 会忽略畸形 schema 中的额外/错 ID 行；正常 CHECK 虽会阻止，但损坏库预检不能依赖它。读取整表并要求恰好一行且 id=1 后，settings/projection 都能 fail closed。
- CI 第三轮已通过 checkout、Node、Temurin JDK 与 Android SDK 安装，首次到达仓库环境检测；Gradle 报 unavailable 的直接原因是 `android/gradlew` 在 Git index 中为 `100644`，Linux runner 无法执行。把 wrapper 记录为 `100755` 可同时修复环境检测和后续 `assembleDebug`，无需引入另一套 CI Gradle。
- 本机仓库内保留固定 npm 11.12.1 与 Gradle 8.14.3，但 Node 24 可执行文件不在 `.tools` 树中；Android SDK 根目录 `D:\Android\Sdk` 仍存在。CI 修复的权威验证是 Git mode diff 与远端 Ubuntu job，本机环境检测需先重新定位既有 Node 24 runtime。
- CI run `30929599851` 已证明 wrapper mode 修复有效：Ubuntu 上的固定环境检测、TypeScript/测试/网络边界/E2E 与 Capacitor sync 全部通过，当前进入 `assembleDebug`；剩余风险收敛到 Gradle 依赖解析、APK 复核与 artifact 上传。
- 同一 CI run 最终成功，说明公开仓库可从零安装固定 SDK/JDK/Node 工具链并产出可下载的 debug APK；后续 Android 功能分支可以复用该门槛，不再把本机 WHPX/物理设备缺失当成确定性开发阻塞。
- W3 采用应用层两阶段导入契约：`previewImport` 只做 parse/validate/migrate/summary 并保留原始不可变字符串，确认时必须重新解析同一字符串后才执行一次 `store.replace`；UI 只持有预览对象和字符串，不持有可被篡改的快照引用。正常导出始终为白名单 v2 envelope。
- 既有 UI 在文件选择后直接调用 `importData`，应用门面只接受 envelope v1 并立即 replace；W3 需要把门面拆成纯预览与确认提交两个入口，并让 GoalsScreen 显示覆盖摘要。既有 `ExportFilePort` 已适合复用，不需要改 Android Filesystem/Share 适配器。
- 当前跨模块测试把 `importData` 当作直接写入口；W3 会保留一个显式确认方法而不是静默兼容旧行为，并将集成测试改为“预览无写入 → 确认一次写入”。导出 envelope 从 v1 升到 v2 后，既有离线闭环仍可复用同一 JSON 字符串做清空后恢复。
- 为避免 `migrations` 与 `importValidation` 形成循环依赖，envelope 校验只返回严格的 `PersistedSnapshot` 与 sourceVersion；应用层随后调用现有纯迁移器。白名单 envelope 构造与预览摘要放入独立应用模块，事实、嵌套结算/候选和 settings 均逐字段复制，防止运行态意外附加字段进入公开备份。
- 领域类型中唯一开放键集合是 `RecommendationCandidate.scoreParts: Record<string, number>`；W3 白名单不能原样透传任意键，需按 RollEngine 实际稳定键集合重建，并同步补强导入校验，避免伪造 `apiKey` 数值键进入备份。
- W3 code-review 发现 1 项 High 数据完整性问题：`validateSnapshotFacts` 虽调用领域 normalizer，却最终深拷贝原始行；因此 `description` 为对象、Session `plannedMinutes/runningSince/targetDurationMs` 为错误类型等未覆盖字段可进入运行态并导致 UI/计时异常。修复应在返回前逐字段重建已校验事实，而不是继续信任原对象。
- High 修复复审又捕获同一根因的联合类型边界：既有 Goal/Activity normalizer 只检查 1–5 范围，`3.5` 仍会通过并伪装成 rating。导入层现显式要求 importance/defaultEnergyCost/energyCost 为五个整数之一，防止分数计算与 UI select 接收非法值。
- N1 设置范围以设计规格为准：本阶段提供可持久化控件，但不实现完整深色主题样式或触觉适配；`notificationsEnabled=false` 已在应用层阻止新的 Countdown 通知，其他主题/动效/触觉/AI 值只作为可靠本地策略保存，不请求权限、不发网络。
- N1 收口复核确认恢复缺口：MvpApplication 在 load 成功、迁移/写回失败时没有保留已白名单化 recovery envelope，App 的 `snapshot === null` 分支也会覆盖错误信息而永久显示 loading。可在不改 DataStore 的前提下覆盖 localStorage/v1 写回失败等已拿到原始快照的路径；store.initialize/load 自身失败仍只能重试并保留数据库。
- N2 静态接入点审计确认 `Goal` 与 `ActivityTemplate` 已是一对多事实集合，现有 schema v2 足以承载多活动；不应为 N2 增加迁移或第二进度事实来源。
- N2 的核心耦合点是 `GoalsScreen.editGoal` 只取第一条 active Activity，以及 `MvpApplication.updateGoal` 同时修改 Goal 与 Activity；实施时应先补 Goal-only update 和 Activity create/update/archive/restore 原子命令，再扩展 selectors 与 UI。
- `selectGoalFeedback` 已从 Session/RewardLedger 派生 progress/cumulative/experience，Goal 详情的进度与最近活动应继续从这些事实派生；撤销后显示一致性需要成为 N2 专项回归。
- 当前唯一阻止 N2 规格冻结的产品决策是详情信息层级：A Roll 优先、B 管理优先或 C 复盘优先。该选择只影响 UI 层级，不改变已确认的数据/应用边界。
- 自动分析 inventory 把 `.tools/gradle` 缓存计入全仓语言统计，原始文件占比不代表产品源码；N2 分析报告只依据 `src/`、`e2e/`、`android/app`、配置和路线文档。
- 用户已选择 N2 方案 A（Roll 优先），并进一步要求不再询问普通产品意见，改由 Codex 自主决策与自动化审查；只有外部资产、权限或不可替代的人机验收才需要报告阻塞。
- N2 自动设计采用“紧凑 Catalog + 独立 Goal 详情”：保留全局 Roll 为默认页和底部中央主入口，Catalog 不展开活动编辑，详情承载 Goal 状态、三种反馈、多活动、归档恢复与最近记录。
- 最后一条可执行 Activity 允许归档；Goal 可继续 active，但 Catalog/详情必须显示“需要活动”，Roll 把它区分为 `no-active-activities` 并返回可操作提示，不自动暂停或阻止用户操作。
- N2 不迁移 schema：沿用现有 Goal/Activity 一对多事实集合；新增独立 Goal/Activity 应用命令、只读详情 selectors 和开发种子 fixture。开发种子必须显式触发、使用保留 ID、可清除并重复安装。
- brainstorming 指定的 `writing-plans` skill 在当前可用技能清单和两个标准本地路径中均不存在；规格通过后使用项目已强制启用的 planning-with-files 编写等价、可执行、逐文件的 N2 实施计划，并明确记录该回退。
- N2/W1 红灯测试确认既有联合 `updateGoal` 是多 Activity 的实际阻点；把 Goal-only 与 Activity 命令拆开后，无需修改 schema 或 Store 端口即可维持单次 `replace` 原子边界。归档最后一条 Activity 也只需扩展 Roll 空原因，不需要改变 Goal 状态。
- N2/W1 阶段审查发现 Roll 的新 `no-active-activities` 原因若不进入 UI 文案表，会退化为不可操作的通用提示；将文案表收窄为 `Record<EmptyRollReason, string>` 后，后续新增原因会在类型检查阶段强制补齐展示。
- N2/W2 的反馈撤销语义必须分开处理：progress 与两种 cumulative 依赖 Session 从 settled 变为 voided 后自然回退；experience 则依赖 settlement/reversal 账本 delta 抵消。统一按 Session 或统一按账本都会制造错误的第二事实来源。
- N2/W2 阶段审查补出反馈反例门槛：progress 与累计次数只接受有效 completed Session；累计分钟接受 settled interrupted 但排除 abandoned。仅测正常完成与撤销无法防止这三条规则在后续重构中被错误合并。
- N2/W3 表单失败保留不需要复制草稿到 App：让 GoalForm/ActivityForm 持有受控输入，并让命令回调返回 boolean，只有成功才卸载表单即可。同步 `commandInFlight` ref 必须先于 `setBusy` 设置，才能拦截同一渲染帧内的双击。
- N2/W3 阶段审查要求写失败 E2E 同时观察 UI 与持久事实：仅看到表单仍在不能证明 Store 没有半提交；需直接断言详情未出现新 Activity 且 localStorage 的 activities 数量保持最后成功值。
- N2/W4 清理必须对 RewardLedger 做引用闭包：不仅移除 demo Goal/Session 的奖励，还要移除 `reversalOfEntryId` 指向保留命名空间或已删除奖励的依赖账目，否则导入校验会把清理结果视为悬空 reversal。
- N2/W5 四反馈浏览器验收发现 progress 数字控件与领域契约不一致：`min=0.01` 配默认 step=1 会让整数目标 50 被浏览器判为非法；baseline/target 必须显式 `step="any"` 才能接受领域允许的任意有限进度值。
- N2 production 边界不能由 `import.meta.env.DEV` 源码条件单独证明；必须用真实 build 后的 `vite preview` 遍历公开导航并观察可访问名称与持久事实。开发服务器 E2E 即使隐藏按钮，也不能替代 production artifact 证据。
- N2/W6 完整 diff 审查发现归档 Activity 的编辑表单若统一渲染在 active 区，会在移动端出现在当前视口上方，让点击看似无响应；编辑器必须跟随 active/archived 分组就地渲染。
- N2 最终远端证据链已成立：PR pull_request run 必须与产品代码 head SHA 匹配，并同时通过 production E2E、Android APK 组装、manifest/哈希复核和 artifact 上传；branch push 或仅本地 build 都不能替代这条链。
- N3 自动方案采用原创 CSS/DOM 像素伙伴，不使用 PNG 生成或第三方素材：同一骨架组合 3 阶段 × 4 状态，最易保证一致性、MIT 归属、production 离线和 reduced-motion。
- N3 明确不把 ActivityState/伙伴投影接入 Roll。路线中的可选表述与“伙伴不得反向控制/产生 Roll 偏置”的退出标准冲突时，以后者为硬边界；公平性缺陷只能在独立 Roll 规则中修复。
- ActivityState v1 采用 7 日 active-day 去重（最多 70）+ 14 日不同 Goal breadth（最多 30），避免 rewardWeight、同日刷短任务或单目标重复直接放大视觉状态；分数不以能力或健康度展示。
- N3 规格首轮自动审查发现必须关闭的兼容与可证伪性缺口：schema v2 已持久化的 mood 不能被删除或继续当事实；同毫秒 reversal 必须位于原 settlement 之后；撤销必须立即取消 2 秒庆祝；`motion` 只能沿用 `system | reduced | none`；公平性和 production CSS 不能只做名义断言。
- 修订后的硬规则是：旧 `CompanionProjection.mood` 永久固定为可忽略的 `idle` 兼容缓存；账本采用 createdAt → settlement/reversal → ID 规范序并拒绝反向时间因果；7/14 日闭区间精确为 D-6…D 与 D-13…D；30 天闭环仿真冻结输入、首选序列、占比和连续上限。
- 为验证实际 CSS 而非只验证 class，production preview 增加无导航/无写入的 query 验收面，Playwright 对真实 3×4 组件矩阵读取 computed style，并分别验证设置 reduced/none 与系统 prefers-reduced-motion；真实 Android 视觉仍单列 pending 到 N7 总审计。
- N3 规格第二轮独立审查已批准，首轮七项修订全部关闭且没有新问题；这些规则必须原样进入逐文件计划，不能在实施中用旧持久 mood、`full` motion 或名义 class 测试替代。
- 固定 30 天 Roll 闭环已用临时只读测试探针验证现有 v1 规则无需修改：首选序列统计为 study 15、fitness 13、photo 2，单项最高 50%，最大连续 1 天，且摄影暂停窗口不入选；探针文件已删除，正式计划冻结精确序列与阈值回归。
- N3 计划按五包拆分为领域引擎、运行时 selector、公平性、CSS/DOM UI、production/Android 验收与阶段收口；系统时钟回拨时 reversal 时间必须钳制到原 settlement 时间，避免应用生成自身导入器会拒绝的因果非法账本。
- N3 计划首轮自动审查补出两个边界：future reversal 不能提前取消仍在 2 秒窗口内的 settlement 庆祝；远端收口必须锁定 PR headRefOid/event/run headSha/artifact 的同一不可变 revision，不能复用旧产品 SHA 的成功记录。
- N3 计划第二轮独立审查已批准，无问题或建议；设计与执行门槛关闭，按 W1 测试先行进入共享完成判定、ActivityState v1 和规范奖励重放。
- N3/W1 把有效完成判定下沉到 Session 领域供 Roll、Goal feedback 和 ActivityState 共用；ActivityState 只按 UTC day/Goal Set 计分，接口不存在 XP/rewardWeight，避免推荐模块成为跨域工具依赖。
- W1 code-review 发现 1 项 Medium：导入器虽校验 reversal 引用与 delta，却允许多个不同幂等键重复反向同一 settlement。现按 original ID fail closed，并补同毫秒因果、反向时间与重复 reversal 回归。
- 时钟回拨撤销使用 `max(now, settlement.createdAt)` 作为 reversal 事实时间；规范重放固定 createdAt→settlement/reversal→ID，旧持久 projection mood 恒写 idle，运行时庆祝留给 W2 selector。
- W2 阶段审查发现规格自身的 2000ms 闭区间与 UI 定时器存在等号矛盾；首个 `>= + setTimeout(0)` 修订又会在冻结时钟下重复调度。最终收敛为 `(now-2000, now]` 半开窗口与 `until > now` 单次定时器：恰好 2 秒确定退出，无 UI 第二事实或轮询。
- W2 selector 始终从 RewardLedger/Session 重建，恶意持久 projection 的 999 XP/celebrating 值不会进入视图；unlock 精确覆盖 50/150/300，future reversal 到生效时间前不取消庆祝，working 优先于其他 mood。
- 固定 30 天正式回归冻结逐日首选序列与 study=15/fitness=13/photo=2 汇总；selector 前后 RollResult 字节等价，伙伴模块没有进入 RollEngine API。simplify 只提取正延时 refresh-delay 纯函数，避免 W3 复制边界判断。
- W3 的原创伙伴使用单一 13-part DOM 骨架和本地 CSS 变量组合 3 阶段×4 状态；production query 矩阵不初始化 MvpApplication/Store，资产登记明确 MIT、无图片/sprite/Canvas/第三方或远程来源。
- W3 code-review 发现 1 项 Medium：reduced/none 原先只关闭 `data-part` 节点动画，眨眼实际挂在眼睛子节点而会漏动；关闭规则已扩展到伙伴全部后代与伪元素，等待 W4 computed-style 锁定。
- 真实 390×844 Edge production 视觉审查确认 hero/顶栏/底部导航不重叠；并修复 2 项 Low：顶栏 `0 XP` 窄屏换行、空活动状态重复“安静陪伴”。最终截图保存在忽略目录 `output/playwright/` 作为本地证据。
- W4 首次全量 11 条开发 E2E 时，原有 MVP 下载闭环在新增并行负载下恰好触发 Playwright 30 秒文件总预算；相同用例此前单独/8 条套件通过且本轮只在 `download.createReadStream` 被 timeout 取消。开发配置显式提高到 60 秒，不放宽任何操作或 expect 断言。
- W4 production computed-style 首轮两项失败均为测试解释问题：system 庆祝星光首帧透明度按动画为 0.45 而非恒 1；可见状态标签与 img 可访问名各有三条导致文本计数为 6。修订后仍要求星光 opacity>0、正确动画名和 3 个准确 img，不降低视觉差异门槛。
- W4 完整浏览器证据确认：0 XP 合法结算庆祝、即时 reversal 取消、正延时 timer 两秒退出；历史 310 XP peak 在 current 0 时仍为 Lv.7/companion/三 unlock；system/reduced/none/OS reduce 的真实后代与伪元素 computed style 符合规则。
- Android smoke 文档已加入 N3 三阶段×四状态、三 motion 路径、320dp、小屏点击、2 秒庆祝与 peak unlock 清单，并继续声明浏览器矩阵/CI APK/fake ADB 不构成原生视觉证据。
- W5 对 `b71d38e..HEAD` 的 34 文件完整差异复审没有遗留 High/Medium；此前重复 reversal、2000ms 边界和 reduced-motion 子节点泄漏均有回归覆盖。simplify 判断窄纯函数与显式 3×4/motion 验收矩阵比新增抽象更清晰，因此没有制造行为无关改动。
- N3 本地候选门槛完整通过：TypeScript、21 files/122 tests、11 dev E2E、4 production E2E、0 runtime 漏洞、74 产品文件/2 manifest 网络边界、production build、Android cap sync、离线 smoke runner 与 diff check；独立扫描未发现产品 fetch/XHR/WebSocket、远程资产 URL 或 secret-shaped 字段。
- 首次组合 W5 命令因把含单双引号的 remote CSS 正则嵌入 PowerShell 双引号而在解析阶段退出，任何测试都未开始；随后把确定性主链和独立只读扫描拆开并完整通过，不能把解析失败误记为产品门槛失败。
- N3 候选 SHA `dd643bcfa4f36381725a7ecd310cb75d97013651` 与 draft PR #1 `headRefOid`、`pull_request` run `30988130612` 的 `headSha` 完全一致；run 3m23s 全绿，production/网络门槛、Android sync、assembleDebug、merged manifest/APK 校验与上传步骤均成功。新 artifact `self-improvement-tracker-debug-apk` ID `8923018673`、14,569,931 bytes，APK SHA-256 `d32e2e367a5ec07ee3fc63f1848d75440396222ae246f0b756141433fe5d849b`。
- N3 最终状态 SHA `910a1458a092d3fb020d5a33338f7b3566064d4d` 再次与 draft PR #1 和 `pull_request` run `30988498125` 精确一致；最终 run 3m29s 全绿，artifact `8923175030`、14,569,929 bytes，APK SHA-256 `205c666e3c62bf99ae31dbf78135cfdb30ab8ade389532a7091c5a9e8093c9d5`。该不可变 revision 构成 N3 确定性完成证据，native evidence 仍待真实设备。
- N4 当前底座已经具备 schema v2 非秘密 `settings.ai.enabled/historyEnabled`，但没有 ProviderAdapter、SecretStore、AI 历史或草稿类型；现有 composition 只装配 DataStore/Clock/ID/Notification/Export，N4 应在端口边界新增能力，不让 React、领域模块或 SQLite 直接联网/读取密钥。
- 原始要求与路线共同限定 N4：只先做用户主动触发的自然语言 GoalDraft；模型输出必须经本地 Schema 严格校验并保留为临时可编辑草稿，确认前零正式写入；手动创建永远可用。N5 SettlementDraft 与 Roll 文案不应提前混入 N4。
- 2026-08-05 npm 元数据：`@aparajita/capacitor-secure-storage` 8.0.0 为 MIT、Node >=20，并声明 Capacitor 8 依赖；`capacitor-secure-storage-plugin` 0.13.0 也为 MIT，peer `@capacitor/core >=8.0.0`。两者都不能仅凭许可证/版本号决定，仍需检查 Android 加密实现、备份排除、失败语义、Web 退化和供应链体量。
- `@aparajita/capacitor-secure-storage` 官方说明为 Android Keystore 生成 AES-GCM 密钥、密文放 app-specific SharedPreferences，Web 则明文 localStorage；因此若选它，产品 `SecretStore` 必须在浏览器组合根使用独立 session-memory adapter，绝不能直接采用插件 Web 实现。
- Android 官方当前把 `EncryptedSharedPreferences` 标记 deprecated，并明确密钥恢复不匹配时必须排除备份；同时仍推荐高安全密钥使用 Android Keystore 和 AES-GCM。插件是否自己实现 AES-GCM、是否排除备份是审计核心，不能把“用了 Keystore”当作完整结论。
- Zod 当前 4.4.3 为 MIT；N4 可只引入 `zod` 做模型输出和配置的运行时白名单校验，不引入 OpenAI/Vercel AI SDK。原生 `fetch` adapter 对 OpenAI-compatible Chat Completions 的兼容面最小，也更容易把唯一网络出口静态锁定。
- OpenAI 官方当前同时支持 Chat Completions 的 `response_format: {type: 'json_schema', json_schema: ..., strict: true}` 和 Responses 的 `text.format`；官方明确指出 Structured Outputs 才保证 schema adherence，JSON mode 只保证合法 JSON，并要求单独处理 refusal。N4 仍以 Chat Completions 为最小协议，远端约束不能取代本地 Zod 二次校验。
- “OpenAI-compatible” Provider 对 `json_schema` 支持并不一致。推荐在非秘密配置中显式保存 `structuredOutputMode: 'json-schema' | 'json-object'`，默认严格 schema；不做隐藏重试或自动协议猜测，避免一次点击产生多次计费请求。两种模式最后都必须通过同一 Zod schema。
- `@aparajita` 8.0.0 源码审计确认 Android 用每个 prefixed key 对应的 AndroidKeyStore AES/GCM/NoPadding 密钥，并把密文+IV 放入固定 `WSSecureStorageSharedPreferences`；异常会映射为受控插件拒绝。但其 Android manifest 没有备份规则，写删使用 `SharedPreferences.apply()`，且 npm 运行依赖会额外带入 Capacitor app/keyboard/ios 包，实施时必须精确锁版、添加 app 侧秘密备份排除并验证 cap sync/依赖清单。
- `capacitor-secure-storage-plugin` 0.13.0 虽已声明 Capacitor 8 peer，但 Android 源码仍有 API<18 的明文 Base64 fallback、RSA/PKCS1 分块、吞掉写入异常与 `printStackTrace`，仓库还提交了 `.gradle` 构建缓存。自动审计将其淘汰，不进入产品供应链。
- Android 官方说明 Keystore 密钥材料不可导出且授权在系统侧执行；同时警告加密 SharedPreferences 不应备份，因为恢复后通常没有原密钥。N4 应至少从云备份/设备迁移中排除插件固定 preference 文件，真实设备卸载/重装和备份恢复语义留入 native smoke 清单。
- `@aparajita` 仓库未归档、8.0.0 tag 对应 2026-02-10 commit、当前安全 advisories 为 0；Capacitor 8 支持和 SPM 已关闭，现存 Android 相关 feature 是未来 AGP 9/SDK 37。维护面足够进入固定版本候选，但插件无正式 GitHub Release 且社区规模较小，需用 CI/native smoke 而非下载量代替信任。
- OpenAI Node SDK 7.4.0 当前为 Apache-2.0、unpacked 约 12.5 MB，并暴露多项可选 peer；Vercel `ai` 7.0.52 约 6.6 MB且再带三层运行依赖。N4 只有一个非流式 Chat Completions POST，不需要 SDK 的多协议/流式/工具能力；手写窄 adapter + Zod 的复杂度和供应链均更低。
- N4 自动技术评估的推荐组合收敛为：`@aparajita/capacitor-secure-storage@8.0.0` 精确锁版 + native-only wrapper/session-memory Web adapter + `zod@4.4.3` + 单文件 OpenAI-compatible fetch adapter。备选分别是 OpenAI SDK（成熟但过宽、浏览器直连语义和体积不匹配）及自维护 Capacitor 原生秘密插件（控制最强但 Android+iOS 长期维护成本最高）。
- N4 的非秘密 Provider 配置、单功能开关和可选 AI interaction log 都是持久本地数据，不能塞进 UI/localStorage 私钥旁路；应升级快照/export 到 schema v3，并给 SQLite 增加原子替换的 `ai_interactions` 表。v1/v2 纯迁移补默认值，旧导入继续支持，未知未来版本仍拒绝。
- 当前领域类型名 `GoalDraft`/`ActivityDraft` 与未验证模型草稿语义冲突；按路线在 N4 机械重命名为 `GoalInput`/`ActivityInput`，AI 侧只让通过 Zod 的结果获得 `AiGoalDraft` 类型。`SettlementDraft` 同理改 `SettlementInput`，但不实现 N5 模型解析。
- 当前 `createGoal` 只把一个 Goal 与一个首 Activity 原子提交，而 AI schema 允许多个建议活动。N4 需新增或收敛为一次 `createGoalWithActivities(goal, activities[])` 原子用例，现有手动表单继续用单元素数组；禁止确认时循环多次 `createActivity` 产生半提交。
- Android manifest 已有 `allowBackup=false` 与 `usesCleartextTraffic=false`，比插件自身空 manifest 更严格；N4 只新增显式 INTERNET 权限并在 merged manifest 锁定这三项。`verify-network-boundary.mjs` 顶部已预留 N4 升级说明，应改为只有唯一 Provider adapter 可出现 fetch/远程 endpoint 构造，其余远程资产、WebSocket、遥测仍一律失败。
- 当前设置 UI 把 `historyEnabled` 文案写成“允许 AI 使用本地历史”，与产品要求的“是否记录模型调用历史”不一致；N4 要纠正文案，并明确 GoalDraft 请求只发送本次用户输入和固定 schema/prompt，不发送 Goal/Session/Reward 历史或整库。
