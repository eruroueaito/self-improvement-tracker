# N4 AI 基础设施与 GoalDraft 设计规格

- Status: Draft — three automated review rounds completed; final reported issues resolved; awaiting user approval because review cap was reached
- Date: 2026-08-05
- Revised: 2026-08-11
- Scope: Android-first SecretStore、OpenAI-compatible Chat Completions、AiGoalDraft v1、本地调用历史与严格按需网络边界
- Decision authority: 用户明确要求不再询问意见并自动化审查；本规格以已批准的产品章程、N0–N6 Android-only 路线和最小实现原则自动收敛

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
| C. 自维护 Capacitor Android 秘密插件 + 窄 adapter | 可完全控制 | Android-only 实现面较小 | 密码学、Android 生命周期和主版本升级责任永久留在项目 | 学习曲线和原生测试成本最高 | 仅在候选插件出现不可关闭 High 风险时回退 |

依赖决策：

- 精确锁定 `@aparajita/capacitor-secure-storage@8.0.0`，封装在项目 `SecretStore` 后；产品不直接暴露插件 API；
- 精确锁定 `zod@4.4.3`，只用于运行时白名单 Schema；
- 不添加 `openai`、`ai`、Axios、状态管理框架或网络重试库；
- 安装后更新 `THIRD_PARTY_NOTICES.md`，运行 lockfile audit、许可证扫描、Android dependency/manifest 检查；
- 插件把 `@capacitor/app`、`@capacitor/keyboard`、`@capacitor/android`、`@capacitor/ios`、`@capacitor/core` 声明为运行依赖而非 peers；安装验收必须核对 lockfile 去重、Capacitor minor 统一、`cap sync android` 实际注册插件列表、传递许可证和产物体积，且不得创建或同步 iOS 工程；
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
- `ProviderAdapter` 只接收已校验配置、与该配置 endpoint 精确绑定的短生命周期凭据、闭合任务联合与 AbortSignal；它不读取 Store、SecretStore、UI 状态，也不接受任意 URL/messages/schema。
- `SecretStore` 只保存/读取/删除一份 ProviderCredentials；它不属于 AppSnapshot、SQLite、导出或清库事务。
- `AiGoalDraftService` 检查开关、在调用瞬间读取并校验 endpoint-bound 凭据、调用 Provider、执行 Zod 二次校验，只返回临时草稿与可选 interaction candidate；它绝不直接写 DataStore。
- `MvpApplication` 暴露窄门面并负责最终原子确认与 history candidate 提交；React 不直接访问 SecretStore、ProviderAdapter、`fetch` 或 SQLite。
- `MvpApplication` 新增应用层串行 mutation queue；所有改变快照的命令都必须在队列内从最新快照构造 next 再原子 replace。网络等待不持有队列，响应后追加 history 时重新读取最新快照，避免覆盖请求期间新增的 Goal/Session/设置。
- mutation queue 的每个任务向自己的调用者传播成功/失败，但内部 tail 必须把前一任务拒绝归一为已结算后再启动下一任务，禁止一次 `replace` 失败永久毒化队列；只有 replace 成功才更新内存 snapshot。
- `AiGoalDraftPanel` 只保存自然语言输入、请求状态、已验证模型结果与 `EditableAiGoalDraftForm`；卸载、取消或刷新后临时状态消失。

稳定端口不是通用网络客户端：

```ts
type ProviderTask =
  | { type: 'goal-draft'; input: string }
  | { type: 'connection-test' };

interface ProviderAdapter {
  completeStructured(input: {
    settings: NormalizedAiProviderSettings;
    credentials: EndpointBoundProviderCredentials;
    task: ProviderTask;
    signal: AbortSignal;
  }): Promise<unknown>;
}
```

adapter 根据闭合 task union 内建受控 messages 与由同一 Zod Schema 生成的 JSON Schema；N5 只能显式扩展 task union，不能绕过为任意 endpoint/messages/headers 出口。

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
  result: AiInteractionResult;
}

