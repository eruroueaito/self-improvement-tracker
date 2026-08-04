# Self Improvement Tracker 基本 MVP 实施计划

## 完成定义

达到设计规格第 12 节的十一项验收场景，并且审查、简化、文档和记忆已同步。AI、完整像素动画和 iOS 发布不在本计划内。

## M0：治理、脚手架与风险基线

1. 初始化 Git，创建 LICENSE、README、CONTRIBUTING、SECURITY、THIRD_PARTY_NOTICES 和 ADR。
2. 创建 Vite + React + TypeScript 工程，并配置 ESLint、Vitest、Testing Library、Playwright。
3. 加入 Capacitor、Android 平台、SQLite 与本地通知依赖；固定兼容版本。
4. 查找 Android SDK；生成 Android 工程，运行 `cap sync`，能构建则运行 `assembleDebug`。
5. 创建目录边界和依赖约束测试。

验收：typecheck/test/build 空壳通过，Android 工程生成，许可清单存在。

## M1：领域、存储与 Goal Catalog

1. 实现共享 Result、Clock、IdGenerator 和领域校验。
2. 实现 Goal、ActivityTemplate 与应用用例。
3. 实现内存、浏览器持久化和 SQLite schema/适配器。
4. 实现版本化导入、校验、事务替换和导出。
5. 运行共享存储契约测试。

验收：Goal/Activity CRUD、暂停/恢复/归档、刷新持久化、导入导出往返通过。

## M2：确定性 Roll

1. 实现 RecommendationRun、硬过滤、分项评分、稳定排序和 reasonCode。
2. 实现选择和显式 dismiss 记录。
3. 用固定时钟测试时间、场景、恢复、近期完成、长期未接触和暂停目标。
4. 实现 Goals 与 Roll 最小真实 UI。

验收：离线输入时间后返回最多三个稳定候选，原因可解释，过滤无误。

## M3：计时、结算与 History

1. 实现 Flowtime/Countdown 状态机和恢复规则。
2. 实现通知端口、浏览器空实现与 Capacitor 实现。
3. 实现 SettlementTransaction、幂等结算和 History 查询/备注。
4. 实现 Focus、Settlement、History UI。

验收：完整离线闭环可运行；刷新后计时恢复；重复结算无重复副作用。

## M4：奖励与静态宠物

1. 实现 RewardEngine v1、重复活动折扣和上限。
2. 实现 RewardLedger、唯一幂等键、反向账目与投影重建。
3. 实现静态宠物 stage/mood 展示和非阻塞庆祝反馈。
4. 测试重复确认、重复撤销、系统时间异常和账本一致性。

验收：XP 可解释、宠物不惩罚、撤销不删历史、投影可从账本重建。

## M5：MVP 体验与完成审计

1. 完成空状态、错误状态、键盘、大字体、减少动态和触摸尺寸。
2. 增加 Playwright 端到端闭环。
3. 运行 typecheck、lint、unit/contract/UI、build、cap sync、可用时 Gradle 构建。
4. 执行 code-review skill，修复高/中问题。
5. 执行 simplify skill，保持行为不变地简化变更代码。
6. 逐条核对设计规格验收场景并更新 README/progress。

验收：所有可执行门槛通过；不可执行的原生门槛有明确证据和未验证声明，不用较窄测试冒充完成。

