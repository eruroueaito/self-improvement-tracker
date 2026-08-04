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
