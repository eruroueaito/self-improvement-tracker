# Pixel-first 开发与最终真机验收重排设计

- Status: Approved — third/final independent review found no High or Medium issues; awaiting user review
- Date: 2026-08-11
- Scope: N0–N6 Android-only 路线、Pixel 3 XL 开发性冒烟、N6 最终真机验收、伙伴占位表现
- Decision authority: 用户明确要求优先使用现有 Google Pixel 3 XL 开发，并把必须依赖真机环境的正式验收统一放到最后阶段

## 1. 目标

在不牺牲真实设备反馈的前提下，解除 API 33+ 设备和云真机对 N4/N5 确定性开发的阶段阻塞：

- Pixel 3 XL / Android 12 / API 31 是默认开发设备；
- 每个阶段继续尽早发现真实 WebView、SQLite、Keystore、文件和生命周期问题；
- 任何“正式真机验收”都不再作为 N0–N5 的完成门槛；
- N6 绑定同一 exact-head release candidate，集中完成 Pixel/API31 与 API33+ 双层设备验收；
- 伙伴模块保留全部逻辑，只渲染中性占位符，不渲染实际像素美术或装饰动画。

项目保持 Android-only，最终里程碑仍是 N6；已取消的 N7/iOS 路线不恢复。

## 2. 方案比较

| 方案 | 开发反馈 | 阶段阻塞 | 最终证据风险 | 结论 |
|---|---|---|---|---|
| A. Pixel 逐阶段开发冒烟，正式验收集中 N6 | 能尽早发现原生问题 | 设备不可用不阻塞确定性实现 | N6 仍需完整双层矩阵 | **采用** |
| B. N4/N5 完全不碰真机，全部推迟 N6 | 反馈最晚 | 阶段最顺畅 | 原生集成返工集中爆发 | 不采用 |
| C. 保留每阶段 native hard gate | 反馈最早 | API 33+ 条件持续阻塞 | 最终风险较低但当前不可执行 | 不采用 |

方案 A 同时满足“优先用现有真机开发”和“正式真机环境验收统一最后”。

## 3. 三层证据模型

### 3.1 阶段确定性门槛（N0–N5 必须）

每阶段只有以下证据全部通过才可标记确定性实现完成：

- TypeScript、Vitest、集成测试与相关固定 fixture；
- dev/production Playwright；
- production build 与 `cap sync android`；
- Gradle debug 构建、manifest、依赖、许可证、网络和秘密扫描；
- code-review、simplify 与远端 exact-head Android CI；
- 数据版本变化时的迁移、失败回滚、导入导出与自产往返不变量。

这些门槛不依赖本机虚拟化或外部云账户。

### 3.2 Pixel 开发性冒烟（N0–N5 每阶段执行，非阶段完成门槛）

Pixel 在线时，每个原子工作包构建后优先执行相关窄冒烟：

- 安装/升级当前 debug APK，并核对本地与设备 APK 哈希；
- 只测试本工作包触及的 SQLite、WebView、Keystore、文件、生命周期、输入法或小屏行为；
- 不清除既有测试数据，除非该测试明确验证首次安装或卸载语义；
- 记录设备/API、commit、APK hash、观察结果和 evidence kind；
- Pixel 发现的产品缺陷必须回到当前工作包修复，不能以“非正式验收”为由延后；任何崩溃、数据损坏、安全或原生集成异常即使暂时间歇发生，也必须先归因，不能用“不可复现”豁免；
- 仅设备离线、USB/ADB 临时异常或 API 31 不具备目标平台行为时，记录 `development smoke unavailable/not-applicable`，不阻断确定性阶段。

Pixel 冒烟不能勾选 N6 的正式验收项，也不能证明 Android 13 `POST_NOTIFICATIONS`。

runner 必须在实施阶段改为两个显式互斥模式，消除现有“API 33+ 且 INTERNET denied”旧 N0 契约与 Pixel/N4 的冲突：

- `Development`：接受项目 `minSdk` 以上设备；`N0`–`N3.1` 固定 `OfflineCore`，`N4`–`N5` 固定 `ProviderOnly`。前者断言无 `INTERNET`，后者允许 manifest 声明 `INTERNET`，但要求确定性网络扫描和唯一 Provider 出口；
- `Final`：必须给出冻结 `RcManifest` 与 `CaseId`，拒绝 debug APK；`P31-*` 允许/要求 Pixel API31，`A33-*` 强制 API33+，API 下限由 case family 决定；
- 现有 `scripts/run-android-smoke.ps1` 在完成该改造前仍只是 legacy N0/API33 offline runner，不得用于声称 Pixel/N4 开发证据；
- fake ADB 只验证 runner 编排，永久写为 `test-double-not-native`。

