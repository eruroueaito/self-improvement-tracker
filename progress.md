# Self Improvement Tracker 进度记录

## 2026-08-04

- 用户要求详细整理基本 MVP 之后的开发计划；已执行 MemSkill recall 和 planning-with-files session catchup，确认从已完成提交 `998d494` 向后规划，不重做 MVP。

- 已执行 MemSkill recall；未发现与本项目直接相关的既有记忆。
- 已读取 `brainstorming` 与 `planning-with-files` 工作流。
- 已完成文件化计划初始化。
- 已用显式 UTF-8 成功读取并提炼附件中的完整产品、架构、许可、阶段和验收要求。
- 已判断总需求需拆分为多个独立规格，首个合理范围是仓库治理与领域/存储基础。
- 已确认当前目录不是 Git 仓库，除三个规划文件外没有其他项目文件。
- 需求与现状探索阶段已完成；即将进入逐问澄清与技术方案比较，尚未实施任何产品代码。
- 已登记项目索引，并将产品边界、许可证与隐私硬约束写入项目记忆。
- 用户已同意启用 `brainstorming` 可视化伴侣；仅在布局、流程图或视觉方案比较时启动本地浏览器，当前范围澄清继续使用文字。
- 用户选择先重新审查整个产品范围与结构；当前进入全项目第二轮结构审查，不直接进入第一阶段规格。
- 已开始核验 Capacitor、Capacitor SQLite、Sidejot 与 Perfice 的当前仓库、许可和适配事实；发现参考来源应从“计划复用”进一步收缩为“原则借鉴 + 必要时带归属的局部移植”。
- 已核验 Super Productivity、Loop、Habitica 与 whisper.cpp；初步结论是计时器应从需求独立实现，GPL 项目仅作为反例/概念参考，离线 ASR 移出 v1。
- 已完成 Capacitor、React Native/Expo、Flutter 的第一轮技术栈比较，并发现 Capacitor 方案缺少一个已确认的、完全开源的系统安全存储实现，这是开工前必须关闭的架构风险。
- 已找到活跃的 MIT Capacitor 安全存储候选，因此该风险可通过适配器与依赖审计关闭；同时确认本地通知只能作为尽力提醒，不能成为计时事实来源。
- 已完成全项目第二轮结构审查报告，覆盖保留/修改/删除/延后、P0 结构问题、推荐模块、数据事实来源、技术栈比较、外部项目使用方式、重排里程碑与测试策略。
- 可视化伴侣首次启动因环境主机名占位符失败，已改用显式回环地址继续启动。
- 已在可视化伴侣中发布 A（原结构）、B（推荐模块化结构）、C（Expo 结构）三种总体方向对比，等待用户选择。
- 前台伴侣进程被工具生命周期关闭，正在改用隐藏后台进程重新启动并验证。
- 隐藏后台伴侣服务已启动；因服务创建了新会话目录，已把结构对比页面发布到新会话，正在做最终 HTTP 验证。
- 包装脚本的后台进程仍因所有者检测退出；页面文件完整保留，正在改为直接启动底层 Node 服务。
- 已直接启动无 owner PID 的隐藏 Node 伴侣服务，并通过 HTTP 200、页面标题和推荐方案内容检查；可视化地址为 `http://localhost:52345`。
- 用户最终确认方案 B；浏览器点击记录与对话文字一致。已把伴侣切换到等待页，并进入正式设计的分段审批。
- 已发布正式设计第 1 节“产品边界与核心闭环”的可视化页面，等待用户逐节批准。
- 用户要求关闭网页预览并直接推进基本 MVP；本地预览端口已无监听，网页伴侣已关闭。
- 已把执行目标切换为方案 B 的离线基本 MVP，并更新持久计划；接下来固化规格、独立审查后连续实施。
- 已检查权威工作区状态：尚无 Git/应用源码，Node/npm/Java 可用，Android SDK 环境变量未配置。
- 已写入基本 MVP 设计规格与 M0–M5 实施计划；因 `writing-plans` skill 不可用，使用项目内实施计划作为等价回退。
- 已初始化 Git；发现没有提交身份配置，将使用仓库级 Codex 身份保存自动生成的规格与实现提交。
- 已核验 React/Vite/Capacitor/SQLite/通知/Vitest 当前稳定版本与 MIT 许可；批量查询末尾超时，Playwright 版本将单独补查。
- 已补查 Playwright 许可/版本并检查 Android 工具：adb 可用，但完整 SDK 尚未定位。
- Android SDK 二次检查仍未找到 sdkmanager/Platforms/Build Tools；保留原生工程与 cap sync 为必做，APK 构建作为当前环境缺失的证据门槛处理。
- 独立规格审查第一轮发现 Roll 精确公式、Goal 反馈派生、“有效完成”语义和全量清空语义存在实现歧义。
- 已补齐精确评分公式/舍入与 cadence 优先级、Goal 反馈派生、统一的有效完成定义、字段验证边界、投影导入重建规则和全量清空行为；正在进行第二轮独立复审。
- 第二轮复审仅剩 Session 结束动作到 endType 的映射未完全定义；已补齐 Flowtime 完成、Countdown 到期/提前结束、退出中断与放弃的唯一映射，并进入最终复审。
- 第三轮独立规格审查结果为 Approved，无阻塞问题或建议项；设计与审批阶段完成，进入 M0 工程基线。
- 已创建 package/TypeScript/Vite/Capacitor 配置、MIT/贡献/安全/第三方声明、README、三个 ADR 和测试入口。
- 首次依赖安装在 120 秒无输出后被工具超时终止，且未生成 lockfile/node_modules；将用详细日志和更长的有限超时重试并保留诊断证据。
- 第二次安装在 59 秒完成并生成 lockfile；首轮 TypeScript 检查捕获 4 个静态类型问题，已按类型边界修复，未用类型断言掩盖。
- TypeScript 与 Vite production build 已通过；首次 Capacitor add/sync 因上游 CLI 链中的 bplist-creator 安装不完整而失败，已定位为缺失模块文件并固定 MIT 0.1.1 修复依赖。
- 干净重装后 Android 工程生成并完成两次 cap sync，SQLite 与本地通知插件均被识别；已添加 14 项领域、存储契约和端到端应用用例测试。
- 首轮测试 12/14 通过，两个失败均来自 Node 25 的不完整全局 localStorage，而非适配器逻辑；已在测试入口为该运行时缺口安装最小 Storage 合约。
- 14/14 测试、生产构建与 cap sync 已通过。Playwright 移动端 Edge 已实际完成“创建目标 → Roll → Flowtime → 结束”并发现结算表单旧状态初始化问题；修复后继续验证结算、History、撤销和重载持久化。
- Playwright 修复复验通过：结算默认 100%，25 分钟结算获得 21 XP，撤销归零且保留历史，页面重载后记录/备注仍在；控制台现为 0 error/0 warning。
- 已新增可重复的 Playwright 端到端测试，覆盖创建、Roll、Flowtime、结算、撤销、重载、导出、全量清空和导入，1/1 通过。
- Android 清单已关闭系统备份和明文流量，并移除不需要的 INTERNET 权限；原生入口补齐模块职责注释。
- Android 首次 assembleDebug 在 Gradle 分发包下载阶段因 wrapper 默认 10 秒网络连接超时退出，尚未进入 SDK/编译阶段；已把有限超时提高到 60 秒后重试。
- Gradle 第二次在 5 分钟有限窗口仍未下载到分发包，按计划停止重复；APK 标记为当前环境未验证，未误报通过。
- code-review 已关闭 SQLite 外层事务、旧推荐重复启动、导入引用/账本一致性、Countdown 前台到期、Android 导出与原生清单问题。
- simplify 已把 500+ 行 App 拆为五个页面模块和共享展示映射，应用壳只保留导航、恢复与用例编排；重构后所有测试继续通过。
- 最终验证：TypeScript 通过；Vitest 6 files/14 tests；Playwright 1/1；Vite build；Capacitor sync（4 plugins）；runtime npm audit 0；git diff check 通过。
- 已清理超时安装留下的损坏生成依赖树和旧 lockfile，只保留干净可重建的 node_modules 与当前 package-lock。
- Playwright CLI 浏览器会话和临时 4173 Vite 测试服务均已关闭，端口无监听，遵守用户“关闭网页预览”的要求。
- 更新进度记录时首次补丁包含了没有变更行的空 findings hunk，apply_patch 拒绝执行；已拆为有效补丁处理，没有文件被部分修改。