type AiInteractionResult =
  | 'success'
  | 'auth'
  | 'rate-limited'
  | 'timeout'
  | 'unavailable'
  | 'server'
  | 'response-too-large'
  | 'invalid-response';

interface CurrentAppSnapshotV3 extends SnapshotFacts {
  schemaVersion: 3;
  settings: AppSettingsV3;
  aiInteractions: AiInteractionLog[];
}
```

规则：

- `inputSummary` 只写 `GoalDraft request (N characters)`，不保存原始输入、截断预览、hash、邮箱、电话或其他内容；已验证输出本身可能含用户目标文本，因此历史默认关闭。
- 关闭 history 只停止新记录，不暗删旧记录；设置页提供单独“清空 AI 历史”。
- 普通导出默认令 `aiHistoryIncluded=false` 并输出空 `aiInteractions`；只有用户在本次导出显式勾选、看到记录数和“可能包含目标原文”的提示后才输出已校验 interactions，并令 envelope `aiHistoryIncluded=true`。recovery export 永远排除 AI history。
- v3 envelope exact keys 为 `format/version/exportedAt/aiHistoryIncluded/data`；v3 `data` exact keys 为 `goals/activities/recommendationRuns/sessions/rewardEntries/companionProjection/settings/aiInteractions`。当 `aiHistoryIncluded=false` 时 interactions 必须为空，否则拒绝。
- 导入支持 v1/v2/v3；v1/v2 依次执行纯 `v1→v2→v3` 迁移。迁移保留旧 `ai.enabled/historyEnabled`，新增 `goalDraftEnabled=false`、空 model、默认 HTTPS base URL、30 秒 timeout、`json-schema` 模式与空 `aiInteractions`，确保升级后不会自动联网。
- snapshot exact keys：v1 是 `schemaVersion` + 六组 SnapshotFacts；v2 在 v1 上增加 `settings`；v3 在 v2 上增加 `aiInteractions`。`PersistedSnapshot` 是 V1/V2/V3 联合，`CurrentAppSnapshot` 只允许 V3。
- 新导出只生成 envelope v3；恢复导出继续按来源版本白名单构造并明确丢弃 interactions。
- 固定 `SQLITE_NATIVE_VERSION=3`、`APP_SCHEMA_VERSION=3`，DDL v3 新增 `ai_interactions(id TEXT PRIMARY KEY, payload TEXT NOT NULL)`；完整快照 replace 在同一事务清空/写入所有 facts、settings、interactions，最后更新 `app_meta.schema_version=3`。
- 预升级允许并精确测试 `(native, app)`：`(0,1)` legacy v1、`(2,1)` v2 retry-from-v1、`(2,2)` current v2、`(3,1)` v3 retry-from-v1、`(3,2)` v3 retry-from-v2、`(3,3)` current v3；其他组合、未来版本、缺表或错列一律拒绝。native 0/2 经顺序 DDL 到 3 后，应用层仍从原 app schema 纯迁移并通过 meta-last replace 完成；失败允许在上述 retry 状态安全重试。
- migration、SQLite DDL、app schema、导入 envelope 三种版本必须继续显式区分；任一步失败不得覆盖旧数据库。
- `CurrentAppSnapshot` 的 canonical JSON UTF-8 最大 16 MiB；所有本地 mutation、迁移和导入在 replace 前执行同一预算校验，超限则保持旧快照并返回 storage/import 错误。export envelope 最大 20 MiB，导入也允许最多 20 MiB；export 在返回成功前验证自产 envelope 未超限，形成“任何成功生成的当前版本 export 都可被当前版本 import”的往返不变量。
- AI history 最多 50 条且序列化后最多 1 MiB。追加第 51 条或超出 1 MiB 时按 `startedAt`、再按 `id` 确定性移除最旧记录；单条异常超限不写 history，并以非阻塞 warning 返回。所有 interaction 字段逐项 strict 校验，`id` 在整个数组内唯一，`result` 只接受闭合 `AiInteractionResult`。

## 7. SecretStore

端口不提供任意 key/value API，只暴露业务所需语义：

```ts
interface ProviderCredentials {
  apiKey: string;
  customHeaders: Record<string, string>;
}

