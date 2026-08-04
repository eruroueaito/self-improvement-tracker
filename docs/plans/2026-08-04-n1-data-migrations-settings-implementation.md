# N1 数据、迁移与设置底座 v2 实施计划

> 状态：已获用户批准，2026-08-04 开始实施  
> 设计依据：`docs/superpowers/specs/2026-08-04-n1-data-migrations-settings-design.md`  
> 范围边界：只实现确定性本地数据与非秘密设置；不接入 AI、SecretStore、网络权限或云同步。

## 1. 交付目标

N1 完成后，应用应当：

1. 将既有 v1 快照无损迁移到 v2，并为新设置填充安全默认值。
2. 对浏览器、内存和 Android SQLite 使用同一条纯应用层迁移链。
3. 只允许 `CurrentAppSnapshot`（v2）进入运行态和写入边界。
4. 以事务方式写入所有事实和设置；失败时保留迁移前数据及内存状态。
5. 接受 v1/v2 导入、只导出 v2，并在用户确认前不修改数据。
6. 恢复导出严格使用字段白名单，不泄露未知字段、Provider 密钥或未来秘密。

## 2. 工作包与执行顺序

### W1：版本化快照、设置与纯迁移器

改动文件：

- 新增 `src/app/settings.ts`
- 新增 `src/app/snapshots.ts`
- 新增 `src/app/migrations.ts`
- 新增 `src/app/migrations.test.ts`
- 修改 `src/app/ports.ts`

实施内容：

1. 定义 `AppSettings`、安全默认值和运行态设置校验。
2. 分离 `PersistedSnapshotV1`、`PersistedSnapshotV2`、`PersistedSnapshot` 联合类型与 `CurrentAppSnapshot`。
3. 实现无副作用、逐版本、不可变的 `migrateSnapshot`；输入和输出都做完整版本校验。
4. 固定 v1→v2 迁移规则：保留全部事实，新增默认设置，`schemaVersion` 升至 2。
5. `DataStore.load` 只承诺返回持久化联合类型，`replace` 只接受当前 v2。

验证：

- v1 fixture 精确迁移到 v2。
- v2 输入只返回深拷贝，不与输入共享引用。
- 缺字段、非法设置、未知/未来版本被拒绝。
- 迁移失败不修改输入。

### W2：运行态初始化与浏览器/内存适配器

改动文件：

- 修改 `src/app/mvpApplication.ts`
- 修改 `src/adapters/memory/memoryStore.ts`
- 修改 `src/adapters/browser/localStorageStore.ts`
- 扩展 `src/adapters/storeContract.test.ts`
- 扩展 `src/app/mvpApplication.test.ts`

实施内容：

1. 初始化顺序改为 `store.initialize → load persisted → migrate/validate → replace current when needed → publish in-memory snapshot`。
2. 新库直接创建 v2 空快照；旧库迁移写回失败时不得发布 v2 内存状态。
3. 浏览器继续复用 `self-improvement-tracker:v1` key，避免因 key 改名制造第二套迁移问题。
4. Memory/localStorage 的 `load` 返回深拷贝/解析结果，`replace` 只持久化 v2。
5. 增加 `updateSettings` 原子用例；保存失败时 UI 所见设置保持原值。

验证：

- v1 首次启动迁移并只写回一次。
- v2 启动不发生无意义重写。
- 迁移/写回/设置保存失败时，存储和运行态均保持旧值。
- 所有存储适配器继续满足 copy-after-commit 契约。

### W3：导入、预览、确认与安全恢复导出

改动文件：

- 修改 `src/app/importValidation.ts`
- 修改 `src/app/mvpApplication.ts`
- 修改 `src/ui/app/App.tsx`
- 修改 `src/ui/goals/GoalsScreen.tsx`
- 必要时新增窄 UI 组件与独立测试文件

实施内容：

1. `validateImportEnvelope` 接受 v1/v2，并返回可迁移的持久化快照。
2. 新导出统一为 envelope v2，包含设置但不包含任何凭据字段。
3. `previewImport(serialized)` 完成解析、校验、迁移和摘要生成，不写存储。
4. 确认导入时重新解析同一份不可变字符串；只在二次校验成功后执行一次原子 replace。
5. UI 显示来源版本、目标/活动/专注/奖励数量和覆盖警告，提供确认/取消。
6. 恢复导出逐层构造白名单对象，不透传未知字段或未知 settings 子树。

验证：

- v1/v2 导入预览不写数据；取消不写数据。
- 确认后仅写一次，失败时旧数据和旧设置完整保留。
- v1 导入后运行态/再次导出均为 v2。
- 含伪造 `apiKey`、未知 settings、原型污染键的输入不会进入恢复导出。