## 验证状态

- 设计审批门槛：生效。
- 产品代码变更：无。

## 2026-08-04 Post-MVP 路线规划

- 用户要求在已确认的方案 B 和二次结构审查基础上，详细整理下一阶段开发计划。
- 已执行 MemSkill recall 与 planning-with-files 会话恢复，确认从基础 MVP 提交 `998d494` 继续。
- 已逐项对齐原始八阶段要求、二次结构审查结论和当前源码拓扑；确认首个后续里程碑必须关闭 Android APK/真机证据缺口。
- 已确认后续主要缺口：可回滚迁移与 AppSettings、完整 ActivityTemplate/Goal 详情体验、真实伙伴状态、AI Provider/SecretStore/Schema、可访问性/隐私/发布硬化、iOS 适配；whisper.cpp 延后到发布后 RFC。
- 已创建 `docs/plans/2026-08-04-post-mvp-roadmap.md`：包含 N0–N7、发布后 E1、关键依赖、共同门槛、工作包、测试、退出标准、立即执行清单和明确不做项。
- 已完成结构检查：9 个阶段章节、依赖顺序一致、代码围栏成对；本轮仅修改计划与研究文档，未修改产品代码，因此不重复运行产品测试。

## 2026-08-04 N0→N7 持续开发

- 用户明确要求按照新路线从 N0 连续开发到 N7，以 N7 完成作为截止目标。
- 已执行 MemSkill recall、planning-with-files 会话恢复并读取 brainstorming 工作流；既有方案 B、Post-MVP 路线图和用户本轮指令共同构成已批准设计，当前进入 N0。
- 已把 `task_plan.md` 的总目标扩展到 N7，并建立 N0–N7 的持久阶段清单；总目标保持进行中。
- N0 首轮只读环境检查确认 Java 21 和 adb server 可启动，尚无 Android 设备证据；其余工具链信息将分项复核。
- N0 分项环境核验完成：Node/npm 可用但为 Node 25；Java 21 可用但无 `JAVA_HOME`；Android SDK、sdkmanager、系统 Gradle 和 Gradle wrapper cache 均缺失，仅有独立 platform-tools。
- 已找到可复用的本地 Node 24.14.0 LTS 运行时和真实 JDK 21 目录；Android 工程要求 AGP 8.13.0、Gradle 8.14.3、SDK 36，下一步在规格复审通过后固定版本并安装缺失 SDK 组件。
- 已从官方 Android/Gradle 文档核验 command-line tools 15859902 的下载校验、AGP 8.13 的兼容范围和 Gradle 8.14.3 分发包；N0 将固定版本并执行哈希校验。
- N0 实施规格已交独立审查；等待审查结果期间只完成环境与官方版本证据核验，尚未安装 SDK 或修改产品代码。
- N0 规格首轮复审返回 Issues Found；已补齐强制 CI APK、精确工具链、通知允许/拒绝/Doze 证据和 CSP/manifest/运行时无网络出口门槛，准备第二轮复审。
- 已检查 Playwright、CSP、通知、导出和端到端测试现状：Edge 硬编码与 CSP 缺失需要在 N0 修复，当前产品代码尚无主动网络 API 或远程资源。
- N0 规格第二轮复审 Approved，开始实现。
- 已新增 Node/npm engines、Gradle SHA pin、Windows SDK 安装器、N0 环境/网络验证脚本、CSP、Playwright Chromium/运行时无外网断言、强制 APK CI 和 Android smoke 记录模板；尚待执行安装与验证。
- 第一批验证通过：Node 24 下 TypeScript、Vitest 6 files/14 tests、N0 网络边界（38 个产品文件/1 个 manifest）和 Vite build；发现现有 npm CLI 实际为 11.11.1，准备安装仓库隔离的 11.12.1 后重验。
- 仓库隔离的 npm 11.12.1 已安装并验证。
- 首次 Android SDK 下载经 curl 约三分钟仍为 0 字节，已终止并把安装器改为 BITS/Invoke-WebRequest；尚未重复下载。
- 尝试在重试前显式清理安装器留下的空临时目录时，包含递归 `Remove-Item` 的 PowerShell 命令被执行策略拒绝；目录为空且新安装使用唯一临时目录，因此不再把清理和安装串联，直接单独运行 BITS 安装器。
- BITS 重试已成功获得并解压固定 command-line tools；sdkmanager Java 进程正在继续处理许可证/组件，Platform 36/Build Tools/模拟器尚未出现，保持 N0 未完成。
- sdkmanager 现已从许可证阶段进入五个固定组件的安装命令，并建立远端 443 连接；继续等待实际文件落盘。
- sdkmanager 批量组件下载数分钟仍无任何文件增长，已终止；采用不同路径，通过 BITS 读取官方仓库元数据并逐包安装，避免重复同一 Java 下载失败。
- 已通过 BITS 获取并解析官方 Android 仓库元数据，定位 Platform 36、Build Tools 35 和 Platform Tools 37.0.1 的 Windows 归档；准备按元数据校验逐包安装。
- 正在解析稳定 emulator 与 API 36 system image 元数据；首次脚本使用 PowerShell 7 的 `?.` 语法，而环境为 Windows PowerShell 5.1，已停止并改用显式 null 分支。
- 已固定稳定 emulator 37.1.11、API 36 Google APIs x86_64 r07，以及三个构建包的官方 URL/大小/SHA-1；准备把安装器改为 BITS 逐包下载、校验和精确目录解压。
- Windows SDK 安装器已改为 BITS 逐包下载并校验大小/SHA-1，支持 `-SkipEmulator` 先安装构建必需包；不再依赖已卡住的 sdkmanager 包下载通道。
- 安装器重复运行时会复用已校验落盘的 command-line tools 和组件目录，不重复下载 155 MB 工具包。
- 首次运行逐包安装器在 PowerShell 5.1 解析无 BOM UTF-8 中文字符串时失败，未开始下载；已把 `.ps1` 运行文本改为 ASCII 并补齐条件括号，准备复验。
- 安装器 ASCII/语法复验通过；逐包安装进程运行中，三个构建组件尚未落盘，正在定位当前子步骤。
- 已确认安装器卡在 sdkmanager license 远端读取，终止后改为强制显式 `-AcceptSdkLicense` 参数；没有伪造 sdkmanager 成功或生成许可证哈希文件。
- Android 构建必需 SDK 组件已通过 BITS 逐包安装完成；下一步安装并校验 Gradle 8.14.3，然后运行 N0 环境验证与 assembleDebug。
- 已新增独立的 Gradle 8.14.3 BITS/SHA-256 安装器；环境验证在本地优先使用该隔离分发包，CI 仍强制使用仓库 wrapper。
- Gradle 官方归档下载与 SHA 验证已完成，当前仍在解压，尚未出现最终 `gradle.bat` 安装证据。
- Gradle 8.14.3 已安装完成；环境验证首次运行因带空格路径的 `.bat` shell 转义失败，已改为显式 `cmd.exe` 调用并移除 Java 的不必要 shell，准备复验。
- 显式 cmd 引用仍被 Windows 当作带引号的字面命令；验证器已改用 `java -classpath gradle-launcher-8.14.3.jar`，不再经过 shell。
- N0 固定环境验证通过；工具链阶段完成，进入 cap sync 与本地 `assembleDebug`。
- Node 24/npm 11.12.1 下干净 `npm ci`、Vite build、cap sync 已通过（4 plugins）。
- 首次 Gradle 命令因工作目录相对 launcher 路径错误立即失败；改用绝对仓库 launcher 路径后重试，不重复错误路径。
- `assembleDebug` 已进入 Gradle 依赖解析，正在通过本机代理连接；保持运行并检查缓存增长，尚未声称构建通过。
- Gradle 依赖解析约两分钟无任何 cache 增长，已终止；转入代理诊断或 BITS Maven 依赖预取，APK 仍未构建。
- 已定位 Windows 系统代理为 127.0.0.1:7897；首次把未引用的 `-Dhttp.proxyHost` 直接传给 PowerShell native command 时被错误拆词，尚未重启 Gradle，将改用显式字符串参数。
- 显式 JVM 代理的 `assembleDebug` 已开始持续下载 Android/Gradle 依赖，cache 增长到约 105 MB；继续等待编译结果。
- Gradle cache 已继续增长到约 779 MB，进程有效推进但尚无 APK；保持构建运行。
- 本地 debug APK 首次构建完成并通过大小、SHA、v2 debug 签名、包名和 SDK 级别检查；merged manifest 无 INTERNET。
- 审计发现网络脚本漏扫 merged XML 且 APK 含未使用生物识别权限；已修复收集器并在 app manifest 显式移除权限，准备增量重建。
- 增量重建通过类型检查、14 项单测、Vite build、cap sync、assembleDebug、v2 签名和网络边界复核；新 APK 无 INTERNET/生物识别/指纹权限，SHA-256 为 `5ae8393023016f1462af85a825b927f43b0e9e2968d0bafd1cee90fb03ddecfe`。
- Emulator 37.1.11 安装成功；API 36 system image 已通过大小/SHA-1 校验，但 PowerShell 5.1 `Expand-Archive` 无法处理该 ZIP64 归档。安装器已改用系统 `tar.exe`，准备重新安装镜像。
- `tar.exe` 路径已成功安装 API 36 system image；首次创建 AVD 暴露 standalone emulator 归档缺少 `package.xml` 登记，安装器已补充固定 37.1.11 的本地 SDK package metadata。
- Emulator package metadata 补齐后 `sit_n0_api36` 创建成功；首次启动因加速层检测矛盾退出，开始验证无需提权的 `-accel off` 软件回退。
- x86_64 软件回退实例持续 offline 且无 CPU 进展；已固定同版 API 36 arm64-v8a r07 的官方大小/SHA-1，并为安装器增加可选 ARM64 回退路径。
- ARM64 AVD 被 QEMU2 明确判定为宿主架构不支持；已在 N0 code review 中移除无效回退，并修复 SDK 组件完整性/版本复核、BITS 回退、精确 JDK/Platform Tools 验证及 CI license 状态检查。
- N0 code review 与 simplify 已完成实质修复；runtime audit 为 0 漏洞，固定 npm 同步了 lockfile engines。
- 本机 Playwright Chromium 下载两次受网络阻断；备用 Edge 通道已通过完整 E2E 和运行时无外网断言，CI 仍保留强制 Chromium 门槛。
- N0 当前环境可运行的最终验证全部通过：精确环境、14 单测、runtime audit 0、网络检查、build/cap sync、Edge E2E、assembleDebug、APK v2 签名/权限/哈希、CI YAML 解析与 diff check。
- N0 保持进行中：API 36 AVD 已创建，但宿主 WHPX 不可用；等待用户启用 Windows Hypervisor Platform 并重启或连接 Android 设备后，继续安装与原生插件冒烟，再形成独立提交。