interface ProviderBinding {
  protocol: 'openai-chat-completions';
  baseUrl: string; // normalizeAiProviderSettings 生成的精确规范值
}

interface EndpointBoundProviderCredentials extends ProviderCredentials {
  binding: ProviderBinding;
}

interface SecretStore {
  readProviderCredentials(expected: ProviderBinding): Promise<EndpointBoundProviderCredentials | null>;
  writeProviderCredentials(binding: ProviderBinding, credentials: ProviderCredentials): Promise<void>;
  deleteProviderCredentials(): Promise<void>;
  hasProviderCredentials(expected: ProviderBinding): Promise<boolean>;
}
```

校验与生命周期：

- 整份凭据连同规范化 `protocol/baseUrl` 绑定，以固定内部 key `ai-provider-credentials-v1` 保存；key 不由 UI 控制。读取时绑定必须与当前配置完全相等，否则返回未配置且绝不把旧凭据交给 adapter；adapter 也必须再次比较 credentials.binding 与 settings 后才能构造 header。导入或编辑 base URL 只改变非秘密设置，不迁移凭据；用户必须为新 endpoint 显式重新保存凭据。
- apiKey 最长 8,192 字符；最多 16 个 custom headers，名称最长 128、值最长 8,192，总序列化大小不超过 64 KiB。
- header 名必须符合 HTTP token；先做 ASCII lowercase，再检查禁用名/前缀并只持久化规范化小写键；大小写不敏感的重复名一律拒绝。值禁止 CR/LF。禁止用户覆盖 `content-type`、`content-length`、`host`、`origin`、`cookie`、`connection`、`authorization`、`referer`、`user-agent`、`accept-encoding`、`te`、`trailer`、`upgrade`、`via`，以及 `proxy-*`、`sec-*`。
- apiKey 非空时 adapter 自动发送 `Authorization: Bearer …`；需要其他认证方式时，apiKey 可空，但至少有一个自定义认证 header。
- Native adapter 用一个共享 initialization Promise 串行完成项目专用 prefix；所有 read/write/delete/has 必须等待初始化成功。Android 使用插件默认 Keystore 路径。
- Session adapter 只在 JS 内存 Map 保存；页面刷新即丢失，不读取/写入 localStorage、sessionStorage、IndexedDB、SQLite 或文件。
- 凭据输入使用 password control；用户输入期间秘密仅存在于受控输入值，不能进入 HTML 属性、可访问名称/描述、页面文本、持久化、日志或截图基线。保存成功、离开页面或取消后立即清空 React 字符串，只显示与当前 endpoint 匹配的“已配置”和自定义 header 数量，不回显值。
- 常规导出、导入、清空本地事实和 recovery export 都不调用 SecretStore；只有设置页显式删除凭据才删除。
- 持久值必须先视为 `unknown`，经 strict schema 校验大小、精确字段、header 规范化和 binding 后才能返回；结构损坏、未知字段或 binding 不匹配均不得暴露凭据。`hasProviderCredentials` 必须复用同一 read/validate 路径，不能只检查 key 是否存在。
- 插件错误映射为项目 `SecretStoreError`，不把原始对象、序列化凭据或 provider header 写入错误消息。

## 8. Provider 配置

`normalizeAiProviderSettings` 严格白名单化：

- `baseUrl` 必须为绝对 HTTPS URL，禁止用户名、密码、query、fragment；移除结尾 `/` 后再拼接 `/chat/completions`。
- 不接受完整 endpoint URL；例如 OpenAI 填 `https://api.openai.com/v1`。
- `model` trim 后长度 1–160；项目不内置“最新模型”默认值，也不替用户选择或改写模型 ID。
- timeout 必须为 5,000–120,000ms 整数，默认 30,000ms。
- structured output 默认 `json-schema`；兼容 Provider 不支持时由用户显式改为 `json-object`。不做探测式隐藏重试，避免一次点击产生多次计费请求。
- Web 开发壳不提供 CORS 代理；Provider 不允许浏览器跨域时只能在 Android build 使用。
- 导入预览必须显示将采用的 endpoint host、model，以及“旧凭据不会迁移到新 endpoint”；确认导入后，若绑定不匹配，状态立即变为未配置。

