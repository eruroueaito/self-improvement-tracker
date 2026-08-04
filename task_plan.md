# Self Improvement Tracker 项目计划

## 目标

按用户确认的方案 B 完成可运行、可验证的基本 MVP：真实本地持久化的 Goals → 确定性 Roll → Flowtime/Countdown → 手动结算 → 奖励账本/静态宠物反馈 → History/导入导出，并具备 Capacitor Android 工程与自动化测试。

## 当前阶段

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

### 阶段 3：设计与审批（进行中）

- [ ] 分段呈现架构、模块、数据流、错误处理和测试设计
- [ ] 获得用户设计批准
- [ ] 写入并审查设计规格文档
- [ ] 请用户审阅落盘规格

### 阶段 4：实现计划（进行中）

- [x] 固化基本 MVP 设计规格
- [ ] 完成独立规格审查
- [x] 创建可执行实施计划

### 阶段 5：M0 工程与原生风险基线（待开始）

- [ ] 初始化 Git、MIT/贡献/安全/第三方声明与 ADR
- [ ] 搭建 React + Vite + TypeScript + Capacitor 工程
- [ ] 建立测试、格式、类型检查与许可证基线
- [ ] 生成 Android 工程并验证基础构建条件

### 阶段 6：M1–M2 Goals、存储与确定性 Roll（待开始）

- [ ] 实现模块化领域实体、端口、内存/本地持久化适配器
- [ ] 实现 Goal/ActivityTemplate 创建、编辑、暂停、归档和恢复
- [ ] 实现版本化导入导出
- [ ] 实现 RecommendationRun、硬过滤、确定性评分和理由

### 阶段 7：M3 Session、结算与 History（待开始）

- [ ] 实现 Flowtime/Countdown、暂停/恢复与绝对时间重算
- [ ] 实现本地通知降级端口
- [ ] 实现手动 Settlement 与原子化存储
- [ ] 实现 History 查看与备注

### 阶段 8：M4 奖励与静态宠物（待开始）

- [ ] 实现版本化 RewardLedger、幂等结算与反向撤销
- [ ] 实现可重建 CompanionProjection
- [ ] 接入静态宠物状态与非阻塞奖励反馈

### 阶段 9：MVP UI、验证与收尾（待开始）

- [ ] 完成 Goals / Roll / Focus / Settlement / History 流程
- [ ] 完成大字体、减少动态、键盘和语义标签基础支持
- [ ] 运行单元、契约、UI、构建和导入导出验证
- [ ] 执行阶段性 code-review、simplify 与完成审计

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
