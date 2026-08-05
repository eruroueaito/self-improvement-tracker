# Self Improvement Tracker 项目计划

## 目标

以已完成的方案 B 基础 MVP 为起点，严格按照 `docs/plans/2026-08-04-post-mvp-roadmap.md` 从 N0 连续开发到 N7；只有 N7 iOS 适配通过完整验收后，才达到本轮截止目标。

## 当前阶段

### 当前关键路径（2026-08-04，N1 已恢复）

- N0：ADB 无 ready 设备，宿主自 2026-07-24 未重启，Android Emulator accel 仍返回 6；需启用 WHPX 后重启，或连接 API 33+ 物理设备。
- N1：用户已于 2026-08-04 明确批准书面规格；目标恢复，当前进入详细实施计划与编码。
- 总体：N0 原生证据继续挂起，但不再阻止 N1 的共享纯逻辑、浏览器契约和可确定验证；任何原生结果仍必须待真实设备补证。
- 2026-08-05 用户确认执行策略：绕开当前外部阻碍，优先开发 Android 可实现部分；创建新的公开 GitHub 仓库并持续上传已验证提交。iOS 仍保留为 N7 截止目标，但不占用当前开发优先级。

### 阶段 11：N0 Android 原生 Alpha（进行中）

- [x] 召回项目状态、恢复规划文件并确认从提交 `2c9cb22` 继续
- [x] 固定并验证 Node 24.14.0、npm 11.12.1、JDK 21.0.6、Android SDK 36、Build Tools 35.0.0 与 Gradle 8.14.3
- [x] 完成 `assembleDebug`、APK 签名/权限/哈希复核
- [ ] 安装 APK 到可启动的 API 33+ 模拟器或真机（当前宿主需启用 WHPX 并重启，或连接物理设备）
- [ ] 完成 SQLite、通知、后台/强杀恢复、文件导入导出和离线原生冒烟
- [x] 建立强制 assembleDebug/APK artifact 的 CI、CSP/无网络出口门槛与 Android smoke 记录，并通过本地等价链
- [x] 增加设备就绪后可重复运行的 ADB 原生证据采集脚本；人工 UI 结果仍由 smoke 清单验收
- [x] 完成 smoke 脚本 code-review、simplify、PowerShell 语法、npm 参数转发和无设备失败路径验证
- [x] 用 fake ADB 契约覆盖 smoke runner 的成功与关键拒绝路径，并完成审查、简化和验证
- [x] 执行 N0 code-review、simplify 与当前环境可运行的完整验证
- [ ] 在原生冒烟与远端 CI 证据补齐后完成 N0 独立提交
- [x] 创建公开 GitHub 仓库、推送已提交基线并取得首轮远端 CI 绿灯及 debug APK artifact

### 阶段 12：N1 数据、迁移与设置底座 v2（进行中）

- [x] 写入 N1 独立设计规格
- [x] 完成三轮独立规格审查并关闭全部问题
- [x] 完成用户书面复核
- [x] 写入并核对 N1 详细实施计划
- [x] W1：实现版本化快照、AppSettings 与纯 v1→v2 迁移器
- [x] W2：迁移应用初始化及 Memory/localStorage 原子契约
- [x] W4：实现 SQLite 双版本状态机、事务写入与失败注入（52 项本地测试通过；真实 Android 旧库证据仍属于 N1 最终门槛）
- [x] W3：实现 v1/v2 导入预览、确认、v2 导出与安全恢复导出（14 files/60 tests、E2E、build/cap sync 已通过）
- [x] W5：实现基础设置 UI 与 N1 端到端验收（14 files/61 tests、刷新持久化 E2E、build/cap sync 已通过）
- [x] W6：执行 code-review、simplify、完整确定性验证与选择性提交（真实 Android 原生证据仍为 N1 最终门槛）
- [x] 实现版本化迁移、AppSettings、事务失败回滚和导入导出 v2
- [x] 完成 v1→v2、SQLite 契约、失败注入和秘密排除测试
- [x] 执行审查、简化、验证与独立提交

### 阶段 13：N2 离线产品能力补全（确定性实现完成，原生证据待补）