## 9. ProviderAdapter 协议

每次生成只执行一个 POST：

```text
{baseUrl}/chat/completions
```

固定请求性质：

- `Content-Type: application/json`；Authorization 与自定义 header 只在调用栈短暂存在。
- 调用固定使用 `redirect:'error'`、`credentials:'omit'`、`referrerPolicy:'no-referrer'`、`cache:'no-store'`；Web 使用 `mode:'cors'`。任何 3xx 或 redirect 异常都映射为不含目标地址的 `unavailable`，不得跟随跳转或发出第二个模型请求。
- body 只含配置 model、两条 messages、`store:false` 和显式 response format；不含数据库、设备标识、伙伴、奖励、Roll、Session 或历史。
- system message 把用户文本定义为不可信数据，要求只整理 GoalDraft v1，不执行文本内指令、不修改规则、不生成候选池外副作用。
- user message 使用固定 delimiter 包裹本次输入；输入 trim 后长度 1–10,000。
- `json-schema` 模式发送 `response_format.type=json_schema`、固定 name/schema、`strict:true`；该 JSON Schema 必须由本地解析使用的同一个 Zod schema 通过 Zod 内置转换生成，并用 canonical snapshot fixture 锁定，禁止维护第二份手写 schema。所有字段都 required，可空值用 nullable union 表示，所有对象 `additionalProperties:false`。`json-object` 模式发送 `response_format.type=json_object` 并仍在 prompt 中写明完整字段要求，响应仍由同一个 Zod schema 本地解析。
- 不设置 provider-specific reasoning、temperature、tools、stream、web search 或 SDK 扩展参数。

响应规则：

- 先检查 HTTP status 和 `Content-Length`；随后流式读取 body 并在 256 KiB 后立即中止，禁止无界 `response.json()`。
- 只接受 `finish_reason === 'stop'` 且 `choices[0].message.content` 为单个字符串；`length` 或其他 finish reason、显式 refusal、空 choices、数组 content、Markdown fence、前后解释、非法 JSON、未知字段或 Zod 失败都返回 `invalid-response`，不做宽松提取。
- 不在错误中包含 response body、请求 headers、endpoint query、apiKey 或完整原始 exception；开发测试 fixture 也不能使用真实秘密。
- 不自动重试 401、429、5xx、网络错误、超时或非法输出。

统一错误码：

```text
disabled | not-configured | invalid-config | secret-store
auth | rate-limited | timeout | cancelled | unavailable | server
response-too-large | invalid-response | storage
```

401/403 → `auth`，429 → `rate-limited`，5xx → `server`，3xx 与其他非 2xx → `unavailable`。用户取消与内部 timeout 必须区分。

“单请求”不等于浏览器线上只有一个 HTTP 往返：产品代码每次动作只调用一次 adapter、adapter 只执行一次 `fetch`、只发出一个模型 POST 且零重试；浏览器为 CORS 自动发出的 OPTIONS preflight 可以存在，但不得含用户正文或认证 header 值。

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
interface AiActivityDraft {
  title: string;                         // 1–80
  description: string;                   // 0–2,000
  minimumMinutes: number;                // integer 1–480
  maximumMinutes: number;                // integer 1–480, >= minimumMinutes
  energyCost: 1 | 2 | 3 | 4 | 5;
  contexts: string[];                    // 0–10, each 1–40
  minimumRestHours: number | null;       // 0–8,760
  suggestedCadenceDays: number | null;   // >0–3,650
}

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