### 3.3 N6 正式设备验收（最终硬门槛）

N6 对同一不可变 exact-head RC 依次执行：

1. **Pixel 3 XL / API 31 全量矩阵**
   - 安装/升级、冷启动、强杀、重启、离线；
   - SQLite v1→v2→v3、失败恢复、导入导出；
   - Android Keystore 保存、替换、endpoint 换绑、删除、卸载重装；
   - Goal→Roll→Session→Settlement→Reward→撤销闭环；
   - 文件分享、系统输入法、小屏、减少动态与伙伴占位可访问文本；
   - AI 关闭/未配置零请求，用户主动调用时只有允许的 Provider 出口。

2. **API 33+ 物理或 Android Device Streaming 全量矩阵**
   - 重跑 Pixel 矩阵中与平台无关的关键闭环；
   - 通知允许、拒绝、再次进入设置、后台/锁屏、提前结束取消；
   - Doze/无精确闹钟权限只影响提醒及时性，不改变 Session 事实；
   - API 33+ WebView、触控、键盘、小屏和可访问性人工检查。

3. **RC 绑定与完成审计**
   - 冻结唯一 `rc_id`，同时记录 commit、release variant、versionCode/versionName、release-signed APK SHA-256、签名证书 SHA-256 和不可变构建来源；debug APK 不构成正式验收产物；
   - 两层设备记录必须引用同一 `rc_id` 和同一份字节级完全相同的 APK；
   - 任何产品代码、依赖、构建配置、版本、签名或产物哈希变化都会使 Pixel/API31 与 API33+ 两层正式矩阵全部失效并全部重跑；只有重新取得 SHA-256 与签名摘要均完全相同的既有不可变产物时才可沿用证据；
   - High/Medium 审查问题全部关闭，且以下封闭 case ID 全部为 `PASS` 后，N6 才可完成。

正式记录采用封闭字段：

```text
evidence_kind: development-smoke | final-native-acceptance | test-double-not-native
case_id: stable identifier
work_package: N0 | N1 | N2 | N3 | N3.1 | N4 | N5 | N6
device: model/serial alias
api: integer
rc_id: required for final-native-acceptance
commit: full SHA
release_variant: required for final-native-acceptance
version_code: required for final-native-acceptance
version_name: required for final-native-acceptance
artifact_sha256: exact APK hash
signing_cert_sha256: required for final-native-acceptance
build_source: immutable CI run/artifact locator; required for final-native-acceptance
result: PASS | FAIL | BLOCKED | UNRUN | PENDING | N/A
timestamp: ISO-8601 UTC
```

N6 必须先生成冻结的 `rc-manifest.json`，其中至少包含 `rc_id`、full commit、`release_variant`、`version_code`、`version_name`、`artifact_sha256`、`signing_cert_sha256` 和不可变 `build_source`。每条正式记录既引用该 manifest，也复制这些身份字段供独立审计。`final-native-acceptance` 只允许 release-signed RC；历史 debug、development smoke 和 test double 记录不得继承为 N6 通过证据。

### 3.4 N6 封闭 case ID

| 通道 | Case ID | 必跑行为 |
|---|---|---|
| Pixel/API31 | `P31-INSTALL-UPGRADE` | release RC 安装、覆盖升级、冷启动 |
| Pixel/API31 | `P31-LIFECYCLE` | 后台、强杀、重启、离线恢复 |
| Pixel/API31 | `P31-MIGRATION` | SQLite v1→v2→v3、失败恢复、导入导出 |
| Pixel/API31 | `P31-SECRETSTORE` | Keystore 保存、替换、换绑、删除、卸载重装 |
| Pixel/API31 | `P31-CORE-LOOP` | Goal→Roll→Session→Settlement→Reward→撤销 |
| Pixel/API31 | `P31-FILES` | 系统分享、导入、秘密排除 |
| Pixel/API31 | `P31-ACCESSIBILITY` | 小屏、输入法、减少动态、伙伴占位语义 |
| Pixel/API31 | `P31-NETWORK` | AI 零请求默认值与唯一 Provider 出口 |
| API33+ | `A33-INSTALL-LIFECYCLE` | 同一 RC 安装、启动、强杀、重启 |
| API33+ | `A33-CORE-LOOP` | 同一关键离线闭环与持久化 |
| API33+ | `A33-NOTIF-ALLOW` | 允许通知、后台/锁屏到期可见 |
| API33+ | `A33-NOTIF-DENY` | 拒绝通知无崩溃且事实恢复正确 |
| API33+ | `A33-NOTIF-CANCEL` | 提前结束后取消通知 |
| API33+ | `A33-DOZE` | 延迟只影响提醒，不改变 Session 事实 |
| API33+ | `A33-WEBVIEW-A11Y` | WebView、触控、键盘、小屏、可访问性 |

