# N4 AI 基础设施与 GoalDraft 设计规格

- Status: Draft — awaiting automated spec review
- Date: 2026-08-05
- Scope: Android-first SecretStore、OpenAI-compatible Chat Completions、AiGoalDraft v1、本地调用历史与严格按需网络边界
- Decision authority: 用户明确要求不再询问意见并自动化审查；本规格以已批准的产品章程、N0–N7 路线和最小实现原则自动收敛

## 1. 目标

N4 只在用户主动请求自然语言整理时调用用户自行配置的模型 API。交付后，用户可以输入一段关于长期方向的自然语言，得到经过本地严格校验的可编辑 Goal/Activity 草稿，并在明确确认后一次性写入本地事实。

核心产品在 AI 关闭、未配置、断网、超时、Provider 拒绝、额度不足或返回非法内容时必须完整可用。Roll、计时、结算、奖励、伙伴、历史和手动 Goal 创建都不依赖模型。

N4 同时建立后续 N5 可复用的四条基础边界：

1. 非秘密 Provider 配置进入版本化 AppSettings；
2. API key 和自定义 header 值只进入 SecretStore；
3. 唯一 ProviderAdapter 是产品网络出口；
4. 模型输出只能成为临时草稿，不能直接执行应用命令。

## 2. 明确不做

- 不实现 N5 SettlementDraft、AI Roll 文案、候选重排、工具调用、Agent、流式输出或多轮聊天；
- 不让模型读取全部 Goal、Session、RewardLedger、Companion、导出文件或 AI 历史；
- 不让模型计算奖励、改变 Roll、创建 Session、写数据库、请求系统权限或调用本地工具；
- 不联网搜索课程、考试标准、价格、新闻或其他外部资料；
- 不支持 Responses、Anthropic、Gemini 等独立协议；N4 只支持 OpenAI-compatible Chat Completions；
- 不偷偷放开 HTTP、局域网 endpoint 或 `usesCleartextTraffic`；生产配置只接受 HTTPS；
- 不在 Web 开发壳持久化真实秘密，不增加代理服务器、账户、云同步、分析、遥测或远程资产；
- 不默认保存模型调用历史；历史开关关闭时不创建任何 interaction row。

## 3. 技术方案评估

| 方案 | 成熟度/社区 | 与项目复杂度匹配 | 维护成本 | 学习/供应链成本 | 结论 |
|---|---|---|---|---|---|
| A. 窄 `fetch` adapter + Zod + `@aparajita` SecretStore | Chat Completions/JSON Schema 成熟；插件有 Capacitor 8 tag、MIT、0 security advisories，但社区较小 | 只实现一个非流式 POST 和一个 SecretStore 端口，边界最窄 | 插件升级与两种 structured-output 模式需维护 | 新增 Zod、Secure Storage 及其固定 Capacitor 依赖 | **采用** |
| B. OpenAI Node SDK + 同一 SecretStore | 官方 SDK 成熟 | SDK 覆盖 Responses、流式、工具、文件等 N4 不需要能力，任意兼容 Provider 仍可能有差异 | 上游 API/SDK 升级面更大 | Apache-2.0、unpacked 约 12.5 MB，并有可选 peer | 不采用 |
| C. 自维护 Capacitor Android/iOS 秘密插件 + 窄 adapter | 可完全控制 | Android-first 可以很小，但 N7 必须自行实现和审计 Keychain | 密码学、平台生命周期和主版本升级责任永久留在项目 | 学习曲线和原生测试成本最高 | 仅在候选插件出现不可关闭 High 风险时回退 |

依赖决策：

- 精确锁定 `@aparajita/capacitor-secure-storage@8.0.0`，封装在项目 `SecretStore` 后；产品不直接暴露插件 API；
- 精确锁定 `zod@4.4.3`，只用于运行时白名单 Schema；
- 不添加 `openai`、`ai`、Axios、状态管理框架或网络重试库；
- 安装后更新 `THIRD_PARTY_NOTICES.md`，运行 lockfile audit、许可证扫描、Android dependency/manifest 检查；
- 插件 Android 使用 AndroidKeyStore + AES/GCM/NoPadding，Web 实现却使用明文 localStorage，因此 Web 组合根必须替换为独立 session-memory adapter，禁止调用插件 Web 实现；
- 当前 app-wide `android:allowBackup="false"`、`android:usesCleartextTraffic="false"` 必须在 merged manifest 保持；若插件或未来 manifest merge 改变任一值，CI 失败。