## 2026-08-04 自动续跑：N1 规格准备

- 已执行 MemSkill recall 与 planning-with-files session catchup；工作树仍是未提交的 N0 变更，基线提交保持 `2c9cb22`。
- 复核确认没有重启或新设备，N0 原生冒烟门槛不变；在不降低 N0 退出标准的前提下，开始并行深化 N1 设计规格。
- 已完成 N1 首轮只读代码映射：原子 replace/内存一致性边界可复用，核心迁移缺口集中在 SQLite schema_version 覆盖、快照版本类型、AppSettings 和 v1-only 导入导出。
- 已完成 N1 第二轮边界分析：选定“persisted union → 纯迁移 → 校验 → 原子写回”的最小方案，并把导入预览、非秘密设置与失败一致性纳入规格草案。
- 已对照原始需求与 `998d494` 核实 v1 权威形状；准备按已批准方案 B 写 N1 独立设计规格，不重写 Repository、不提前接入 AI。
- 已核清 SQLite 双版本边界：原生 DDL version 仅负责表结构，app_meta/纯迁移链负责快照数据；缺失的包内升级文档已记为一次工具资料错误。
- 已直接检查 SQLite 8.1.0 的 TypeScript/Android 源码，确认 DDL upgrade 的事务与 version 更新语义，可写入 N1 规格。
- 已新增 `docs/superpowers/specs/2026-08-04-n1-data-migrations-settings-design.md`，完整定义版本 union、AppSettings、纯迁移链、SQLite 双版本边界、导入预览、失败恢复和验收证据；进入独立规格审查。
- N1 规格已单独提交为 `4a25fe5`，未包含 N0 工作树；提交后发现三处 whitespace 问题并已在工作树修正，待规格审查完成后一并 amend。
- N1 独立规格首轮返回 2 个 High；已补齐 SQLite 双版本状态矩阵和秘密安全的恢复导出语义，准备第二轮审查。
- N1 规格第二轮复审确认秘密安全恢复已关闭，但发现旧库 native version 基线误判；已对照 `998d494` 和插件 Android 源码修正为真实 `native 0 + meta1`，补齐升级前预检与两类失败重试状态，准备终审。
- N1 规格第三轮终审结果为 Approved；SQLite 双版本矩阵、失败重试语义和秘密安全恢复均无剩余问题。规格现等待用户书面复核，尚未开始 N1 产品代码实现。