`AiGoalDraftSchema` 是 Provider JSON Schema、响应本地解析和历史记录校验的唯一事实来源。`AiActivityDraft` 仅允许上面列出的 exact keys，且与所有嵌套 object 一样 strict。`progress` 分支必须同时满足现有本地域约束：`baseline/target` 若非空则在 0–1,000,000 内；仅当二者均非空时校验 `target > baseline`；`unit` 若非空则 trim 后长度 1–24。不得让 AI schema 接受本地 `GoalInput` 必然拒绝的数值。

额外规则：

- 所有 object `.strict()`；字符串先限制长度，再由确认映射使用现有本地 normalizer trim/去重。
- progress 的 baseline/target/unit 任一为空时，跳过涉及空值的数值比较并强制 `clarificationNeeded=true`；仅当 baseline 与 target 均非空时才要求 target 大于 baseline。
- `clarificationNeeded=true` 时 questions 至少一项；为 false 时 questions 必须为空。
- Schema 不含 id、status、rewardWeight、XP、score、Session、时间表、网络 URL、命令或任意扩展字段。
- 模型不能建议 rewardWeight；确认映射恒用本地默认 `1`。

## 12. 草稿确认与原子写入

生成成功后，UI 把已验证输出复制成独立的 `EditableAiGoalDraftForm`，其中 progress 的 baseline/target/unit 仍可为空，另含 UI-only 的 `clarificationResolved` 状态；它不是 `GoalInput`，也不得通过类型断言伪装成 `GoalInput`。用户可编辑、删除活动或返回手动表单。

- 原始模型对象不可直接传给 create 用例；只有在确认动作中，所有缺失 progress 字段已补全且本地范围有效后，才映射为 `GoalInput`/`ActivityInput`，并再次通过 `normalizeGoalInput` 与每个 `normalizeActivityInput`。不可把 nullable AI 字段直接复制进非 nullable 本地输入。
- 若 clarificationNeeded，UI 显示问题并保持确认禁用，直到用户修改缺失字段并显式标记“已补充”。本地 validator 仍是最终门槛。
- 新应用用例 `createGoalWithActivities(goal, activities)` 一次生成所有 ID、构造所有实体，并在一次 DataStore.replace 中提交；数组必须 1–5。
- 现有手动创建调用同一用例并传单元素数组；旧 `createGoal` 可删除或成为不导出的窄委托，不能保留两套事务逻辑。
- 取消草稿、关闭页面、请求失败、Schema 失败或确认校验失败时，Goal/Activity/Session/Reward 均零写入，ID generator 也不应在确认前消耗 ID。
- 提交失败时保留已编辑草稿与输入，显示本地存储错误，允许重试；不能出现只有 Goal 没有 Activities 的半提交。

## 13. AI 调用历史

