# N4 AI 基础与 GoalDraft 逐文件实施计划

> 状态：实施中（W1 输入命名、Provider/GoalDraft schema、interaction history 已完成）
> 设计依据：`docs/superpowers/specs/2026-08-05-n4-ai-goal-draft-design.md`
> 上位路线：Pixel/API31 优先 development smoke；正式 Keystore/网络/生命周期设备验收统一在 N6。

## 1. 实施原则与技术选择

- 精确锁定 `zod@4.4.3` 和 `@aparajita/capacitor-secure-storage@8.0.0`；前者是 AiGoalDraft/配置/凭据的单一运行时 schema，后者只由 Android native adapter 使用。
- 不引入 OpenAI SDK、Agent、通用 HTTP client、代理服务或第二套状态库；唯一网络实现是窄 `fetch` adapter。
- Web 组合根使用 session-memory SecretStore，绝不加载插件 Web localStorage adapter。
- 所有工作包测试先行；每次产品代码更改后同步 planning files。
- N3.1 必须先独立完成并提交，N4 不依赖实际伙伴美术。

## 2. W1：输入命名与 schema v3 纯模型

### 文件

- 修改 `package.json`、`package-lock.json`
- 修改 `src/modules/goals/types.ts`、`src/modules/goals/validation.ts` 及所有引用
- 修改 `src/modules/sessions/types.ts`、对应 validation/引用
- 修改 `src/modules/settings/settings.ts` 与测试
- 修改 `src/app/snapshots.ts`
- 修改 `src/app/migrations.ts`、`src/app/migrations.test.ts`
- 修改 v1/v2 fixtures；新增 v3 canonical fixtures
- 新增 `src/modules/ai/types.ts`
- 新增 `src/modules/ai/providerConfig.ts` 与测试
- 新增 `src/modules/ai/goalDraftSchema.ts` 与测试/snapshot fixture
- 新增 `src/modules/ai/interactionLog.ts` 与测试
- 新增 `src/app/snapshotBudget.ts` 与测试

### 步骤

1. 行为等价重命名 `GoalDraft→GoalInput`、`ActivityDraft→ActivityInput`、`SettlementDraft→SettlementInput`，先让全仓类型与既有测试转绿。
2. 增加 schema v3、`AiSettings`、`AiProviderSettings`、`aiInteractions`，默认 AI/GoalDraft/history 关闭，model 为空且绝不自动联网。
3. 建立严格 v1/v2/v3 union 和纯 `v1→v2→v3`、`v2→v3`、v3 identity 迁移；未知/未来版本 fail closed。
4. 实现 Provider config、AiGoalDraft strict Zod、同源 JSON Schema snapshot、interaction strict validation/裁剪。
5. 实现 16 MiB canonical snapshot 与 20 MiB envelope 预算工具，供 mutation/migration/import/export 共用。

### 验证

```powershell
npm run typecheck
npx vitest run src/modules/goals src/modules/sessions src/modules/settings src/modules/ai src/app/migrations.test.ts src/app/snapshotBudget.test.ts
npm run verify:n0:network
```

## 3. W2：导入导出与 SQLite v3

### 文件

- 修改 `src/app/importValidation.ts` 与测试
- 修改 `src/app/importExport.ts` 与测试
- 修改 `src/app/mvpApplication.importExport.test.ts`
- 修改 `src/adapters/sqlite/sqliteMigrationState.ts` 与测试
- 修改 `src/adapters/sqlite/sqliteSnapshotWriter.ts` 与测试
- 修改 `src/adapters/sqlite/sqliteStore.ts` 与测试
- 修改所有 schema v2 E2E fixture 为 v3 或明确 v2 migration fixture

### 步骤

1. v3 envelope exact keys 加入 `aiHistoryIncluded`；普通/recovery 默认空 history，只有单次显式 opt-in 才包含。
2. 导入支持 v1/v2/v3，导入预览显示 endpoint host/model 与凭据不迁移提示；`aiHistoryIncluded=false` 却含记录时拒绝。
3. 固定 native/app version 3，增加 `ai_interactions` 表和 `(native, app)` 六状态迁移矩阵。
4. snapshot replace 在一个事务写完 facts/settings/interactions 后最后更新 meta；任何预算/DDL/data 错误保留旧库并可安全重试。