## 2026-08-04 自动续跑：N0 设备门槛复核与冒烟自动化

- MemSkill recall 后重新检查当前状态：系统仍未重启，ADB 无设备，API 36 AVD 的 accel 检查仍返回 6；N0 退出门槛保持不变。
- 两次递归搜索 SDK 路径均因范围过大超时，随后从既有会话证据精确恢复 SDK 根目录 `D:\Android\Sdk`，不再进行整盘递归搜索。
- 新增 `scripts/run-android-smoke.ps1` 与 npm 入口：设备可用时自动执行 API 33+ 预检、安装/启动、进程与无 INTERNET 断言，并生成隐私受限的原生证据目录；同时更新 smoke 操作说明。
- 首次用 Windows PowerShell 5.1 执行脚本时发现参数默认表达式阶段的 `$PSScriptRoot` 为空；已把依赖脚本目录的默认值移到参数绑定后计算，准备复验无设备失败路径。
- N0 smoke code-review 发现并修正三项证据可靠性缺口：纯设备预检不再要求 APK；logcat 以设备启动前时间为锚点避免 PID 复用旧日志；启动后最多等待 10 秒并硬断言固定 SQLite 数据库文件存在。
- simplify 保留现有窄函数与线性流程，没有为压缩行数引入抽象；另补充设备 `base.apk` SHA-256 与本地 APK 比对，避免 `-SkipInstall` 检查点误用旧安装。
- N0 smoke 工具最终验证通过：PowerShell AST 无语法错误，npm 参数转发正确，无设备时以可操作消息失败且不生成证据；TypeScript、6 files/14 tests、网络边界（38 个产品文件/2 个 manifest）和全工作树 diff check 继续通过。真实设备成功路径仍明确未验证。

## 2026-08-04 自动续跑：N0 smoke runner 离线契约

- MemSkill recall 后再次确认 ADB 无设备且 emulator accel 返回 6；不改变真实原生门槛。
- 为 runner 增加显式 ADB 可执行文件注入点，并新增 fake ADB 与离线契约测试，准备覆盖成功、API 过低、多设备、哈希不一致、意外 INTERNET 权限和启动崩溃。
- 离线成功路径首跑发现 PowerShell 变量大小写不敏感：runner 的 `$pid` 会覆盖只读内置 `$PID` 并在真机启动后失败；已改为 `$appProcessId`，该缺陷正是此前无设备负路径无法发现的。
- smoke runner code-review 发现 fake ADB 注入可能生成外观近似原生的证据，以及 install 只检查退出码不够严格；已要求显式 `-AllowTestAdb`、目录 `TEST-ONLY-` 前缀和 `evidence_kind: test-double-not-native` 永久标记，并硬断言安装文本含 `Success`。simplify 未做无收益重构。
- 最终离线契约覆盖成功、API 33 门槛、多设备显式选择、test-double 授权、安装文本、安装哈希、INTERNET 权限和启动崩溃，全部通过且临时证据已安全清理。
- 相关回归门槛通过：TypeScript、6 files/14 tests、38 产品文件/2 manifest 网络边界、Vite build、4 个 Capacitor 插件同步、3 个 PowerShell 文件语法、真实 ADB 无设备负路径和全工作树 diff check。真实 Android 成功路径仍待设备。

## 2026-08-04 持续目标阻塞审计

- 连续多轮核验结果未变化：ADB 无 ready 设备，系统最后启动时间仍为 2026-07-24 20:55:37，emulator accel 返回 6；N0 真实原生安装与插件冒烟无法执行。
- N1 规格保持“独立终审通过、待用户书面复核”；按 brainstorming 硬门槛不能擅自进入实现。
- N0 的所有无设备准备和离线契约已完成，继续增加外围工具不再实质推进 N0–N7。持续目标已按严格阻塞规则标记 blocked；收到 N1 批准或原生环境恢复后继续，完成标准仍是 N7 全量验收。

## 2026-08-04 N1 用户批准与目标恢复