- history 默认关闭；关闭时不分配 interaction ID、不克隆 validated output、不写 SQLite。
- `AiGoalDraftService` 只返回可选 interaction candidate，绝不读写 `DataStore`。`MvpApplication` 在网络 Promise 完成后，把 candidate 放入应用级 mutation queue，并从当时最新快照追加/裁剪历史后执行一次原子 replace；网络等待期间不占用队列。Goal、Session、设置或其他并发变更不得被旧请求快照覆盖。
- `MvpApplication` 维护仅当前进程有效、单调递增的 `historyGeneration`。请求开始时捕获 generation；用户发起清空历史或 `historyEnabled: true→false` 命令时，在入 mutation queue 前同步递增 generation，再排队提交快照。即使清空/关闭的持久化随后失败，在途旧请求也按隐私优先原则丢弃 candidate；新请求捕获新 generation。candidate 提交时必须同时满足最新快照 `historyEnabled=true` 且 generation 未改变，否则静默丢弃。关闭后再开启不会恢复旧 generation，因此清空/关闭意图永远胜过在途请求。
- 开启时，success 写已验证原始 AiGoalDraft；失败只写 error code 和元数据，`validatedOutput=null`。
- 只有 adapter 已实际调用模型 POST 的动作才能生成 candidate；disabled、not-configured、invalid-config、secret-store、cancelled 与 storage 不写历史。其余结果严格限于 `AiInteractionResult`：success 保存已验证输出，auth/rate-limited/timeout/unavailable/server/response-too-large/invalid-response 保存 `validatedOutput=null`。
- 历史写入失败不丢弃已经验证的临时草稿，也不掩盖原 provider 错误：成功结果返回并带非阻塞 `historyWarning`；失败结果保持原错误码并附带 warning；应用内存快照保持最后一次成功持久状态。
- 历史不是模型上下文，也不参与 Roll、奖励、伙伴或 Goal 确认。
- 设置页显示记录数量并提供显式清空；清空只删除 interactions，不动凭据、Goal 或其他事实。

## 14. 设置与连接测试

Settings 分成非秘密 Provider 配置与秘密凭据两块：

- AI 总开关、GoalDraft 开关、历史开关；
- base URL、model、timeout、structured output mode；
- apiKey password input 和可选自定义 header rows；
- “保存/替换凭据”“删除凭据”“测试连接”。

设置页在首次启用以及每次“测试连接/生成”按钮附近持续显示目标 endpoint host、model、“本次输入将离开设备发送给该服务商”及实际发送范围；不声称自定义兼容 Provider 具有 OpenAI 的数据政策。

连接测试是明确的模型请求，会在按钮旁说明可能产生少量费用。它使用当前表单中尚未保存的非秘密配置与一次性凭据草稿，React 只经 `MvpApplication → AiGoalDraftService → ProviderAdapter` 传递；请求结束、取消或离页立即清空一次性秘密，不写 SecretStore。它使用同一 Chat Completions endpoint、timeout、大小上限、重定向策略和错误分类，但只要求固定 `{ "ok": true }` Schema，不写 AI history、不写 GoalDraft、不自动保存设置/凭据，也不隐藏重试。已保存凭据仅在其 endpoint binding 与当前表单规范化配置精确匹配时可代替空的一次性凭据。

保存设置与保存凭据是两个显式动作：修改 base URL 后，旧绑定凭据立即显示为“不匹配/未配置”；保存凭据时用当前已规范化 endpoint 建立新绑定。表单 dirty 状态不能让用户误以为测试使用了另一组配置。

现有“清空全部本地数据”入口改名为“清空目标、活动与历史（保留 AI 凭据）”，确认框再次披露 SecretStore 不受影响；设置页另有独立“删除 AI 凭据”。N4 不提供跨 DataStore/SecretStore 的伪原子组合清除，避免事实清库成功而秘密删除失败却误报“全部成功”。

全局 AI 或 GoalDraft 开关关闭、model 为空、配置无效或匹配当前 endpoint 的凭据缺失时，Goal 页面只显示本地手动表单与可理解的配置提示，不发网络请求。

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
- credentials：header token、CRLF、mixed-case 禁用名/前缀、大小写重复名、规范化小写存储、数量、单值/总大小、空认证、endpoint binding 匹配/不匹配；恶意导入改变 endpoint 后旧秘密不可读、不可发出；
- AiGoalDraft：所有联合分支、AiActivityDraft exact keys、strict unknown keys、1/5 活动边界、文本/数值边界、progress 本地域范围与 clarification 交叉规则；分别覆盖 baseline-null、target-null、两者-null、两者非空但大小非法；同一 Zod schema 的 canonical JSON Schema snapshot；
- interaction log：默认关闭、无内容 input summary、失败无 output；
- v1→v3、v2→v3、v3 identity、输入不变与未知版本拒绝；
- Goal/Activity/Settlement 类型重命名行为等价。