所有 case 必须为 `PASS`。`FAIL`、`BLOCKED`、`UNRUN`、`PENDING` 都阻塞 N6。`N/A` 只允许有明确 Android API 能力依据的 API31 项，并且规格必须指出承接它的 API33+ case；表内已列 Pixel 必跑项默认均不可 N/A。任何已观察到的崩溃、数据损坏、安全或原生集成异常，无论是否稳定复现，在完成归因、修复和对应矩阵重跑前都阻塞 N6。

## 4. 路线重排

### N0–N3

- 现有确定性实现和 CI 结论保持；
- 原先分散在 N0–N3 的正式 native evidence pending 全部迁入 N6 验收矩阵；
- 历史 Pixel/API31 部分证据保留为开发反馈，不作为最终 RC 证据。

### N3.1 伙伴占位表现

在 N4 产品代码前先完成一个窄工作包：

- 保留 `ActivityStateEngine`、stage、mood、celebration deadline、unlock projection、公平性与 reduced-motion 逻辑；
- `CompanionAvatar` 继续输出语义化容器、阶段/mood 文本、`aria` 与稳定 test hooks；
- 删除实际像素身体、眼睛、手臂、叶冠、星光、房间物品等装饰节点和相关动画；
- UI 显示中性“伙伴占位”块，不暗示最终美术风格；
- 把视觉矩阵测试改为验证逻辑状态、占位文本、可访问性与无装饰动画，不删除领域/selector 公平性测试。

### N4

- 先完成逐文件实施计划，再按 schema v3 → mutation queue → SecretStore/Provider → GoalDraft UI → hardening 顺序实现；
- Pixel 用于 Android Keystore、WebView 网络、强杀和小屏开发性冒烟；
- native SecretStore 不再是 N4 完成或开始 N5 的硬门槛，正式证据迁入 N6；
- fake adapter/CI 仍不能被描述为真机证据。

### N5

- 确定性实现、自动化和 CI 仍是阶段硬门槛；
- Pixel 用于语音输入法说明、草稿确认、后台恢复和小屏开发性冒烟；
- 正式设备验收迁入 N6。

### N6

按“确定性发布硬化 → Pixel/API31 正式矩阵 → API33+ 正式矩阵 → exact-head 完成审计”顺序执行。API 33+ 设备只在最后矩阵需要，不再阻塞 N4/N5 开发。

## 5. 错误与阻塞规则

- 自动化、构建、CI、安全门槛或 Pixel 观察到的产品缺陷失败：阻塞当前工作包，先完成归因和修复再推进；
- Pixel 临时离线、ADB 授权丢失或 USB 故障：记录并继续确定性工作，设备恢复后补开发冒烟；
- API 31 不支持目标平台行为：标记 not-applicable，转入 N6 API33+ 矩阵；
- N6 无 API 33+ 设备：只能阻塞最终发布验收，不能回溯否定 N4/N5 已完成的确定性实现；
- 任何产品代码、依赖、构建配置、版本、签名或产物哈希变化：使两层正式设备矩阵全部失效；只有字节与签名摘要完全相同的既有不可变 RC 可沿用证据。

## 6. 文档与证据归属

- `task_plan.md`：只记录阶段状态和当前工作包；
- `docs/testing/android-smoke.md`：维护开发性 Pixel 冒烟与 N6 正式矩阵的明确标签；
- `output/android-smoke/`：保存被 Git 忽略的设备证据；
- `progress.md`：记录实际执行结果，不把计划写成已完成；
- `findings.md`：记录设备/API 能力边界和新发现；
- 持久记忆：保存 Pixel-first 与 final-native-acceptance 决策，不保存一次性日志。

## 7. 完成标准

本次路线重排只有在以下条件成立后完成：

1. 路线图、N4 规格、Android smoke 和 `task_plan.md` 使用同一三层证据定义；
2. N0–N5 不再含正式真机硬门槛；
3. N6 列出 Pixel/API31、API33+ 和 exact-head RC 三段最终验收；
4. 伙伴占位工作包保留逻辑/可访问性并明确删除实际美术；
5. 所有本地 Markdown 链接和术语检查通过；
6. 独立规格审查无未关闭 High/Medium。