- 用户明确回复“批准 N1”，N1 brainstorming 用户复核门槛已解除；规格状态、task_plan 和项目发现同步更新。
- 当前环境没有 writing-plans skill；按此前约定使用 planning-with-files 写等价的详细实施计划，再进入 N1 编码。
- 开始盘点 N0–N7 潜在阻塞：优先区分立即外部阻塞、阶段性外部依赖和可通过提前设计/测试消除的内部风险。
- 已完成 N1 代码边界复核并新增详细实施计划，拆为 W1–W6 六个可验收工作包；下一步从纯快照迁移与设置类型开始，实现过程不等待 Android 设备或 Git remote。
- W1 首批代码已落盘：新增非秘密 AppSettings、版本化快照联合、纯 v1→v2 迁移器及测试，并把事实校验从导入入口提升为可复用函数；下一步运行 TypeScript/Vitest，修正现有 v1 应用边界的编译回归。
- 首次 W1 专项 Vitest 11 项通过；随后用正确的 `npm run typecheck` 捕获旧应用/适配器仍构造 v1 的编译回归，已迁移初始化、空快照、通知开关、设置更新、Memory/localStorage 边界和测试 fixture，SQLite 暂保留 v1 load 形状等待 W4 状态机重构。
- W1 已补齐独立的真实 v1 形状 fixture、典型/边界字段迁移断言，以及应用初始化的迁移一次性、v2 不重写、迁移写回失败和设置写入失败一致性测试；W1 标记完成，W2 进入适配器契约补强。
- W1 全量回归首轮仅暴露 fixture 的奖励权重低于既有 0.25 下限，产品迁移逻辑未失败；fixture 已改用合法最小边界并重新进入全量验证。
- W2 已补强 Memory/localStorage 的双向深拷贝、旧 v1 key 读取和 localStorage 序列化失败保留最后好快照契约；结合初始化/设置失败注入测试，浏览器与内存边界已完成。
- W1–W2 code-review 发现 1 项 High：SQLite 尚未写 settings/meta2，当前共享层若单独提交会造成原生重复迁移与设置丢失。已决定暂不提交代码并把 W4 提前到 W3 前完成；simplify 仅把迁移入口的冗余 `PersistedSnapshot | unknown` 收窄为 `unknown`，其余窄函数保持不动。

## 2026-08-05 Android 优先与 GitHub 发布