- [x] 完成现有源码、依赖关系、数据流和测试面的确定性接入点审计
- [x] 用户确认 N2 首要取向为 A：Roll 优先，并授权后续设计决策采用自动化审查
- [x] 冻结、提交并通过两轮自动规格复核（第一轮修订，第二轮批准）
- [x] 写入并通过两轮自动复核 N2 详细实施计划（第一轮修订，第二轮批准）
- [x] W1：独立 Goal/Activity 命令与 Roll 空原因
- [x] W2：Goal Catalog/详情只读 selectors
- [x] W3：紧凑 Catalog、Goal 详情与多 Activity UI
- [x] W4：确定性开发种子与安全清理
- [x] W5：E2E、production artifact 边界与 CI 接线
- [x] W6：完整阶段审查、简化、远端 Android CI 与证据收口
- [x] Goal 详情、多 ActivityTemplate 管理、反馈模型展示和开发种子模式
- [x] 通过移动浏览器自动闭环验证创建、Roll 响应与全离线体验；真实设备人体工学计时待原生 smoke
- [x] 执行审查、简化、验证与独立提交

### 阶段 14：N3 完整伙伴反馈（release candidate，等待 exact-head CI）

- [x] 冻结并自动复核 N3 详细设计规格
- [x] 写入并自动复核 N3 逐文件实施计划
- [x] ActivityStateEngine、版本化活跃度和公平性仿真
- [x] 原创像素伙伴 3 阶段 × 4 状态、短动画、静态降级和解锁投影
- [ ] 执行奖励滥用测试、审查、简化、验证与独立提交

### 阶段 15：N4 AI 基础与 GoalDraft（待开始）

- [ ] 审计并选定 MIT SecretStore，实现 ProviderAdapter 与严格网络边界
- [ ] 实现可关闭、可编辑、确认后才写库的 GoalDraft
- [ ] 完成 Provider fixtures、非法输出、超时取消和秘密扫描
- [ ] 执行审查、简化、验证与独立提交

### 阶段 16：N5 SettlementDraft（待开始）

- [ ] 实现自然语言结算草稿、系统输入法语音说明和手动降级
- [ ] 验证模型不能计算奖励或污染事实；评估非阻塞 Roll 文案润色
- [ ] 执行审查、简化、验证与独立提交

### 阶段 17：N6 Android 发布候选（待开始）

- [ ] 完成 AppSettings UI、可访问性、隐私、安全、生命周期与供应链硬化
- [ ] 完成第一性原理和对抗性审查，关闭全部高严重度问题
- [ ] 构建并验收 Android release candidate
- [ ] 执行审查、简化、完整发布验证与独立提交

### 阶段 18：N7 iOS 适配（截止目标，待开始）

- [ ] 完成 iOS SQLite、迁移、Keychain、通知、文件和生命周期适配
- [ ] 完成 VoiceOver、动态字体、深色/减少动态、备份和隐私清单
- [ ] 构建并验收 TestFlight 候选；验证 Android/iOS 共享领域与应用规则
- [ ] 执行最终完成审计，确认 N0–N7 所有证据齐全后结束目标

### 阶段 10：Post-MVP 后续路线规划（已完成）

- [x] 召回 MVP 完成状态并确认从提交 `998d494` 继续，不重做既有能力
- [x] 对照原始完整需求、二次结构审查和当前代码梳理差距
- [x] 确定阶段顺序、依赖关系、风险门槛和明确不做项
- [x] 落盘详细路线图并完成一致性检查
- [x] 同步 findings/progress，并准备项目记忆与规划提交

### 阶段 1：需求与现状探索（已完成）

- [x] 读取附件需求正文
- [x] 检查项目目录、现有文档与 Git 状态
- [x] 判断是否需把大项目拆为多个可独立设计的子项目

### 阶段 2：澄清与方案比较（已完成）

- [x] 对产品边界、模块划分、数据模型、阶段依赖、离线/安全、许可证和测试策略做第二轮结构审查
- [x] 核验附件引用项目及核心依赖的当前许可、维护状态和适配风险
- [x] 形成“保留 / 修改 / 删除 / 延后”问题清单与建议结构
- [x] 用可视化伴侣展示原结构与建议结构的关键差异
- [x] 一次一个问题确认目的、约束和成功标准
- [x] 比较至少两个技术方案：成熟度、社区、复杂度匹配、维护成本、学习曲线
- [x] 明确推荐的最简单可用方案
- [x] 等待用户确认总体结构方向（已选方案 B）

### 阶段 3：设计与审批（已完成）