## 4. 模块边界

建议结构：

```text
src/modules/ai/
  types.ts
  goalDraftSchema.ts
  providerConfig.ts
  interactionLog.ts
src/adapters/ai/
  openAiCompatibleProvider.ts
src/adapters/secrets/
  nativeSecretStore.ts
  sessionSecretStore.ts
src/app/
  aiGoalDraftService.ts
src/ui/settings/
  AiProviderSettings.tsx
src/ui/goals/
  AiGoalDraftPanel.tsx
```

职责：

- `modules/ai` 只定义 Provider 配置、错误联合、AiGoalDraft v1、严格 Zod Schema 和脱敏历史记录；不访问网络、平台或 React。
- `ProviderAdapter` 只接收已校验配置、短生命周期凭据、结构化请求与 AbortSignal；它不读取 Store、SecretStore 或 UI 状态。
- `SecretStore` 只保存/读取/删除一份 ProviderCredentials；它不属于 AppSnapshot、SQLite、导出或清库事务。
- `AiGoalDraftService` 检查开关、在调用瞬间读取凭据、调用 Provider、执行 Zod 二次校验、可选记录历史并返回临时草稿。
- `MvpApplication` 暴露窄门面并负责最终原子确认；React 不直接访问 SecretStore、ProviderAdapter、`fetch` 或 SQLite。
- `AiGoalDraftPanel` 只保存自然语言输入、请求状态和已验证草稿；卸载、取消或刷新后临时草稿消失。

## 5. 输入类型命名清理

现有用户表单类型会机械重命名：

- `GoalDraft` → `GoalInput`
- `ActivityDraft` → `ActivityInput`
- `SettlementDraft` → `SettlementInput`

`AiGoalDraft` 只表示已经通过 `AiGoalDraftSchema` 的模型输出；原始 JSON 始终是 `unknown`。禁止通过类型断言把模型响应变成 `AiGoalDraft`。

本次只改 Settlement 的类型名，不接入任何 N5 模型功能。重命名必须行为等价并由现有测试覆盖。

## 6. schema v3 与持久数据

N4 把当前快照升级到 schema v3。v3 新增：

```ts
interface AiProviderSettings {
  protocol: 'openai-chat-completions';
  baseUrl: string;
  model: string;
  requestTimeoutMs: number;
  structuredOutputMode: 'json-schema' | 'json-object';
}

interface AiSettings {
  enabled: boolean;
  goalDraftEnabled: boolean;
  historyEnabled: boolean;
  provider: AiProviderSettings;
}

interface AiInteractionLog {
  id: string;
  requestType: 'goal-draft';
  providerModel: string;
  schemaVersion: 'goal-draft-v1';
  inputSummary: string;
  validatedOutput: AiGoalDraft | null;
  startedAt: number;
  durationMs: number;
  result: 'success' | AiProviderErrorCode;
}
```

规则：

- `inputSummary` 只写 `GoalDraft request (N characters)`，不保存原始输入、截断预览、hash、邮箱、电话或其他内容；已验证输出本身可能含用户目标文本，因此历史默认关闭。
- 关闭 history 只停止新记录，不暗删旧记录；设置页提供单独“清空 AI 历史”。
- 导出 v3 包含现存 interaction logs 和非秘密 Provider 配置；不包含 SecretStore、完整请求/响应 envelope、headers、apiKey、临时输入或草稿。
- 导入支持 v1/v2/v3；v1/v2 纯迁移到 v3。迁移保留旧 `ai.enabled/historyEnabled`，新增 `goalDraftEnabled=false`、空 model、默认 HTTPS base URL、30 秒 timeout 和 `json-schema` 模式，确保升级后不会自动联网。
- 新导出只生成 envelope v3；恢复导出继续按来源版本白名单构造。
- SQLite native version 升级并新增 `ai_interactions(id TEXT PRIMARY KEY, payload TEXT NOT NULL)`；完整快照 replace 在同一事务清空/写入所有 facts、settings、interactions，最后更新 `app_meta.schema_version=3`。
- migration、SQLite DDL、app schema、导入 envelope 三种版本必须继续显式区分；任一步失败不得覆盖旧数据库。