### 17.2 Provider contract fixtures

注入 fake fetch/ReadableStream，不访问真实网络：

- json-schema 与 json-object 两种准确 request body；
- header 合并且禁用 header 不可覆盖；
- 200 valid、refusal、`finish_reason=length`/未知 finish reason、空 choices、非字符串 content、Markdown、非法 JSON、unknown fields、Zod 失败；
- Content-Length 和 chunked body 超过 256 KiB；
- 3xx/redirect 拒绝、401/403/429/4xx/5xx、network failure、timeout、external cancel；验证 `redirect:error`、`credentials:omit`、`referrerPolicy:no-referrer`；
- 每个动作一次 adapter 调用、一次 fetch、一个模型 POST、零隐藏重试；CORS preflight 例外按浏览器语义记录；timer/listener cleanup、原始错误和秘密不出现在返回值。

### 17.3 SecretStore contract

- Memory adapter 同一会话读写删、刷新实例为空；
- Native wrapper 只使用固定 key/prefix、共享初始化门槛、iCloud sync=false、ThisDeviceOnly；并测试初始化与并发 read/write 的顺序；
- Native/Memory wrapper 对持久 `unknown` 做 strict decode；未知字段、损坏 JSON、超限或非规范 header 返回 `SecretStoreError`，binding 不匹配返回 null/false，任何情况都不返回秘密；has 走同一 read/validate 路径；
- Web composition 从不 import/调用插件 Web storage；
- 导出、清库、恢复导出和 interaction history 从不调用 SecretStore read；
- 保存失败不改变“已配置”状态，删除幂等。

### 17.4 存储与应用层

- SQLite v2→v3 DDL；逐项接受并安全重试 `(2,1)`、`(3,1)`、`(3,2)`，接受 `(0,1)` legacy 与 `(2,2)`/`(3,3)` current；未列出的半迁移、缺表、错列状态拒绝；事务每步失败回滚、meta 最后写；
- v1/v2/v3 import/export whitelist、v3 exact envelope/data keys、16 MiB snapshot/20 MiB envelope 预算与自产 export 往返、50 条/1 MiB history 裁剪、interaction ID 唯一、默认排除与显式 opt-in、日志 counts、secret marker 全仓扫描；
- 预算 fixture 覆盖接近 16 MiB 的合法 snapshot 成功 export→import、超过 16 MiB 的本地 mutation/迁移/导入原子拒绝，以及伪造超过 20 MiB envelope 在解析前拒绝；
- disabled/unconfigured 时 provider 调用次数为 0；
- invalid model output、取消、草稿取消均 Goal/Activity 零写入且 ID 不消耗；
- 1–5 Activities 确认一次原子提交，失败无半提交；
- history on/off、failure log、history storage warning、clear history；网络请求期间交错创建 Goal/Session、修改设置、清历史、关闭历史、关闭后重开，验证 clear/disable generation 胜出，mutation queue 总从最新快照追加且不丢更新；普通命令或 history append 的 replace 失败后，下一条 create/update/clear 仍可成功。

### 17.5 浏览器与 production

- 手动 Goal 创建回归；AI 未配置/关闭时零请求；
- route fixture 下生成→编辑→确认，多 Activity 一次落库；
- clarification、取消、timeout、401、429、非法/超长响应均保留输入并可切手动；
- 保存 Web session 凭据后 localStorage/导出/HTML 属性/可访问树/页面文本/截图基线无 secret marker，刷新后凭据状态消失；输入控件正在编辑时仅允许其受控 value 短暂持有秘密；
- production 初始加载与全部离线核心流程零请求；只有点击生成/连接测试时恰好一个允许的 Provider 请求；
- 320×640、键盘、焦点、错误 live region、取消按钮和触控区域可用。