### W4：SQLite 双版本迁移与事务状态机

改动文件：

- 重构 `src/adapters/sqlite/sqliteStore.ts`
- 新增 SQLite 连接窄接口/测试替身（若现有插件类型不利于注入）
- 新增 `src/adapters/sqlite/sqliteStore.test.ts`
- 扩展 `src/adapters/storeContract.test.ts`

实施内容：

1. 打开前判断数据库是否存在；既有库先用检查连接读取 native `user_version`、`app_meta` 和必需表。
2. 注册唯一 `0→2` DDL upgrade，只新增 `app_settings`，不在 DDL 内迁移应用事实。
3. 严格执行规格状态矩阵：
   - `0 + meta1`：允许升级；
   - `2 + meta1`：允许重试应用数据迁移；
   - `2 + meta2`：当前态；
   - `native<2 + meta2`、缺失/非法/future meta：拒绝启动且不清库。
4. `replace` 在单事务内清理并重写事实、projection、settings，最后一步才写 `app_meta=2`。
5. 每一个 DELETE/INSERT/settings/meta/commit 步骤都可由 fake connection 注入失败，并断言 rollback。

验证：

- 真实 `998d494` 形状（native 0 + meta1）契约通过。
- DDL 失败保持 `0 + meta1`；应用写入失败保持 `2 + meta1`；重试可收敛到 `2 + meta2`。
- 非法状态全部 fail closed，不删除旧库。
- 所有写入步骤的失败注入均回滚，meta2 永远最后写入。

### W5：设置界面与端到端验收

改动文件：

- 在现有 UI 导航中加入最小设置入口和控件
- 新增独立 `e2e/n1-data-settings.spec.ts`，避免与 N0 的 `e2e/mvp.spec.ts` 脏改动混合
- 更新 N1 验收文档/记录

实施内容：

1. 提供主题、动态效果、触觉、通知、AI 总开关和 AI 历史开关。
2. AI 及 AI 历史默认关闭；N1 中控件只保存策略，不触发网络或请求系统权限。
3. 设置更改即时反映在运行态；存储失败时恢复旧值并显示可理解错误。
4. 端到端覆盖：v1 本地数据升级、设置刷新后保留、导入预览取消/确认、导出 v2、离线无外部请求。

### W6：审查、简化、证据与提交

1. 执行 N1 专项 code-review，优先检查数据丢失、版本错判、秘密泄露和事务原子性。
2. 执行 simplify，仅简化已修改代码且保持行为不变。
3. 运行完整门槛：

```powershell
npm run typecheck
node_modules/.bin/vitest run
npm run verify:no-network
npm run build
npx cap sync android
npm run test:e2e
```

4. 在有 Android runtime 时补做真实 `998d494` SQLite 数据库升级与失败恢复；无设备时明确标记为待补原生证据，不用 fake 结果替代。
5. 逐文件检查暂存区，只提交 N1 文件；N0 未提交工具、manifest、CI 和现有 E2E 改动不得混入。

## 3. 提交策略

建议拆成三个可独立回退的 N1 提交：

1. `feat: add versioned snapshots and settings migration`
2. `feat: add atomic v2 import and sqlite migration`
3. `feat: add local settings and n1 acceptance coverage`

每次提交前执行 `git diff --cached --name-only`，并与本计划的文件范围逐项对照。

## 4. 阻塞与降级规则

- 无 Android 设备：不阻止 W1–W5 的纯逻辑和浏览器实现，但阻止 N1 原生 SQLite 最终签收。
- 无 Git remote：不阻止本地开发，但阻止 N0/N1 远端 CI 证据形成。
- 迁移状态未知：立即 fail closed，保留数据库，不自动清库、不猜测版本。
- 发布凭据缺失：N1 不需要；N6/N7 开始前由发布所有者提供受控签名环境。
- Mac/Apple 资产缺失：不阻止当前 N1，但最迟 N4 前必须确认，否则 N7 截止目标不可达。

## 5. N1 完成定义

只有以下条件同时满足，N1 才可标记完成：

- 所有规格状态矩阵与失败注入测试通过。
- v1/v2 导入、v2 导出、预览确认和秘密排除测试通过。
- 设置默认值、持久化、失败回滚和 UI 流程通过。
- TypeScript、单测、网络边界、构建、Capacitor sync、浏览器 E2E 全部通过。
- code-review 与 simplify 完成且无高严重度遗留。
- 真实 Android SQLite 证据已补齐；若设备仍不可用，N1 实现可提交但阶段不得宣称完成。