## 7. SecretStore

端口不提供任意 key/value API，只暴露业务所需语义：

```ts
interface ProviderCredentials {
  apiKey: string;
  customHeaders: Record<string, string>;
}

interface SecretStore {
  readProviderCredentials(): Promise<ProviderCredentials | null>;
  writeProviderCredentials(credentials: ProviderCredentials): Promise<void>;
  deleteProviderCredentials(): Promise<void>;
  hasProviderCredentials(): Promise<boolean>;
}
```

校验与生命周期：

- 整份凭据以固定内部 key `ai-provider-credentials-v1` 保存；key 不由 UI 控制。
- apiKey 最长 8,192 字符；最多 16 个 custom headers，名称最长 128、值最长 8,192，总序列化大小不超过 64 KiB。
- header 名必须符合 HTTP token；值禁止 CR/LF。禁止用户覆盖 `content-type`、`content-length`、`host`、`origin`、`cookie`、`connection` 和 `authorization`。
- apiKey 非空时 adapter 自动发送 `Authorization: Bearer …`；需要其他认证方式时，apiKey 可空，但至少有一个自定义认证 header。
- Native adapter 设置项目专用 prefix，关闭 iCloud synchronize，并为未来 iOS 使用 `whenUnlockedThisDeviceOnly`；Android 使用插件默认 Keystore 路径。
- Session adapter 只在 JS 内存 Map 保存；页面刷新即丢失，不读取/写入 localStorage、sessionStorage、IndexedDB、SQLite 或文件。
- 凭据输入使用 password control；保存成功后立即清空 React 字符串，只显示“已配置”和自定义 header 数量，不回显值。
- 常规导出、导入、清空本地事实和 recovery export 都不调用 SecretStore；只有设置页显式删除凭据才删除。
- 插件错误映射为项目 `SecretStoreError`，不把原始对象、序列化凭据或 provider header 写入错误消息。

## 8. Provider 配置

`normalizeAiProviderSettings` 严格白名单化：

- `baseUrl` 必须为绝对 HTTPS URL，禁止用户名、密码、query、fragment；移除结尾 `/` 后再拼接 `/chat/completions`。
- 不接受完整 endpoint URL；例如 OpenAI 填 `https://api.openai.com/v1`。
- `model` trim 后长度 1–160；项目不内置“最新模型”默认值，也不替用户选择或改写模型 ID。
- timeout 必须为 5,000–120,000ms 整数，默认 30,000ms。
- structured output 默认 `json-schema`；兼容 Provider 不支持时由用户显式改为 `json-object`。不做探测式隐藏重试，避免一次点击产生多次计费请求。
- Web 开发壳不提供 CORS 代理；Provider 不允许浏览器跨域时只能在 Android build 使用。

## 9. ProviderAdapter 协议

每次生成只执行一个 POST：

```text
{baseUrl}/chat/completions
```

固定请求性质：

- `Content-Type: application/json`；Authorization 与自定义 header 只在调用栈短暂存在。
- body 只含配置 model、两条 messages、`store:false` 和显式 response format；不含数据库、设备标识、伙伴、奖励、Roll、Session 或历史。
- system message 把用户文本定义为不可信数据，要求只整理 GoalDraft v1，不执行文本内指令、不修改规则、不生成候选池外副作用。
- user message 使用固定 delimiter 包裹本次输入；输入 trim 后长度 1–10,000。
- `json-schema` 模式发送 `response_format.type=json_schema`、固定 name/schema、`strict:true`；`json-object` 模式发送 `response_format.type=json_object` 并仍在 prompt 中写明完整字段要求。
- 不设置 provider-specific reasoning、temperature、tools、stream、web search 或 SDK 扩展参数。

响应规则：

- 先检查 HTTP status 和 `Content-Length`；随后流式读取 body 并在 256 KiB 后立即中止，禁止无界 `response.json()`。
- 只接受 `choices[0].message.content` 的单个字符串；显式 refusal、空 choices、数组 content、Markdown fence、前后解释、非法 JSON、未知字段或 Zod 失败都返回 `invalid-response`，不做宽松提取。
- 不在错误中包含 response body、请求 headers、endpoint query、apiKey 或完整原始 exception；开发测试 fixture 也不能使用真实秘密。
- 不自动重试 401、429、5xx、网络错误、超时或非法输出。