### 17.6 Android/CI

- TypeScript、Vitest、dev/production Playwright、audit、license、network scan、secret scan、build/cap sync；
- Gradle assembleDebug、merged manifest、APK hash、artifact 与 PR exact-head CI；
- Pixel 3 XL/API31 在线时执行 `development-smoke`：Keystore 保存/替换/删除、endpoint 换绑、强杀恢复、卸载重装、无网、TLS、系统备份语义、输入法与小屏。设备不可用只记录 `development smoke unavailable`，不阻塞 N4 确定性完成或 N5 实现；但任何观察到的崩溃、数据损坏、安全或原生集成异常必须先归因和修复。fake adapter/CI APK 只能标记 `test-double-not-native`，不得冒充设备证据。
- 正式 native SecretStore 与 API33+ 证据统一迁入 N6，并按 `docs/superpowers/specs/2026-08-11-pixel-first-final-native-acceptance-design.md` 对同一 release-signed exact-head RC 执行。

## 18. 完成标准

N4 确定性实现完成必须同时满足：

1. 默认 AI/GoalDraft/history 均关闭；离线核心和手动 Goal 创建不回归；
2. 只有用户主动点击生成或连接测试才可能触发网络；产品代码每个动作恰好一次 adapter/fetch、一个模型 POST、零重试，浏览器 CORS OPTIONS preflight 除外；
3. SecretStore、ProviderAdapter、Zod Schema、schema v3 migration/SQLite/import/export 均有契约测试；
4. 非法、恶意、超长、拒绝、超时、取消和 HTTP 错误均零正式事实写入；
5. 已验证草稿可编辑，1–5 Activities 只在确认后一次原子提交；
6. apiKey/custom header 值不出现在 SQLite、localStorage、导出、历史、日志、HTML 属性/可访问树/页面文本、截图基线、错误或 Git；正在编辑的 password input 受控 value 是唯一短暂 UI 例外，保存/取消/离页即清空；
7. 产品网络 API 只存在于唯一 Provider adapter，manifest 只有必要 INTERNET 且继续禁止 cleartext/backup；
8. code-review/simplify 无未关闭 High/Medium，完整本地门槛和 exact-head Android CI 全绿；
Pixel development smoke 不是 N4 完成门槛；N4 只在 1–8 全部成立后标记“确定性实现完成”。正式真机验收留到 N6，且不得把开发冒烟或 test double 继承为最终证据。

## 19. 外部依据

- [OpenAI Chat API reference](https://developers.openai.com/api/reference/resources/chat)：Chat Completions request/response、`finish_reason` 与 refusal 结构（核验于 2026-08-11）。
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)：Chat Completions `json_schema`/strict、所有字段 required、nullable union、`additionalProperties:false`、JSON mode 差异与 refusal/length 处理（核验于 2026-08-11）。
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)：不可导出密钥和授权边界（核验于 2026-08-05）。
- [Android EncryptedSharedPreferences reference](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)：deprecated 状态和加密 preferences 不应备份警告（核验于 2026-08-05）。
- [`@aparajita/capacitor-secure-storage` npm](https://www.npmjs.com/package/@aparajita/capacitor-secure-storage)：8.0.0、MIT、Capacitor 8、Android AES-GCM/Keystore 与 Web localStorage 退化说明（核验于 2026-08-11）。
- [`@aparajita/capacitor-secure-storage` source](https://github.com/aparajita/capacitor-secure-storage/tree/v8.0.0)：Android Keystore、Web localStorage 与初始化 API 的实现审计基线（核验于 2026-08-11）。
- [Zod JSON Schema conversion](https://zod.dev/json-schema)：由单一 Zod schema 生成 Provider JSON Schema 的实现依据（核验于 2026-08-11）。