- [x] 完成架构、模块、数据流、错误处理和测试设计
- [x] 获得用户总体设计批准（方案 B）
- [x] 写入并审查设计规格文档
- [x] 用户明确授权取消逐节预览门槛，直接推进基本 MVP

### 阶段 4：实现计划（已完成）

- [x] 固化基本 MVP 设计规格
- [x] 完成三轮独立规格审查并关闭全部问题
- [x] 创建可执行实施计划

### 阶段 5：M0 工程与原生风险基线（已完成）

- [x] 初始化 Git、MIT/贡献/安全/第三方声明与 ADR
- [x] 搭建 React + Vite + TypeScript + Capacitor 工程
- [x] 建立测试、diff 检查、类型检查与许可证基线
- [x] 生成并 sync Android 工程；记录本机缺 SDK/Gradle 下载超时的 APK 门槛

### 阶段 6：M1–M2 Goals、存储与确定性 Roll（已完成）

- [x] 实现模块化领域实体、端口、内存/localStorage/SQLite 适配器
- [x] 实现 Goal/ActivityTemplate 创建、编辑、暂停、归档和恢复
- [x] 实现版本化导入导出、完整校验和移动端系统分享
- [x] 实现 RecommendationRun、硬过滤、确定性评分和理由

### 阶段 7：M3 Session、结算与 History（已完成）

- [x] 实现 Flowtime/Countdown、暂停/恢复与绝对时间重算
- [x] 实现本地通知和无权限/浏览器降级端口
- [x] 实现手动 Settlement 与原子化存储
- [x] 实现 History 查看、筛选与备注

### 阶段 8：M4 奖励与静态宠物（已完成）

- [x] 实现版本化 RewardLedger、幂等结算与反向撤销
- [x] 实现可重建 CompanionProjection
- [x] 接入静态宠物状态与非阻塞奖励反馈

### 阶段 9：MVP UI、验证与收尾（已完成）

- [x] 完成 Goals / Roll / Focus / Settlement / History 流程
- [x] 完成大字体、减少动态、键盘和语义标签基础支持
- [x] 运行单元、契约、Playwright、构建、cap sync 和导入导出验证
- [x] 执行 code-review、simplify 与完成审计

## 关键约束

- 完全开源、完全本地运行；仅自然语言理解场景调用用户自行配置的模型 API。
- 用户已于 2026-08-04 明确选择方案 B，并要求不再停留在网页预览或逐节确认，直接推进到基本 MVP。
- 新信息默认写入项目记忆，代码与临时实现状态只写本项目计划文件。
- 本轮明确终点为 N7；任何 N0–N6 阶段完成都只是中间进度，不得提前宣称总目标完成。

## 错误记录