### 验证

```powershell
npx vitest run src/app/importValidation.test.ts src/app/importExport.test.ts src/app/mvpApplication.importExport.test.ts src/adapters/sqlite
npm run typecheck
```

## 4. W3：SecretStore 端口与适配器

### 文件

- 修改 `src/app/ports.ts`
- 新增 `src/modules/ai/credentials.ts` 与测试
- 新增 `src/adapters/secrets/sessionSecretStore.ts` 与测试
- 新增 `src/adapters/secrets/nativeSecretStore.ts` 与测试
- 修改 `src/main.tsx`/组合根和 Android Capacitor 插件注册结果

### 步骤

1. 建立闭合 `SecretStore` 业务端口、Provider binding 和 strict credential schema。
2. 实现 header lowercase/去重/禁用名、CRLF、数量、单值/总大小与至少一种认证校验。
3. session adapter 只在进程 Map 保存；刷新即丢失，不访问任何浏览器存储。
4. native adapter 用共享 initialization Promise 设置固定 prefix，所有操作等待初始化；错误脱敏为 `SecretStoreError`。
5. 组合根按平台显式选择 adapter，产品其他模块不得 import 插件。

### 验证

```powershell
npx vitest run src/modules/ai/credentials.test.ts src/adapters/secrets
rg -n "localStorage|sessionStorage|indexedDB|console\.|apiKey|customHeaders" src/adapters/secrets
npm run typecheck
```

## 5. W4：ProviderAdapter 与 GoalDraft service

### 文件

- 新增 `src/adapters/ai/openAiCompatibleProvider.ts` 与测试 fixtures
- 新增 `src/app/aiGoalDraftService.ts` 与测试
- 修改 `src/app/ports.ts`
- 新增脱敏错误映射和 bounded-body reader 模块/测试（若适合独立职责）

### 步骤

1. 实现闭合 `ProviderTask`，内建固定 prompt/messages/schema；调用者不能提供任意 URL/messages/headers。
2. 每次动作恰好一个 fetch/POST、零重试；固定 redirect/error、omit credentials/referrer、no-store、CORS。
3. 先检查 status/Content-Length，再流式读取至 256 KiB；严格检查 stop/refusal/content/JSON/Zod。
4. 区分 caller cancel 与内部 timeout，清理全部 timer/listener；错误永不含 endpoint query、body、header 或秘密。
5. service 在调用瞬间读取 endpoint-bound secret，检查功能开关并只返回临时 draft + 可选 history candidate，不写 DataStore。

### 验证

```powershell
npx vitest run src/adapters/ai src/app/aiGoalDraftService.test.ts
npm run typecheck
```

## 6. W5：应用 mutation queue、原子确认与历史竞争

### 文件

- 修改 `src/app/mvpApplication.ts`
- 修改 `src/app/mvpApplication*.test.ts`
- 必要时新增 `src/app/mutationQueue.ts` 与测试

### 步骤

1. 先用测试把所有现有 mutation 迁入串行 queue；单次 replace 失败向调用者传播，但 tail 恢复，内存只在成功后更新。
2. 新增 `createGoalWithActivities(goal, activities[1..5])`，手动创建也走该原子用例；确认前不消耗 ID。
3. 接入 generate/test/save/delete/clear-history 窄门面，网络等待不占 queue。
4. 实现 `historyGeneration`：clear 和 true→false 在入队前同步递增；旧 candidate 永远不能复活历史。
5. history 失败作为非阻塞 warning，不丢已验证草稿、不掩盖 Provider 错误。
6. 将“清空全部本地数据”文案/语义改为清空事实与历史但保留 Provider 凭据；秘密只由设置页显式删除。

### 验证

```powershell
npx vitest run src/app
npm run typecheck
```

## 7. W6：设置 UI 与 AiGoalDraft 编辑确认

### 文件

- 新增 `src/ui/settings/AiProviderSettings.tsx` 与测试
- 修改 `src/ui/settings/SettingsPanel.tsx` 与测试
- 新增 `src/ui/goals/AiGoalDraftPanel.tsx` 与测试
- 修改 `src/ui/goals/GoalForm.tsx`
- 修改 `src/ui/app/App.tsx`
- 修改 `src/ui/styles.css`
- 新增/修改 N4 Playwright E2E

