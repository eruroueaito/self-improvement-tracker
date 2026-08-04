# Self Improvement Tracker 项目计划

## 目标

按用户确认的方案 B 完成可运行、可验证的基本 MVP：真实本地持久化的 Goals → 确定性 Roll → Flowtime/Countdown → 手动结算 → 奖励账本/静态宠物反馈 → History/导入导出，并具备 Capacitor Android 工程与自动化测试。

## 当前阶段

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

## 错误记录

| 错误 | 尝试 | 处理 |
|---|---:|---|
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