| 错误 | 尝试 | 处理 |
|---|---:|---|
| N2 实施计划两行 Markdown 尾随空格令 `git diff --cached --check` 非零，但 PowerShell 顺序命令仍继续创建了本地 commit | 1 | 改成空引用行格式、重新运行 check，并 amend 尚未推送的提交；后续把检查与提交分开调用 |
| W2 最近记录把 Goal 条件与 Settlement 类型谓词合在同一 `filter` 后，TypeScript 未保留非空字段收窄 | 1 | 拆为先执行类型谓词、再按 Goal 过滤的两步链，保持运行逻辑不变并让后续排序/映射获得严格类型 |
| W3 E2E 用非精确按钮名“目标”时同时匹配详情页的编辑/状态/历史按钮 | 1 | 将底部导航的 Goal/Roll 定位改为 `exact: true`；此前交互已通过到最后活动归档提示，不修改产品行为 |
| W3 E2E 在未展开“已归档活动”折叠区时直接点击隐藏的恢复按钮并超时 | 1 | 先通过可见 summary 展开归档区再定位恢复动作，保持规格中的信息层级不变 |
| W3 全量 E2E 中旧 MVP 流程直接操作已迁入“高级设置”的重要性字段并超时 | 1 | 更新旧验收先展开高级设置；N2 新流程和初始化恢复用例已通过，不回退新信息层级 |
| W4 检查 Vite 环境声明时误读不存在的 `src/ui/env.d.ts` | 1 | 用 `rg --files src` 定位真实文件为 `src/vite-env.d.ts`，确认已引用 `vite/client`；不再使用错误路径 |
| W5 四反馈 E2E 首轮中 progress 未创建出可 Roll 的 active Goal，后续候选定位超时 | 1 | 在创建后立即断言对应 Goal 标题以缩短故障位置，并单独复跑 progress 检查表单校验状态；其余三反馈已通过 |
| W5 审查命令在 PowerShell 中把 `playwright*.ts` 作为 rg 路径，Windows 未展开 glob | 1 | 改为读取明确配置文件并对目录/文件使用 `-g` 或显式路径；审查所需内容已完整读取，不重复无效命令 |
| W6 用 `gh run view --json artifacts` 查询产物时发现该字段不受支持 | 1 | 改用 GitHub Actions artifacts API 获取 artifact 元数据，并从 run 日志提取 APK SHA-256；run 本身仍用 `gh run view` 核对 conclusion/head SHA |
| 用 PowerShell `foreach` 的语句结果直接接管道检查 `writing-plans` 路径时触发 `An empty pipe element is not allowed` | 1 | 改为在循环内逐行 `Write-Output`；确认两个候选路径均不存在，不再重复原命令 |
| 按默认 `.codex/skills` 路径运行 `session-catchup.py` 时文件不存在 | 1 | 用 `rg --files` 定位到 `.agents/skills/planning-with-files/planning-with-files/scripts/` 后成功运行 |
| 用 `rg --files` 查找现有计划/说明文件返回退出码 1 | 1 | 解释为当前空目录中无匹配文件，不重复执行 |
| PowerShell 默认代码页读取 UTF-8 附件导致中文乱码 | 1 | 改用 `.NET ReadAllText(..., UTF8)` 成功恢复完整正文 |
| 首次从 PowerShell stdin 调用 `consolidate_memory.py` 时没有实际传入 JSON，解析失败 | 1 | 改为用显式临时 JSON payload 文件调用，避免依赖未定义的 shell 变量 |
| 第二次尝试用 PowerShell 字符串通过 stdin 传空记忆 payload 时多写了 JSON 花括号 | 1 | 停止继续尝试易错的 shell 内联 JSON，沿用已验证的临时 payload 文件方式 |
| 可视化伴侣首次启动时尝试绑定环境占位主机名 `<LOCALHOST>`，产生 `ENOTFOUND` | 1 | 按 visual companion 指南显式传入 `--host 127.0.0.1 --url-host localhost` |
| 伴侣服务前台进程在工具所有者 60 秒退出后自动停止，页面无法访问 | 1 | 改用 `Start-Process -WindowStyle Hidden` 启动持久后台服务，并在交付链接前执行 HTTP 验证 |
| 通过 `Start-Process` 启动 `start-server.sh` 后，脚本父进程仍退出并写入 `.server-stopped` | 2 | 不再重复包装脚本；检查底层 `server.js` 参数，直接启动持久 Node 服务 |
| 初始化 Git 后检查提交身份时发现仓库和全局均未配置 user.name/user.email | 1 | 仅为本仓库配置 `Codex <codex@local>`，不修改用户全局 Git 设置 |
| 并行执行多项 `npm view` 时在 Playwright 查询前达到 30 秒超时 | 1 | 已保留前七项成功结果；后续只对尚缺的 Playwright 单项查询，不重复整批命令 |
| 更新进度时提交了一个没有变更行的空 `findings.md` 补丁 hunk | 1 | `apply_patch` 原子拒绝且未修改文件；拆成包含实际新增内容的有效补丁 |
| 首次 `npm install` 在 120 秒内没有输出或生成 lockfile，工具超时终止 | 1 | 确认未留下 node_modules/lockfile；改用详细日志和更长的有限超时定位网络或解析阶段 |
| 首轮 TypeScript 检查发现 CSS side-effect 类型、空态文案索引和两个 Promise 返回类型错误 | 1 | 添加 Vite 客户端声明、为空态提供后备文案，并把 pause/resume 回调归一为 Promise<void> |
| `cap add/sync` 因 npm 安装出的 `bplist-creator@0.1.0` 目录缺少 package.json/入口而失败 | 1 | 核验上游 MIT 与 0.1.1，显式锁定完整的 0.1.1 开发依赖后重装再生成工程 |
| 干净重装提示 jsdom 30 不支持当前 Node 25 的奇数版本 | 1 | 降级到仍受维护且声明支持 Node >=24 的 jsdom 29.1.1，保持测试能力不变 |
| 首轮 Vitest 中 Node 25 注入的无 backing file `localStorage` 缺少 `clear`，导致两个存储契约测试失败 | 1 | 测试初始化仅在 Storage 不完整时安装同步内存 Storage 合约；不改变产品浏览器适配器 |
| Playwright 真机浏览器发现从 Focus 切到 Settlement 时表单以旧 Session 初始化，完成默认显示 50% | 1 | 在切屏前从应用门面刷新已结束快照，保证表单按最新 endType/时长初始化；同时补本地 data favicon 消除 404 |
| 首次 Gradle assembleDebug 在下载 8.14.3 分发包时触发默认 10 秒连接超时 | 1 | 将项目 wrapper 的有限网络超时提高到 60 秒后重试；仍不绕过签名或 SDK 检查 |
| 新增导入校验后 TypeScript 未把 Record 中的 cumulative unit 自动收窄为字面量联合 | 1 | 在已经过 minutes/times 运行时分支校验后显式保留该联合类型，未放宽为任意 string |
| 加入 `e2e/mvp.spec.ts` 后 Vitest 默认文件匹配误收 Playwright test，导致套件装载失败 | 1 | 使用 Vitest 官方 configDefaults 并显式排除 e2e 目录，让单元与浏览器测试由各自运行器负责 |
| 在损坏 node_modules 上增量安装时 npm Arborist 因空版本报 `Invalid Version` | 1 | 将损坏依赖树与 lockfile移到工作区内隔离名，干净重装成功后删除隔离副本 |
| PowerShell 递归 `Remove-Item` 清理已验证的损坏依赖树被执行策略拒绝 | 1 | 保持目标路径验证证据，改用项目已有 rimraf 对两个精确生成目标清理，不触碰源码或用户数据 |
| Gradle 60 秒连接重试在 5 分钟工具上限仍未下载到分发包 | 1 | 停止重复网络尝试，保留 cap sync 证据并把 assembleDebug 明确列为 Android SDK 36 环境门槛 |
| 最终链式检查末尾直接查询三个无监听端口时 PowerShell 以空结果返回退出码 1 | 1 | cap sync/audit/diff check 均已成功；改为显式 if/else 断言“无监听”为成功状态 |
| Node 24 直接调用系统 npm CLI 时版本为 11.11.1，与 `npm.ps1` 显示的 11.12.1 不一致 | 1 | 不修改用户全局 npm；在被忽略的 `.tools/npm` 安装并使用精确 11.12.1 |
| Windows SDK 安装器用 curl 连接官方 `dl.google.com` 约三分钟仍为 0 字节 | 1 | 终止该下载并把安装器改为 BITS，缺少 BITS 时回退 Invoke-WebRequest；保留官方 URL 与 SHA 校验 |
| 重试前用显式校验后的 PowerShell `Remove-Item -Recurse` 清理空 SDK 临时目录仍被执行策略拒绝 | 1 | 不改用跨 shell 删除；空目录不影响唯一临时目录安装，停止清理并单独运行安装器 |
| 非管理员只读查询 `Get-BitsTransfer -AllUsers` 返回 Access denied | 1 | 不请求提权；改用临时文件字节数和 SDK 组件目录作为下载/安装进度证据 |
| 首次查询 sdkmanager TCP 连接时沿用了许可证阶段的旧 Java PID，命令因无匹配连接退出 1 | 1 | 从当前 SdkManagerCli 命令行重新解析新 PID，确认组件安装进程已连接 Google 443 |
| sdkmanager 批量安装五个组件时连接已建立但数分钟 CPU/目录字节均无增长 | 1 | 终止批量进程；保留 command-line tools，改用 BITS 下载官方仓库元数据并按构建组件/模拟器分组逐包处理 |
| 解析 Android 仓库 XML 时使用 `$host` 变量，与 PowerShell 只读 `$Host` 大小写不敏感冲突 | 1 | 改用任务专用 `$archiveHost`；不重新下载已成功保存的元数据 |
| Windows PowerShell 5.1 解析元数据脚本不支持 PowerShell 7 的 `?.` null 条件语法 | 1 | 改用 `SelectSingleNode` 后显式 null 判断，不重复同一语法 |
| 第二次元数据摘要把 PowerShell XML 字符串节点当作 XmlElement 读取 `.InnerText`，URL/Size 输出 null/0 | 1 | 沿用已正确解析的 URL/Size，并只从 checksum XmlElement 读取 InnerText；安装器使用显式固定元数据 |
| Windows PowerShell 5.1 解析无 BOM UTF-8 安装器时，新增中文字符串字节导致后续引号/括号被误判 | 1 | 安装器模块头和运行时文本改为 ASCII English，并为 `-not` 条件加显式括号；不靠全局代码页或 BOM |
| 手动逐包安装前的 `sdkmanager --licenses` 仍在远端读取阶段卡住且未生成 licenses 目录 | 1 | 终止该网络步骤；安装器强制显式 `-AcceptSdkLicense`，本地用固定官方归档，CI 继续记录 sdkmanager license step |
| N0 环境验证器用 `shell:true` 调用带空格工作区内的 `gradle.bat`，Windows 把命令拆成 `D:\AI` | 1 | Windows 分支改为显式 `cmd.exe /d /s /c` 调用完整引号路径；Java 子进程取消 shell |
| `cmd.exe /c` 调用 Gradle 的第二种引号形式仍把转义引号视为命令文本 | 2 | 不再继续调 shell 引号；直接用 Java 调用已校验分发包的 Gradle launcher JAR，CI 继续走 wrapper |
| 在 `android/` 工作目录运行 Gradle 时仍用仓库根相对 `.tools` 路径，launcher 解析失败且 Gradle 参数落给 Java | 1 | 改用绝对仓库 launcher 路径，确认存在后再启动 Gradle |
| Gradle 在线解析经本机代理端口运行约两分钟后 cache 仍固定为 137,278 字节且 CPU 无增长 | 1 | 终止该进程；先核对代理配置，再选择修复 Java 代理或用 BITS 预取依赖，不重复在线盲等 |
| PowerShell 直接传未引用的 Java `-Dhttp.proxyHost=...` 时把点号参数错误拆成主类 | 1 | 把每个 JVM `-D` 参数作为显式单引号字符串传递，再启动代理构建 |
| PowerShell 5.1 `Expand-Archive` 解压 1.8 GB API 36 ZIP64 镜像时报本地文件头损坏 | 1 | 归档大小与官方 SHA-1 已先通过；安装器改用 Windows `tar.exe` 解压 ZIP64，模拟器本体保留，系统镜像重新下载后复验 |
| 手动安装 Emulator 37.1.11 后 `avdmanager` 因归档未含 `package.xml` 报 emulator package 未安装 | 1 | 二进制与版本已核验；安装器为固定版本生成最小本地 SDK package metadata，再创建专用 AVD |
| `sit_n0_api36` 首次启动时 emulator 兼容性预检通过，但 QEMU 随后以硬件加速不可用退出 | 1 | 固件虚拟化与 HypervisorPresent 均为 true，但 emulator-check 返回 6；先验证显式 `-accel off` 软件回退，不擅自修改需提权/重启的 Windows 功能 |
| x86_64 AVD 用 `-accel off` 可启动 QEMU/ADB 端口但持续 offline 且 CPU 近零 | 1 | 停止无进展实例；安装同版 API 36 Google APIs arm64-v8a r07 作为无需 WHPX 的跨架构软件回退 |
| ARM64 API 36 AVD 在 x86_64 Windows 宿主被 QEMU2 明确拒绝 | 1 | 删除安装器中的无效 ARM64 回退开关，不再诱导额外 1.8 GB 下载；原生冒烟需 WHPX 或物理 Android 设备 |
| 对 offline emulator 执行 `adb emu kill` 在有限窗口内超时 | 1 | 按已核对命令行精确终止本任务启动的 emulator/QEMU PID；不使用广泛进程名终止 |
| 本机 Playwright Chromium revision 1234 尚未安装，默认 E2E 未进入用例 | 1 | 尝试安装固定 Chromium；产品测试本身尚未失败 |
| Playwright Chromium 直连下载超时，显式代理后到 20% 又 TLS reset | 2 | 停止无进展安装进程；本机用配置支持的 Edge 通道通过完整闭环与网络记录，CI 仍强制安装默认 Chromium |
| SQLite 包的 README 链接了增量升级文档，但 npm 发布包未包含对应 `docs/IncrementalUpgradeDatabaseVersion.md` | 1 | 不猜测缺失文档内容；以本地 TypeScript 定义和现有 API 为准，规格区分插件 DDL version 与 app_meta 数据版本 |
| 同步 N1 规格进度时把第二个 `Update File` 放进未闭合的 patch hunk | 1 | `apply_patch` 原子拒绝且未修改文件；改用各自完整、独立的标准 hunk |
| N1 规格提交前 `git diff --check` 报尾空格，但 PowerShell 链未按退出码中止，提交仍继续 | 1 | 修正两处 Markdown 硬换行尾空格和 EOF 空行；审查后用显式退出码门槛 amend 纯文档提交 |
| 为重新定位 Android SDK 先后递归扫描 D 盘与用户目录，均在 20–30 秒超时 | 2 | 停止整盘递归；从 AVD/既有会话记录定位固定 SDK 根目录 `D:\Android\Sdk`，后续只检查精确路径 |
| Windows PowerShell 5.1 在脚本参数默认表达式中把 `$PSScriptRoot` 解析为空，首次 smoke preflight 未进入设备检查 | 1 | 将 APK/EvidenceRoot 默认值改为参数绑定后计算；用真实 `powershell.exe -File` 路径复验 |
| fake ADB 成功路径首次运行时，runner 给 `$pid` 赋值触发 PowerShell 只读内置 `$PID` 冲突 | 1 | 重命名为 `$appProcessId`；继续用成功路径和崩溃路径同时复验 |
| 对 solution-style `tsconfig.json` 直接执行 `tsc --noEmit` 没有检查 project references，误显示 W1 无类型错误 | 1 | N1 及后续统一执行仓库脚本 `npm run typecheck`（`tsc -b`）；实施计划已修正验收命令 |
| v1 边界 fixture 把 `rewardWeight` 写成 0.1，低于既有领域下限 0.25 | 1 | 修正为合法边界值 0.25；保留通过真实领域校验器验证 fixture 的做法 |
| 直接用 Node 24 启动 npm CLI 时，npm script 子进程仍从系统 PATH 拾取 Node 25，N0 环境门槛立即失败 | 1 | 仅在验证进程前置仓库固定 Node 24 目录后重跑；不修改用户全局 Node/PATH |
| GitHub Actions 首轮在创建 job 前立即失败且无日志 | 1 | 官方上下文表确认 `jobs.<job_id>.env` 不允许 `runner`；把 SDK 根从 `${{ runner.temp }}` 改为该位置允许的 `${{ github.workspace }}` 后重新推送 |
| 修复上下文后 CI 在 setup-java 失败：`21.0.6+7` 不匹配 Temurin 的完整 SemVer | 1 | 按 action 返回的可用版本改为 `21.0.6+7.0.LTS`；同步升级官方 action 当前主版本，并限制 feature push 不重复触发 CI |
| 同一补丁尝试同时更新 findings/progress 时使用了不属于 findings 的上下文行 | 1 | 补丁被原子拒绝且未产生修改；分别读取两文件尾部后，以各自真实末行作为独立上下文重试 |
| 默认终端直接运行 N0 环境检测时命中系统 Node 25 且未注入 Android SDK 根目录 | 1 | 该结果是本机 shell 未选择仓库固定工具链，不是 wrapper mode 回归；按既有 N0 方式前置 `.tools` Node 24/npm 并注入 `D:\Android\Sdk` 后复验 |
| W3 首轮类型检查仍有两处集成测试调用已移除的直接 `importData` | 1 | 产品代码类型通过到测试边界；把旧测试改为 `previewImport` 无写入断言与 `confirmImport` 显式提交，不保留绕过确认语义的兼容入口 |
| 同一补丁在测试 hunk 末尾遗留空 `@@`，导致后续 task_plan 更新被解析为 hunk 内容 | 1 | apply_patch 原子拒绝且未产生修改；拆成两个各自完整的补丁后成功更新测试与错误记录 |
| 更新 E2E 与 progress 的组合补丁再次在文件切换前遗留空 `@@` | 1 | apply_patch 原子拒绝且未修改文件；先单独应用完整 E2E hunk，再以真实末行上下文更新规划文件 |
| PowerShell 下用 `rg src/app/*.test.ts` 查询通知测试，Windows 不展开该 glob | 1 | 已直接读到产品分支确认 notificationsEnabled 门槛；后续用 `rg ... src/app -g '*.test.ts'` 搜索测试，不重复无效路径 |
| W5 最终链把含单双引号的 remote CSS `rg` 正则嵌入 PowerShell 双引号命令，解析器在执行前失败 | 1 | 该次没有运行任何测试；拆为不含复杂正则的主验证链与独立只读扫描后，全部门槛完整通过 |