### 步骤

1. 设置页加入总开关、GoalDraft 开关、history 开关、Provider config、password/custom header 输入、连接测试、凭据删除、历史清空与显式 history-export opt-in。
2. 任何外发输入旁持续显示目标 host、发送范围和第三方离机提示；未配置/关闭时手动流程完全可用。
3. GoalDraft UI 支持输入、生成、取消、request token、clarification、编辑/删除 1–5 activities、确认失败保留草稿和返回手动表单。
4. 保存/取消/离页清空受控秘密；DOM/a11y/screenshot/log 不得出现值。
5. 确认时把 Editable form 映射为本地 Inputs，再走 normalizer 与一次原子 create。

### 验证

```powershell
npx vitest run src/ui/settings src/ui/goals src/ui/app
npx playwright test e2e/n4-ai-goal-draft.spec.ts
npm run typecheck
```

## 8. W7：Android、网络边界与双模式 smoke runner

### 文件

- 修改 `android/app/src/main/AndroidManifest.xml`
- 修改 `scripts/verify-network-boundary.mjs` 与测试
- 修改 `scripts/run-android-smoke.ps1`
- 修改 `scripts/test-android-smoke-runner.ps1`
- 修改 `docs/testing/android-smoke.md`
- 修改 CSP（仅在已批准的 Provider 边界所需范围内）

### 步骤

1. 只新增 INTERNET；继续硬断言 `allowBackup=false`、`usesCleartextTraffic=false`，不恢复 biometric 权限。
2. 网络扫描改为只有唯一 Provider adapter 能出现 fetch/endpoint 构造，其他产品文件、远程资产、WebSocket、遥测继续失败。
3. runner 实现 `Development`/`Final` 互斥模式：N4 Development 接受 Pixel/API31 + `ProviderOnly`；Final 按 `P31-*`/`A33-*` case 和冻结 RC manifest 强制身份/API。
4. fake ADB 继续永久标记 `test-double-not-native`；补 API31、ProviderOnly、case family、debug/release、RC manifest 失败契约。
5. `cap sync android` 后审计插件注册、传递依赖、许可证、APK 权限和体积。

### 验证

```powershell
npm run verify:n0:network
npm run test:n0:android-smoke-runner
npm run build
npx cap sync android
```

## 9. W8：完整收口与 Pixel development smoke

1. 固定 Node 24.14.0/npm 11.12.1 下运行 typecheck、全部 Vitest、dev/production Playwright、runtime audit、许可证/秘密/网络扫描、build、cap sync、Gradle debug 与 diff check。
2. 执行 code-review；关闭全部 High/Medium。再执行 simplify，只做行为等价简化。
3. Pixel/API31 窄冒烟：升级 APK、Keystore 保存/替换/换绑/删除、强杀恢复、卸载重装、未配置零请求、主动单 Provider 请求、TLS/无明文、小屏/输入法。记录 `development-smoke`，不冒充 N6。
4. 推送 exact-head draft PR 并等待 Android CI 全绿；记录 run/head SHA/artifact。
5. 更新 planning files，按工作包形成可回退提交。

## 10. 提交顺序

```text
refactor: rename local input types
feat: add schema v3 ai settings and history
feat: add secure provider credential stores
feat: add strict goal draft provider adapter
feat: serialize mutations and atomic goal creation
feat: add editable ai goal drafts
build: allow only provider network access
test: close n4 android and security gates
docs: record deterministic n4 completion
```

不得全量 `git add .`；每个提交只暂存对应工作包和已同步规划记录，保留用户工作树中无关改动。

## 11. 阻塞与降级

- Pixel 离线：记录 development smoke unavailable，继续确定性实现；已观察到的产品缺陷不得跳过。
- Provider CORS 不支持 Web：不引入代理，浏览器显示边界提示，Android build 仍可使用。
- SecretStore/Provider/SQLite 任一步失败：fail closed，不回显秘密、不部分写事实、不清库。
- API33+ 不可用：只阻塞 N6 final-native-acceptance，不回溯否定 N4 确定性完成。