- 用户授权绕开当前外部阻碍继续开发、创建 GitHub 新仓库并上传项目，近期执行顺序调整为 Android 优先；N7 总截止目标不变。
- 已按 GitHub 发布工作流核验 CLI/auth、混合工作树、ignore 范围、目标仓库名和凭据风险；公开仓库将先接收当前已提交且验证过的基线，N0/N1 脏工作树不使用全量暂存。
- 公开仓库已创建并推送稳定基线到 `main`；首次 HTTPS push 连接重置后，以仅作用于该命令的本机代理成功完成，未改全局 Git 配置。
- 已建立 `agent/android-alpha` 分支并精确暂存 19 个 N0 文件。当前工作树验证通过：固定环境、TypeScript、9 files/32 tests、45 产品文件/2 manifest 网络边界及 smoke runner 离线契约；远端 CI 将对不含 N1 工作树的精确提交重新验证。
- N0 提交 `c98a83e` 已推送并创建草稿 PR #1。首轮 Actions 在 job 前失败；按 gh-fix-ci 工作流定位为 job-level env 使用不可用 runner context，已做单行路径上下文修复，准备独立提交并重跑。
- W4 第一批纯核心已落盘：SQLite native/app 双版本状态分类、meta 行严格解析、v1/v2 必需表矩阵，以及 meta-last 当前快照事务 writer；fake connection 将逐序号注入 execute/run/commit/rollback 失败。
- W4 真实适配器已重构为“既有库无升级预检 → 合法状态分类 → 注册 0→2 DDL → 新库安全初始化/旧库保持 meta → v1/v2 load”。当前实现还需通过类型检查并补 fake manager 的连接编排测试。
- W4 当前 TypeScript 与 15 项 SQLite 专项测试通过。并行 CI 第二轮已进入真实 job，失败点定位为 Temurin 完整版本标识不匹配；精确 JDK/action major/单份 PR 触发修复已落盘，待提交重跑。
- W4 已增加 fake manager 编排测试，覆盖旧库预检严格发生在 addUpgrade 前、新库空表证明后才写 settings/meta2、native0+meta2 拒绝和非法 current settings 拒绝；准备运行全量回归。
- W4 code-review 发现并修正 singleton 只筛 id=1 导致畸形额外行被忽略的问题；改为整表读取并严格要求恰好一行/id=1，新增错 ID 拒绝测试。simplify 保留状态判定、连接编排和事务 writer 三层边界，未做跨职责合并。
- W4 确定性实现完成：TypeScript、12 files/52 tests、50 产品文件/2 manifest 网络门槛和 diff check 通过。阶段可进入 W3，但 N1 仍需真实 Android 上的 `998d494` 旧库升级证据才能最终签收。
- CI 第三轮已越过此前两处配置阻塞并在 `verify:n0:env` 暴露 Gradle wrapper 缺少 Git 可执行位；当前按最小修复把 `android/gradlew` 从 `100644` 更正为 `100755`，保持 N1 产品代码继续与 CI 基线提交隔离。
- Gradle wrapper mode 修复后，本机使用固定 Node 24.14.0/npm 11.12.1、JDK 21.0.6+8、SDK 36、Build Tools 35.0.0、Platform Tools 37.0.1 与 Gradle 8.14.3 的 N0 环境门槛重新通过；准备只提交 wrapper mode 并触发远端 Ubuntu 复验。
- 独立提交 `f1a8df9` 已推送；CI run `30929599851` 已通过环境、TypeScript/测试/网络/E2E 与 cap sync，正在组装 debug APK。确认最终绿灯前继续冻结 N1 远端提交。
- CI run `30929599851` 最终全绿（3m11s）：debug APK 组装、merged manifest/哈希复核与 artifact 上传全部成功。N0 远端 Android 基线成立，解除 N1 远端提交冻结。
- N1 W1/W2/W4 在固定 Node 24.14.0/npm 11.12.1 下重新通过 TypeScript、12 files/52 tests、50 产品文件/2 manifest 网络边界与 diff check；准备连同同步后的规划记录形成首个 N1 产品提交。
- W3 核心实现开始：导入校验现接受严格 v1/v2 envelope，并对全部事实嵌套对象、Roll scoreParts 与 settings 执行 exact-key 校验；新增白名单导出/预览/安全恢复模块，下一步接入应用门面与确认 UI 后运行首轮类型测试。
- W3 已接入应用门面与 GoalsScreen 两阶段状态：预览只返回数量/设置摘要并保留原字符串，显式确认才重新解析并提交；导出已切为 v2 白名单 envelope。下一步完成 App 壳层成功/失败路由、样式与专项测试。
- App 壳层已区分普通命令与需要布尔成功结果的导入确认；确认成功后会清理旧 Roll/Session UI 指针并按导入快照路由到 Focus、Settlement 或 Goals。移动端预览卡片与覆盖警告样式已补齐，准备首轮类型检查。
- W3 首轮类型检查只发现旧集成测试的直接导入 API 调用；改为预览/确认后，TypeScript 与既有 12 files/52 tests 全部通过。下一步新增 v1/v2、安全恢复、秘密/原型污染与失败原子性专项测试。
- 已新增导入导出安全测试草案，覆盖 v1/v2、嵌套白名单、危险 settings 回退默认值、普通领域文本保留、秘密键与 `__proto__` 拒绝；继续补应用层 replace 次数与失败一致性测试后统一运行。
- W3 专项测试已补齐并通过：TypeScript、14 files/59 tests。新增覆盖预览零写入、确认恰好一次 replace、v1 默认设置迁移、投影从账本重建、写入失败保持运行态/持久态、秘密与原型污染边界。
- 进入 W3 里程碑 code-review/simplify：审查范围限定本轮导入校验、白名单导出、应用确认门面、Goals/App UI 与新增测试，优先检查数据覆盖、缓存信任、秘密透传及取消/失败状态。
- W3 code-review 首轮发现 1 项 High：事实校验器返回原始行会让部分错误类型绕过 normalizer。当前暂停标记完成，先改为逐字段规范化返回并增加恶意字段类型回归测试。
- High 修复已落盘：description、Roll energy、Session planned/running/target 字段、结算 rating 与 reversal 引用都新增严格类型/范围校验；结合 exact-key 约束后，原始深拷贝不再能携带未知键或已知键的错误类型。已补对象 description 与字符串 plannedMinutes 回归测试。
- High 修复复审补齐 Goal/Activity rating 整数约束与 3.5 回归用例。simplify 检查确认白名单显式展开、预览/确认分层和 execute 布尔适配均承担安全边界，不做压缩式重构。
- 浏览器闭环已更新为 v2 导出与两次同文件导入：首次预览后取消并断言旧状态不变，第二次预览后明确确认才恢复数据；同时断言导出包含默认非秘密 settings。
- W3 终审无剩余代码发现，simplify 无额外改动；固定 Node 24 下 TypeScript、14 files/60 tests、53 产品文件/2 manifest 网络门槛、移动 Edge E2E、Vite production build、Android cap sync 与 diff check 全部通过。W3 标记完成，真实 Android 文件选择/SQLite 仍随 N1 原生门槛补证。
- W5 设置 UI 开始：新增无网络/无权限的 SettingsPanel，覆盖主题、动效、触觉、通知、AI 与 AI 历史策略，并嵌入本地数据入口；下一步接应用门面保存、样式与刷新持久化 E2E。
- SettingsPanel 已通过 App 壳接入原子 `updateSettings`，成功显示本地保存提示、失败复用全局错误且受控控件保持旧值；移动端双列/单列布局与可触达 checkbox 样式已补齐，准备类型与交互验证。
- E2E 已扩展为修改六项策略、刷新后复核持久化，并要求 v2 导出逐字段包含所选非秘密 settings；现有应用门面已在通知策略关闭时跳过新的 Countdown 通知安排。
- 新增通知策略应用层回归：关闭 notificationsEnabled 后开始 Countdown 仍保存绝对时间事实，但不会调用 NotificationPort.scheduleCountdown。
- W5 阶段 code-review 无发现，simplify 检查保留 SettingsPanel 的显式六项策略映射与受控表单，不做抽象压缩。TypeScript、14 files/61 tests、54 产品文件/2 manifest 网络门槛、移动 Edge 刷新/导出/导入 E2E、production build、Android cap sync 与 diff check 全部通过，W5 标记完成。
- 提交 `92a10a8` 已推送且远端 Android CI 正在运行；W6 复核发现初始化失败恢复页尚未接线，继续实现可重试错误页与安全恢复下载，不把它留给设备阻塞。
- MvpApplication 现会在 load 成功后立即构造仅含可验证事实的 recovery envelope，并在初始化完全成功后清除；新增最小 RecoveryScreen，只提供错误摘要、重试和可用时的安全导出，不提供自动清库。
- App 初始化已改为可重试状态机：加载中、成功路由和失败恢复页互斥；失败不再被 loading 分支遮挡，安全导出失败也只更新错误信息。恢复页完成移动端布局接线，下一步补门面与真实浏览器恶意 settings 恢复测试。
- 恢复测试已补齐：应用层覆盖 v1 写回失败的 recovery 文件与 v2 非法 settings 的默认值回退；Playwright 真实注入含 apiKey 的 localStorage，验证恢复页可见、下载无秘密、重试不清库且全程无外网请求。
- 初始化恢复链 code-review 无新增发现；simplify 保留应用层安全 envelope、App 状态机和 RecoveryScreen 三层边界，避免 UI 接触原始未知对象。当前 TypeScript、14 files/62 tests、55 产品文件/2 manifest 网络门槛与 2 条移动 E2E 通过，进入 W6 最终确定性审计。
- W6 审计进展：runtime audit 为 0 漏洞，产品源码无 secret-shaped 字段声明，production build 与 Android cap sync 通过；`92a10a8` 远端 Android CI 全绿并上传 debug APK。待恢复页提交的远端 CI 通过后关闭确定性 W6，真实设备 SQLite/文件选择/强杀证据继续单列待补。
- 恢复页提交 `cacac81` 的远端 Android CI run `30932401567` 全绿（3m26s），debug APK、manifest/哈希与 artifact 上传成功。W6 确定性范围完成；N1 实现可继续进入 N2，但 N1 最终签收仍明确等待真实 API 33+ 设备上的旧库升级、文件选择、通知和强杀恢复证据。

## 2026-08-05 N2 接入点审计