统一错误码：

```text
disabled | not-configured | invalid-config | secret-store
auth | rate-limited | timeout | cancelled | unavailable | server
response-too-large | invalid-response | storage
```

401/403 → `auth`，429 → `rate-limited`，5xx → `server`，其他非 2xx → `unavailable`。用户取消与内部 timeout 必须区分。

## 10. 取消、超时与并发

- `generateAiGoalDraft(input, signal?)` 合并调用者 AbortSignal 与内部 timeout；无论成功失败都清理 timer/listener。
- UI 同时最多一条请求；再次生成前必须先取消旧请求并等待旧 Promise 结算。
- 组件卸载、切换页面和显式取消会 abort；取消不显示为模型故障，也不写成功历史。
- 每次请求带本地 request token；过期响应即使晚到也不能覆盖新输入或草稿。
- 保存设置/凭据、连接测试、生成、确认继续复用应用级 `busy`/single-flight 防双击策略。
- ProviderAdapter 不重用 AbortController，不缓存 response、apiKey 或 header。

## 11. AiGoalDraft v1 Schema

顶层使用 Zod strict object：

```ts
interface AiGoalDraft {
  schemaVersion: 'goal-draft-v1';
  title: string;                         // 1–80
  description: string;                   // 0–2,000
  feedbackModel:
    | { type: 'progress'; baseline: number | null; target: number | null; unit: string | null }
    | { type: 'cumulative'; unit: 'minutes' | 'times' }
    | { type: 'experience' };
  importanceSuggestion: 1 | 2 | 3 | 4 | 5;
  desiredCadenceDays: number | null;     // >0–3,650
  minimumRestHours: number;              // 0–8,760
  defaultEnergyCost: 1 | 2 | 3 | 4 | 5;
  suggestedActivities: AiActivityDraft[];// 1–5
  clarificationNeeded: boolean;
  clarificationQuestions: string[];      // 0–5, each 1–240
}
```

每个 `AiActivityDraft`：title 1–80、description 0–2,000、integer minutes 1–480 且 min<=max、energy 1–5、contexts 最多 10 个且每个 1–40、minimumRestHours nullable 0–8,760、suggestedCadenceDays nullable >0–3,650。

额外规则：

- 所有 object `.strict()`；字符串先限制长度，再由确认映射使用现有本地 normalizer trim/去重。
- progress 的 baseline/target/unit 任一为空时必须 `clarificationNeeded=true`；target 必须大于 baseline。
- `clarificationNeeded=true` 时 questions 至少一项；为 false 时 questions 必须为空。
- Schema 不含 id、status、rewardWeight、XP、score、Session、时间表、网络 URL、命令或任意扩展字段。
- 模型不能建议 rewardWeight；确认映射恒用本地默认 `1`。

## 12. 草稿确认与原子写入

生成成功后，UI 把已验证输出复制成可编辑的 `GoalInput` 与 1–5 个 `ActivityInput`。用户可编辑、删除活动或返回手动表单。

- 原始模型对象不可直接传给 create 用例；映射后必须再次通过 `normalizeGoalInput` 与每个 `normalizeActivityInput`。
- 若 clarificationNeeded，UI 显示问题并保持确认禁用，直到用户修改缺失字段并显式标记“已补充”。本地 validator 仍是最终门槛。
- 新应用用例 `createGoalWithActivities(goal, activities)` 一次生成所有 ID、构造所有实体，并在一次 DataStore.replace 中提交；数组必须 1–5。
- 现有手动创建调用同一用例并传单元素数组；旧 `createGoal` 可删除或成为不导出的窄委托，不能保留两套事务逻辑。
- 取消草稿、关闭页面、请求失败、Schema 失败或确认校验失败时，Goal/Activity/Session/Reward 均零写入，ID generator 也不应在确认前消耗 ID。
- 提交失败时保留已编辑草稿与输入，显示本地存储错误，允许重试；不能出现只有 Goal 没有 Activities 的半提交。

## 13. AI 调用历史

- history 默认关闭；关闭时不分配 interaction ID、不克隆 validated output、不写 SQLite。
- 开启时，success 写已验证原始 AiGoalDraft；失败只写 error code 和元数据，`validatedOutput=null`。
- `cancelled` 不写历史，避免普通导航产生噪声；timeout、auth、rate limit、server、invalid response 可写。
- 历史写入失败不丢弃已经验证的临时草稿：生成结果返回并带非阻塞 `historyWarning`；应用内存快照保持最后一次成功持久状态。
- 历史不是模型上下文，也不参与 Roll、奖励、伙伴或 Goal 确认。
- 设置页显示记录数量并提供显式清空；清空只删除 interactions，不动凭据、Goal 或其他事实。

## 14. 设置与连接测试

Settings 分成非秘密 Provider 配置与秘密凭据两块：

- AI 总开关、GoalDraft 开关、历史开关；
- base URL、model、timeout、structured output mode；
- apiKey password input 和可选自定义 header rows；
- “保存/替换凭据”“删除凭据”“测试连接”。

连接测试是明确的模型请求，会在按钮旁说明可能产生少量费用。它使用同一 Chat Completions endpoint、timeout、大小上限和错误分类，但只要求固定 `{ "ok": true }` Schema，不写 AI history、不写 GoalDraft、不自动保存设置/凭据，也不隐藏重试。

全局 AI 或 GoalDraft 开关关闭、model 为空、配置无效或凭据缺失时，Goal 页面只显示本地手动表单与可理解的配置提示，不发网络请求。

## 15. 网络与 Android 边界

- Android manifest 在 N4 显式增加唯一 `android.permission.INTERNET`；保持无 ACCESS_NETWORK_STATE、广告、追踪或额外网络权限。
- `usesCleartextTraffic=false` 必须保留；baseUrl validator 再次拒绝 HTTP，形成双层门槛。
- `verify-network-boundary.mjs` 改为 allowlist：产品 `fetch` 只能出现在 `src/adapters/ai/openAiCompatibleProvider.ts`，`XMLHttpRequest`、WebSocket、EventSource、sendBeacon 在所有产品文件仍禁止。
- 源码不出现固定远程 font/image/script/analytics URL；允许的默认 `https://api.openai.com/v1` 只能出现在 Provider 默认配置模块和测试/文档白名单。
- CSP 继续禁止远程 script/font/image/object；`connect-src` 需要支持用户 HTTPS Provider 时只能设为 `https:`，不能放宽其他资源类型。production E2E 必须证明无主动请求。
- CI merged manifest 验证 INTERNET 存在恰好一次、cleartext=false、backup=false，并继续验证 APK hash/artifact。

## 16. 错误与降级文案

所有失败都回到同一可编辑输入或已生成草稿，不导航到死路：

| 类别 | 用户结果 |
|---|---|
| disabled / not-configured | 指向本地设置；手动创建保持可见 |
| auth | “凭据无效或无权限”，不显示 provider body |
| rate-limited | “请求过于频繁或额度受限”，不自动重试 |
| timeout / unavailable / server | 保留输入，可手动创建或再次主动重试 |
| cancelled | 安静返回原界面，不显示红色故障 |
| response-too-large / invalid-response | 说明模型结果无法安全解析；零事实写入 |
| secret-store | 保留非秘密配置，不声称凭据已保存 |
| storage | 保留草稿；若只是 history 写失败则降为 warning |

错误显示不得包含 URL query、headers、apiKey、原始 response body、堆栈或未脱敏 Provider message。

## 17. 测试矩阵

### 17.1 纯单元

- Provider config：HTTPS、credentials/query/fragment、path、model、timeout、mode 和输入长度边界；
- credentials：header token、CRLF、禁用名、数量、单值/总大小、空认证；
- AiGoalDraft：所有联合分支、strict unknown keys、1/5 活动边界、文本/数值边界、progress clarification 交叉规则；
- interaction log：默认关闭、无内容 input summary、失败无 output；
- v1→v3、v2→v3、v3 identity、输入不变与未知版本拒绝；
- Goal/Activity/Settlement 类型重命名行为等价。

### 17.2 Provider contract fixtures

注入 fake fetch/ReadableStream，不访问真实网络：