- 按 planning-with-files 与 skill-analyzer 流程完成确定性仓库扫描、分层源码追踪、reverse dependency 检查和 N2 变更地图；报告位于 `skill-analyzer-output/report.md`，结构校验通过。
- 确认 N2 不需要 schema v3：多 Activity 已由独立事实集合表达。实施主线应为独立应用命令 -> selectors -> 按已批准取向拆分 Catalog/详情/活动编辑 -> 开发种子 -> E2E。
- 分析发现 README 的 Node/npm 与 APK 状态已落后，已同步为固定 Node 24.14.0/npm 11.12.1、远端 CI 已生成 debug APK、真实 API 33+ 设备冒烟仍待补。
- 生成的 JSON inventory/dependency cache 仅供本地确定性扫描使用并已忽略；只保留可审查的中文 findings/report 进入版本控制。
- N2 产品取向仍等待用户从 A Roll 优先、B 管理优先、C 复盘优先中确认；在确认前不冻结 UI 规格、不进入实现。

## 2026-08-05 N2 自动设计授权

- 用户选择 A（Roll 优先），随后要求不再询问普通意见，改为自行决策并执行自动化审查；N2 的逐项人工确认和书面复核门槛由独立规格审查、代码审查、测试与 CI 取代。
- 自动收敛为“紧凑 Catalog + 独立详情 + 全局 Roll 始终一跳可达”，保留快速创建 Goal/首活动，复杂编辑进入详情。
- 自动选择允许归档最后一条活动并显式显示“需要活动”；不阻止、不自动暂停，Roll 增加独立可操作原因。
- 开始写入 `docs/superpowers/specs/2026-08-05-n2-offline-goal-catalog-design.md`，提交后按 brainstorming 要求执行最多三轮独立规格审查。
- N2 规格第一轮独立审查状态为 Issues Found：开发种子清理与正式事实不删除规则冲突、progress ratio 普通公式缺失、production artifact 未验证 seed 不可达；另建议 recent Session 使用稳定次级排序。
- 已明确 `dev-seed:` 是唯一物理删除例外，ratio 使用 baseline-relative clamp 公式，recent Session 以 ID 次级排序，并新增真实 `dist`/`vite preview` production E2E 门槛；准备第二轮审查。
- N2 规格第二轮独立审查状态为 Approved，无问题、无建议；规格状态已冻结为自动审查通过。
- brainstorming 要求的 `writing-plans` 在可用技能清单和标准本地路径中均不存在；按项目强制 planning-with-files 流程生成等价逐文件实施计划，用户已授权无需额外人工复核。
- N2 实施计划第一轮独立审查状态为 Issues Found：W1 漏迁移旧 `updateGoal` 测试、三反馈撤销覆盖不足、branch push 不触发现有 CI、UI 重复提交/失败保留输入未测试。
- 已补 W1 文件范围和迁移步骤、每种反馈结算—撤销断言、中央 `commandInFlight` 并发保护与 Storage 失败 E2E，并要求以现有 draft PR 的 pull_request run/head SHA 作为远端 Android 证据；准备第二轮计划审查。
- N2 实施计划第二轮独立审查状态为 Approved，无问题、无建议；设计与计划门槛关闭，进入 W1 测试先行实现。
- N2/W1 已先建立 10 项专项断言；首轮结果为 4 通过、6 个预期失败，准确覆盖缺失的 Activity 命令、旧联合更新签名和 `no-active-activities`。最小实现已拆分 Goal-only update 与 Activity create/update/archive/restore，旧 UI 暂接临时联合入口；专项 10/10 与 TypeScript 已转绿，待全量回归和阶段审查。
- N2/W1 code-review 发现并修复 1 项 Low：新 Roll 空原因未进入 UI 文案表会落到通用提示。映射现由联合类型强制穷尽并指向“添加或恢复活动”；simplify 提取 Activity 归属查找以统一三条命令的错误边界，无行为扩张。
- N2/W1 收口通过：Goal-only update、Activity create/update/archive/restore、跨 Goal 拒绝、幂等归档恢复、Store 失败一致性与 Roll 新空原因均已实现；固定 Node 24 下 TypeScript、15 files/69 tests 和 diff check 全绿，临时 `updateGoalAndActivity` 仅保留到 W3 UI 迁移。
- N2/W2 已先建立 5 组 selector 红灯测试，首轮 5/5 预期失败，覆盖四种反馈结算/撤销、baseline-relative ratio、Catalog needsActivity、活动稳定分组、最近五条与输入不变性；随后补入窄视图与纯派生实现，待专项类型/测试验证。
- N2/W2 code-review 发现 1 项 Medium 测试缺口：未覆盖 interrupted/abandoned 在 progress、累计次数、累计分钟中的差异；已补反例。simplify 将重复 Settlement 构造收敛为显式 fixture，产品 selector 保持窄函数和纯派生结构。
- N2/W2 收口通过：反馈视图现包含 type/baseline/value/target/unit/ratio，Catalog 派生活动计数与 needsActivity，详情稳定分组 active/archived Activities 并返回最多五条 settled/voided 记录；TypeScript、专项 5/5、全量 16 files/74 tests 与 diff check 全绿。
- N2/W3 第一轮 UI 已落盘：旧联合表单拆为 GoalForm、ActivityForm、GoalFeedbackCard、GoalDetailScreen 与紧凑 Catalog；App 增加 goal-detail/History 上下文、同步 commandInFlight 防重锁和独立命令接线，临时联合 API 已删除且 `rg` 无引用。
- W3 浏览器红灯最初在旧 Catalog 缺失活动计数处失败；新 UI 后通过真实移动 Edge 的双击创建、写失败保留输入并重试、多 Activity 编辑、归档最后活动、Catalog/Roll 修复提示、恢复与 History 初始筛选全链，1/1 通过且无外网请求。
- N2/W3 code-review 发现 1 项 Medium 验收缺口：写失败后未直接证明持久快照无半提交；已增加详情无新卡片与 localStorage activities 数量不变断言。simplify 把 Activity 编辑器的三态哨兵替换为显式对象状态，保持新增/编辑/关闭行为不变。
- N2/W3 收口通过：固定 Node 24 下 TypeScript、16 files/74 tests、3 条移动 Edge E2E、61 产品文件/2 manifest 网络边界、production build、Android cap sync 与 diff check 全绿；临时联合 API 已彻底删除，阶段审查无剩余 High/Medium。
- N2/W4 已完成确定性 3 Goal/6 Activity fixture、安装/清理应用命令和 DEV-only 显式确认面板；专项 2 files/9 tests 与 2 条 N2 Edge E2E 转绿，覆盖冲突零写入、ID generator 不消耗、混合 Run 净化、幂等清理与重装。
- W4 code-review 发现并修复 1 项 High 引用完整性风险：只通过 `reversalOfEntryId` 依赖已删除 demo 奖励的账目原本会悬空；现纳入初始删除集并继续执行依赖闭包。simplify 检查保留生成、检测、清理三条窄纯函数边界，不做压缩式重构。
- N2/W4 收口通过：TypeScript、17 files/78 tests、4 条移动 Edge E2E、64 产品文件/2 manifest 网络边界、production build、Android cap sync 与 diff check 全绿；DEV 面板可安装/清理/重装，production 可达性留给 W5 真实 dist 验证。
- N2/W5 四反馈 E2E 首轮 3/4 通过并发现 1 项 Medium 产品缺陷：progress 目标值因 HTML 默认 step 与 min 偏移而拒绝整数 50；GoalForm 的 baseline/target 已改为 `step="any"`，等待四场景复验。
- W5 四反馈复验 4/4 通过：累计次数、累计分钟、数值进度和经验均经创建→Roll→结算→详情→History 撤销→详情回退的隔离浏览器闭环验证。
- 已新增 production 专用 Playwright config/script，常规 config 明确忽略 production spec；真实 build + preview 遍历 Catalog/详情/Roll/History 后，seed 文案/按钮均不可达，localStorage 不含 `dev-seed:`，1/1 通过且无外网请求。CI 已接入该独立门槛，Android smoke 清单补齐 N2 小屏与多 Activity 项。
- N2/W5 code-review 无新增发现，simplify 保留 production/dev 两份显式配置和四反馈场景表，不制造跨文件隐藏抽象。完整门槛通过：TypeScript、17 files/78 tests、8 dev E2E、1 production E2E、0 runtime 漏洞、64 产品文件/2 manifest 网络边界、build/cap sync 与 diff check 全绿；远端 PR head-SHA CI 留在 W6 核对。
- N2/W6 完整 diff code-review 发现 1 项 Medium：归档 Activity 的编辑表单渲染在 active 区，小屏点击后可能离开视口；现按 Activity 归档状态就地渲染，并扩展浏览器用例实际编辑归档项。simplify 把共享表单实例提为单一局部表达式，避免复制命令接线。
- N2/W6 最终本地审计全绿：TypeScript、17 files/78 tests、8 dev E2E、1 production E2E、0 runtime 漏洞、64 产品文件/2 manifest 网络边界、production build、Android cap sync、smoke runner 与 diff check 均通过；源码无 fetch/XHR/WebSocket 或 secret-shaped 产品字段。
- 产品代码 head `908efef` 的 draft PR #1 CI run `30983021203` 全绿（3m35s），完成固定环境、共享/production 验收、Android sync、debug APK、merged manifest/哈希复核和 artifact 上传。artifact `self-improvement-tracker-debug-apk` ID `8920972773`，APK SHA-256 `a3926ce619ae1bd7cf9e026e6d6fab2672a01a71d9720e63da54deb935f8723e`。
- N2 确定性实现完成并可进入 N3；N0/N1/N2 的 API 33+ 真机/可用模拟器 SQLite、通知、文件选择、强杀恢复与小屏人体工学证据仍明确待补，不能由浏览器或 CI APK 替代。
- N3 brainstorming 在用户自动决策授权下完成方案收敛：采用无第三方/无二进制的原创 CSS 像素伙伴，ActivityState 只驱动正向视觉氛围，不进入 Roll。已写入 `docs/superpowers/specs/2026-08-05-n3-companion-activity-state-design.md`，下一步执行独立自动规格审查。
- N3 规格首轮独立审查状态为 Issues Found：2 项事实/兼容边界、2 项时间/撤销因果、1 项不可证伪公平性、1 项 settings 联合类型冲突和 1 项 production CSS/Android 验收缺口。已逐项修订为无 schema 变更的兼容规则、确定账本顺序、撤销即时取消庆祝、精确 UTC 窗口、冻结 30 天阈值与 production computed-style 矩阵；进入第二轮自动审查。
- N3 规格第二轮独立审查状态为 Approved，无问题；设计冻结完成。下一步按 planning-with-files 回退写逐文件实施计划并独立自动复核，真实 Android 视觉继续标记 `native evidence pending`。
- 已写入 `docs/plans/2026-08-05-n3-companion-activity-state-implementation.md`：五个线性工作包覆盖共享完成判定/ActivityState/账本重放、CompanionView、公平性、CSS UI、production/Android 与最终 CI。30 天临时探针确认现有 Roll 可满足冻结阈值且未留下测试文件；准备独立计划审查。
- N3 计划首轮独立审查状态为 Issues Found：缺 future reversal 生效时间测试，最终 CI 与完成状态未严格绑定同一不可变 PR revision。已补未来账目边界，并把 W5 改为候选 exact-head CI 与最终状态 exact-head CI 两次核对；进入第二轮计划审查。
- N3 计划第二轮独立审查状态为 Approved，无问题或建议；规格与逐文件计划均已冻结，开始 W1 红灯测试。
- N3/W1 红灯覆盖 UTC D-6/D-13 闭区间、同日去重/广度 cap、future/voided/低完成排除、同毫秒账本因果、历史 peak、时钟回拨、持久 mood 与导入因果；最小实现后专项 4 files/17 tests 转绿。
- W1 code-review 修复 1 项 Medium 重复 reversal 导入缺口；simplify 以共享 `completion.ts` 消除推荐模块反向依赖，并让 CompanionStage 复用既有投影联合。最终 TypeScript、18 files/86 tests 与 diff check 全绿，准备独立提交。
- N3/W2 红灯确认 selector 缺失而固定 30 天 Roll 仿真已通过；最小 selector 后 2 files/8 tests 与全量 20 files/94 tests 转绿。阶段审查补出 2000ms 闭区间一次性刷新矛盾，已同步规格/计划并发起快速复核。
- W2 时间边界首次复核发现 `setTimeout(0)` 在冻结时钟下可能重复；现改为半开 2 秒窗口，2,999ms 仍庆祝、2,000ms 精确退出，并恢复严格正延时的一次性 timer。等待第二轮快速复核。
- W2 时间修订第二轮独立复核 Approved；新增纯 refresh-delay selector，在冻结 now==deadline 时重复调用均返回 null，为 W3 App effect 提供同一已测试边界。
- N3/W2 收口通过：unlock 阈值、四 mood 优先级/小时边界、future settlement/reversal、即时 reversal、2 秒半开窗口、冻结 deadline、输入不变、Roll 字节不变与 30 天公平性均覆盖。code-review 的 1 项 Medium 已经独立规格复核关闭；TypeScript、20 files/105 tests 与 diff check 全绿。