- json-schema 与 json-object 两种准确 request body；
- header 合并且禁用 header 不可覆盖；
- 200 valid、refusal、空 choices、非字符串 content、Markdown、非法 JSON、unknown fields、Zod 失败；
- Content-Length 和 chunked body 超过 256 KiB；
- 401/403/429/4xx/5xx、network failure、timeout、external cancel；
- 单请求、零隐藏重试、timer/listener cleanup、原始错误和秘密不出现在返回值。

### 17.3 SecretStore contract

- Memory adapter 同一会话读写删、刷新实例为空；
- Native wrapper 只使用固定 key/prefix、iCloud sync=false、ThisDeviceOnly；
- Web composition 从不 import/调用插件 Web storage；
- 导出、清库、恢复导出和 interaction history 从不调用 SecretStore read；
- 保存失败不改变“已配置”状态，删除幂等。

### 17.4 存储与应用层

- SQLite v2→v3 DDL、半迁移拒绝、事务每步失败回滚、meta 最后写；
- v1/v2/v3 import/export whitelist、日志 counts、secret marker 全仓扫描；
- disabled/unconfigured 时 provider 调用次数为 0；
- invalid model output、取消、草稿取消均 Goal/Activity 零写入且 ID 不消耗；
- 1–5 Activities 确认一次原子提交，失败无半提交；
- history on/off、failure log、history storage warning、clear history。

### 17.5 浏览器与 production

- 手动 Goal 创建回归；AI 未配置/关闭时零请求；
- route fixture 下生成→编辑→确认，多 Activity 一次落库；
- clarification、取消、timeout、401、429、非法/超长响应均保留输入并可切手动；
- 保存 Web session 凭据后 localStorage/导出/DOM/截图无 secret marker，刷新后凭据状态消失；
- production 初始加载与全部离线核心流程零请求；只有点击生成/连接测试时恰好一个允许的 Provider 请求；
- 320×640、键盘、焦点、错误 live region、取消按钮和触控区域可用。

### 17.6 Android/CI

- TypeScript、Vitest、dev/production Playwright、audit、license、network scan、secret scan、build/cap sync；
- Gradle assembleDebug、merged manifest、APK hash、artifact 与 PR exact-head CI；
- 真实 Android：Keystore 保存/替换/删除、强杀恢复、卸载重装、无网、TLS、系统备份语义、输入法与小屏。设备不可用时必须标记 `native SecretStore evidence pending`，不能由 fake adapter/CI APK 冒充，但不阻塞 N5 确定性设计。

## 18. 完成标准

N4 确定性实现完成必须同时满足：

1. 默认 AI/GoalDraft/history 均关闭；离线核心和手动 Goal 创建不回归；
2. 只有用户主动点击生成或连接测试才可能发出一个 HTTPS 请求；
3. SecretStore、ProviderAdapter、Zod Schema、schema v3 migration/SQLite/import/export 均有契约测试；
4. 非法、恶意、超长、拒绝、超时、取消和 HTTP 错误均零正式事实写入；
5. 已验证草稿可编辑，1–5 Activities 只在确认后一次原子提交；
6. apiKey/custom header 值不出现在 SQLite、localStorage、导出、历史、日志、DOM、截图、错误或 Git；
7. 产品网络 API 只存在于唯一 Provider adapter，manifest 只有必要 INTERNET 且继续禁止 cleartext/backup；
8. code-review/simplify 无未关闭 High/Medium，完整本地门槛和 exact-head Android CI 全绿；
9. 若无真实设备，明确保留 `native SecretStore evidence pending` 并进入 N5，不在 N7 最终审计中遗漏。

## 19. 外部依据

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)：Chat Completions `json_schema`/strict、JSON mode 差异与 refusal 处理（核验于 2026-08-05）。
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)：不可导出密钥和授权边界（核验于 2026-08-05）。
- [Android EncryptedSharedPreferences reference](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)：deprecated 状态和加密 preferences 不应备份警告（核验于 2026-08-05）。
- [`@aparajita/capacitor-secure-storage` npm](https://www.npmjs.com/package/@aparajita/capacitor-secure-storage)：8.0.0、MIT、Capacitor 8、Android AES-GCM/Keystore 与 Web localStorage 退化说明（核验于 2026-08-05）。
- [`@aparajita/capacitor-secure-storage` source](https://github.com/aparajita/capacitor-secure-storage/tree/v8.0.0)：Android、Web、错误联合和 iOS Keychain access 实现审计基线。
