# N1 数据、迁移与设置底座 v2 设计规格

日期：2026-08-04

状态：已通过独立规格终审（第三轮，2026-08-04）与用户书面复核（2026-08-04）；可进入实施

上位路线：用户已批准方案 B 与 N0–N7 Post-MVP 路线，本规格细化 N1，不改变阶段范围

## 1. 目标与退出条件

N1 为后续离线能力、伙伴反馈和 AI 草稿建立可演进的数据底座。完成后必须同时证明：

1. `998d494` 产生的 schema v1 数据可以无损升级为 v2；
2. 迁移、校验或写回任一步失败都不清库、不覆盖旧数据；
3. 持久写入失败时，应用内存快照与最后一个持久快照保持一致；
4. 非秘密 `AppSettings` 跨重启保持，并能随 v2 备份导出/恢复；
5. v1 和 v2 导出都可导入，新导出只生成 v2；
6. API key、完整请求头和 SecretStore 内容在类型、存储、日志和导出边界之外；
7. SQLite 与浏览器适配器遵守相同版本和原子替换契约。

N1 不以 N0 尚缺的设备证据替代自身测试，也不降低 N0 的 Android 原生退出标准。

## 2. 明确不做

- 不全面重写 Repository，不把完整快照拆成大量逐实体仓储；
- 不引入 ORM、事件总线、依赖注入框架或通用工作流引擎；
- 不实现 SecretStore、ProviderAdapter、模型请求或 AI 历史实体，这些属于 N4；
- 不完成完整设置界面、深色主题样式或触觉适配，这些在 N6 收口；
- 不更换浏览器 `localStorage` key，不让既有开发数据失联；
- 不接受未知的未来 schema，也不尝试降级新版本数据。

## 3. 方案比较与决策

### 方案 A：应用层纯快照迁移（采用）

`DataStore` 读取明确版本的 persisted union，应用初始化时用纯 `MigrationRunner` 逐步迁移、校验，成功后通过现有 `replace` 一次写回。SQLite 和 localStorage 共用同一数据迁移代码。

优点：规则只有一份；迁移可用 Vitest 完整覆盖；失败前没有写操作；最符合当前完整快照原子提交结构。缺点：SQLite 仍需单独处理新增表的 DDL version。

### 方案 B：每个适配器自行迁移（不采用）

SQLite 用 SQL/插件 upgrade，localStorage 用 TypeScript 各自升级。

优点：迁移贴近介质。缺点：同一业务默认值和校验会出现两份实现，容易让浏览器开发壳与 Android 行为漂移。

### 方案 C：全面拆分 Repository 与逐表迁移（不采用）

现在把 DataStore 改成 Goal/Session/Settings 等多仓储，再逐表执行 SQL migration。

优点：长期可细粒度查询。缺点：N1 改动面过大，会重写已经通过闭环测试的事务边界；当前数据量和用例不需要该复杂度。

## 4. 版本化数据模型

事实字段提取成共享结构，但版本必须保持可判别，不用可选字段伪装兼容：

```ts
interface SnapshotFacts {
  goals: Goal[];
  activities: ActivityTemplate[];
  recommendationRuns: RecommendationRun[];
  sessions: Session[];
  rewardEntries: RewardLedgerEntry[];
  companionProjection: CompanionProjection;
}

interface PersistedSnapshotV1 extends SnapshotFacts {
  schemaVersion: 1;
}

interface CurrentAppSnapshot extends SnapshotFacts {
  schemaVersion: 2;
  settings: AppSettings;
}

type PersistedSnapshot = PersistedSnapshotV1 | CurrentAppSnapshot;
type AppSnapshot = CurrentAppSnapshot;
```

`PersistedSnapshotV1` 必须由独立 fixture 保留 `998d494` 的真实形状，不能通过删除 v2 字段临时构造。所有当前应用用例只接收 `CurrentAppSnapshot`。

## 5. AppSettings

N1 只持久化非秘密设置：

```ts
interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced' | 'none';
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  ai: {
    enabled: boolean;
    historyEnabled: boolean;
  };
}
```

默认值由无副作用的 `createDefaultAppSettings()` 每次创建新对象：

- `theme: 'system'`；
- `motion: 'system'`；
- `hapticsEnabled: true`；
- `notificationsEnabled: true`；
- `ai.enabled: false`；
- `ai.historyEnabled: false`。

`normalizeAppSettings(unknown)` 只返回上述白名单字段，拒绝错误类型和非法枚举。`apiKey`、`authorization`、`headers`、`password`、`secret`、`token` 不属于 AppSettings；系统配置范围出现这些键时导入校验必须拒绝。用户自己写在目标说明或备注里的普通文本不按内容扫描，避免误伤用户数据。

N1 提供 `updateSettings(next)` 应用用例并原子持久化。`notificationsEnabled=false` 时不再安排新的 Countdown 通知，但 Session 的绝对时间事实照常工作；结束时仍执行 best-effort cancel。其他设置先作为可靠底座保存，视觉和触觉行为在后续阶段接入。

## 6. MigrationRunner

迁移接口保持最小且确定：

```ts
interface Migration<From extends PersistedSnapshot, To extends PersistedSnapshot> {
  from: From['schemaVersion'];
  to: To['schemaVersion'];
  up(snapshot: From): To;
}
```

首个迁移 `v1ToV2`：

- 深拷贝全部 v1 事实；
- 把 `schemaVersion` 设为 2；
- 增加全新的默认 AppSettings；
- 不重算或改写 Goal、Activity、RecommendationRun、Session、RewardLedger；
- 对 CompanionProjection 只做当前事实校验，应用正常初始化仍可从账本重建派生缓存。

Runner 规则：

1. 不修改输入对象；
2. 每一步必须有唯一的 `from`，且 `to > from`；
3. 每一步输出立即做对应版本校验；
4. 缺少步骤、重复步骤、未来版本、降级请求或循环立即失败；
5. 到达 current version 后再做完整引用/账本/AppSettings 校验；
6. 返回 `{ snapshot, migratedFrom: number | null }`，调用方据此决定是否写回。

未知 schema 必须抛出带版本号的 `UnsupportedSchemaVersionError`，不得把它当空库。

## 7. DataStore 与启动数据流

端口只做必要变化：

```ts
interface DataStore {
  initialize(): Promise<void>;
  load(): Promise<PersistedSnapshot | null>;
  replace(snapshot: CurrentAppSnapshot): Promise<void>;
}
```

初始化顺序：

1. `store.initialize()` 只准备介质和 DDL，不覆盖应用数据版本；
2. `store.load()` 返回 null、v1 或 v2；
3. null 时创建并原子保存空 v2；
4. 非空时运行 MigrationRunner 和完整校验；
5. 若发生迁移，先 `store.replace(v2)` 成功，再把应用内存指向 v2；
6. 若无需迁移，直接装载验证后的深拷贝；
7. 最后执行现有 Session 恢复逻辑。

迁移或写回失败时应用不得进入部分初始化状态。若事实部分可完整验证，应用只保留由白名单逐字段重建的 recovery envelope，错误页提供“重试”和“导出可恢复数据”；绝不缓存或导出原始未知对象。若适配器连事实都无法解析/验证，只显示保留数据库的错误，不伪造可用备份。

恢复导出规则：

- v1 只从已验证事实构造 v1 envelope，不包含任何 settings；
- v2 只从已验证事实构造 v2 envelope，settings 必须经深度白名单 normalization；
- settings 含秘密键、未知嵌套键或非法值时，恢复文件使用全新默认 settings，界面明确提示“设置未恢复”，且不复制原 settings 的键或值；
- 事实校验失败时不提供 JSON 恢复导出；
- 用户自己写在 title/description/note 等领域字符串中的内容仍按用户数据保留，不做内容关键字替换。

## 8. 各适配器设计

### 8.1 MemoryStore

- 构造器接受 `PersistedSnapshot | null`；
- `load` 始终深拷贝；
- `replace` 只接受 v2，并在完整克隆成功后交换引用；
- 测试可包装为 fail-on-next-replace，用于应用层失败注入。

### 8.2 LocalStorageStore

- 保留 key `self-improvement-tracker:v1`；key 是存储位置标识，不等于当前 schema；
- 先 JSON.parse，再把未知对象交给版本解析器；
- replace 先完成 clone + stringify，最后一次 `setItem`；
- QuotaExceeded 或序列化失败时不改变应用内存快照。

### 8.3 SqliteStore

原生 SQLite DDL version 与应用数据 version 分开管理：

- 调用 `addUpgradeStatement(DATABASE_NAME, [{ toVersion: 2, statements: [...] }])`；
- DDL v2 只增加 singleton `app_settings(id=1, payload)` 表；
- `createConnection` target version 改为 2；
- 已核对 `998d494` 与当前 SQLite 插件源码：旧版虽调用 `createConnection(..., 1)`，但没有注册 upgrade statement；插件只在实际执行 upgrade statement 后调用 `setVersion`，所以该基线旧库的权威原生 DDL version 是 SQLite 默认值 0，`app_meta.schema_version` 才是 1；
- 打开前先用 `isDatabase` 记录数据库文件是否已经存在。对既有库，先在**尚未注册 upgrade statement**的检查连接中读取 `getVersion()`、`app_meta` 和 v1 必需表结构，关闭并删除该连接后才决定是否允许升级；这样不会在识别 `native <2 + meta2` 等不一致状态之前覆盖证据；
- 只有“本次新建且全部事实/投影/settings 表为空”的数据库才允许初始化 `app_meta=2`；
- 对任何 pre-existing database，初始化 DDL 绝不补写或覆盖 app_meta。缺失、重复、非整数 app_meta 一律视为损坏，而不是猜成 v1；
- load 先读 `app_meta.schema_version`。v1 不读 settings；v2 必须读到且校验 settings singleton；
- replace 在单连接事务中替换事实、投影和 settings，并把 `app_meta.schema_version=2` 作为同一事务中的最后一项写入；
- 任意 run/execute/commit 失败都 rollback；rollback 失败附加为诊断信息，但不得掩盖原始错误。

合法状态矩阵：

| 打开前状态 | 升级后的状态 | 处理 |
|---|---|---|
| 不存在的新库 | native 2 + 无 meta | 执行 DDL v2、创建其余表并确认全部数据表为空后初始化 meta2；应用创建空 v2 |
| `998d494`：native 0 + meta1，且 v1 表结构完整 | native 2 + meta1 | 合法待迁移态；读取 v1，纯迁移，原子 replace 成功后 meta2 |
| native 0 + meta1，上一轮 DDL upgrade 失败并已由插件恢复 | native 2 + meta1 | 与未升级的基线旧库相同，安全重试 DDL 与数据迁移 |
| native 2 + meta1 | 不变 | 合法数据迁移重试态；说明 DDL 已完成但数据写回未完成，重新运行同一纯迁移 |
| native 2 + meta2 | 不变 | 合法当前态；settings singleton 必须存在且有效 |
| pre-existing 任意 native + 缺失/非法/重复 meta | 不升级 | 拒绝初始化；保留数据库，不猜测数据版本 |
| native 0/1 + meta2 | 不升级 | 原生结构落后于数据版本，拒绝；不得先升级再掩盖不一致 |
| native 1 + meta1 | 不升级 | 不属于 `998d494` 可证明基线，N1 不猜测其来源；保留数据库并要求恢复/诊断 |
| native >2 或 meta>2 | 不升级 | 未来版本，拒绝降级或写入 |

DDL upgrade 自身失败时，插件恢复升级前备份并让 `open()` 抛错，因此本轮不进入应用数据迁移；下次启动仍看到 `native 0 + meta1`，可从头重试。如果 DDL 已把 native 从 0 升到 2，而纯迁移或 replace 随后失败，数据库则落在 `native 2 + meta1`。两种状态都可重试，但只有后者跳过 DDL；旧事实与 app_meta 在数据事务成功前始终保持 v1。

为在无原生 runtime 的 Vitest 中做确定性失败注入，抽出窄接口的 `snapshotWriter`：只依赖 begin/execute/run/commit/rollback。SqliteStore 调用真实连接，测试用 fake connection 在每一个写入序号抛错并断言 rollback、无 commit。真正 SQLite 契约仍须在 N0 设备可用后运行，浏览器 fake 不冒充原生证据。

## 9. 导出、预览与导入 v2

新导出 envelope：

```ts
interface ExportEnvelopeV2 {
  format: 'self-improvement-tracker';
  version: 2;
  exportedAt: number;
  data: Omit<CurrentAppSnapshot, 'schemaVersion'>;
}
```

导出只从当前快照白名单构造，不直接 stringify 任意对象；不包含 SecretStore、通知系统 ID、临时草稿或 UI 状态。

导入分两步：

1. `previewImport(serialized)` 解析 JSON、识别 v1/v2、迁移到 current、完整校验并返回：sourceVersion、Goal/Activity/Session/Reward counts、是否有进行中 Session、将恢复的非秘密设置摘要；不写存储。
2. UI 展示摘要并二次确认。取消后不调用写用例；确认后对同一不可变字符串再次执行同一解析/校验，再一次 `replace`。

导入总是全量替换，不 merge，因此重复导入不会产生重复行或重复奖励。导入后的 CompanionProjection 从 RewardLedger 重建，不信任文件中的缓存；v2 settings 经白名单 normalization 后保存。v1 文件使用默认 settings。

导入 JSON 无效、引用断裂、幂等键重复、反向账目不一致、设置非法、未来版本或秘密配置键时，错误必须包含可理解的字段/版本信息，旧快照保持不变。

## 10. 原子性与失败一致性

所有应用命令继续遵循：

1. 从当前快照深拷贝得到 next；
2. 在 next 上完成全部事实修改；
3. 调用一次 `DataStore.replace(next)`；
4. 仅 replace 成功后交换 `this.snapshot`。

settlement、undo、import、settings update 和首次迁移都用这一模式。失败注入测试至少覆盖：

- settle 写入失败：Session 仍是 ended，奖励/投影未改变；
- undo 写入失败：Session 仍 settled，无 reversal；
- import 写入失败：旧快照和旧 settings 保持；
- migration 写回失败：存储仍为 v1，应用显示可恢复错误；
- localStorage stringify/setItem 失败；
- SQLite 每个事务步骤失败和 commit 失败。

## 11. 错误与恢复体验

定义稳定错误类别，不把底层堆栈直接展示给用户：

- `UnsupportedSchemaVersionError`：备份/数据库版本过新；
- `MigrationError`：包含 from/to/step，不包含用户数据；
- `PersistedDataValidationError`：指出字段路径；
- `PersistenceWriteError`：说明旧数据仍保留，可重试/导出；
- `ImportValidationError`：导入未执行。

初始化失败时，当前 `App` 不得继续显示永久“正在打开”。新增最小恢复页：错误摘要、重试；当事实可完整验证时额外提供“导出可恢复数据”。该导出必须按第 7 节白名单重建，非法 settings 重置为默认值并提示用户，绝不输出原始未知对象。不得提供“自动清库修复”。

日志只记录错误类别、schema from/to 和步骤名；不记录完整 snapshot、用户文本或秘密。

## 12. 建议文件边界

```text
src/
  modules/settings/
    types.ts
    settings.ts
    settings.test.ts
  app/
    snapshotTypes.ts
    migrations/
      types.ts
      v1ToV2.ts
      migrationRunner.ts
      migrationRunner.test.ts
    importValidation.ts
    importValidation.test.ts
  adapters/
    sqlite/
      sqliteStore.ts
      snapshotWriter.ts
      snapshotWriter.test.ts
  test/fixtures/exports/
    v1-empty.json
    v1-typical.json
    v1-boundary.json
    v2-typical.json
```

不新增 `adapters/settings`：非秘密 settings 与事实快照同事务保存。未来 SecretStore 是独立端口，不得复用本模块。

## 13. 测试矩阵

### 13.1 纯单元

- settings 默认值每次返回独立对象；所有枚举/布尔边界；
- v1 empty/typical/boundary → v2，事实逐字段不变、settings 为默认；
- runner 的未知版本、缺步、重复步、步骤抛错、输入不变；
- v2 当前快照再次运行迁移不写回；
- v1/v2 envelope 校验、秘密键拒绝、坏 JSON、未来版本；
- preview counts/active-session/settings 摘要；
- 重复导入无重复事实或奖励。

### 13.2 DataStore 与应用契约

- Memory/LocalStorage 共享 persisted v1 load 与 current v2 replace 契约；
- MvpApplication 首次启动空库写 v2；v1 启动迁移一次；v2 启动不写；
- settle/undo/import/settings/migration 的 fail-on-replace 保持内存/持久一致；
- localStorage 仍从原 key 读取 v1，迁移后原 key 内容变为 v2。

### 13.3 SQLite

- snapshotWriter 对每个事务步骤失败均 rollback；
- app_meta 缺失、非法、1、2、未来版本；
- 新库与 pre-existing database 缺 app_meta 的分支必须相反：仅经空库证明的新库可初始化 meta=2，既有库必须报错；
- 真实 `998d494` fixture 必须证明打开前为 `native 0 + app_meta 1`，并覆盖 `0→2`；
- DDL upgrade 失败恢复后的 `native 0 + app_meta 1` 与数据写回失败后的 `native 2 + app_meta 1` 均可重复迁移；
- 任意 `native <2 + app_meta 2` 必须在 DDL upgrade 前拒绝；
- v1 DB DDL upgrade 后事实未改变，数据迁移成功才 app_meta=2；
- migration/replace 失败后重新打开仍可读 v1；
- 在 N0 可用设备上运行同一核心契约、强杀重启和真实 `998d494` v1 fixture。

### 13.4 导出安全

- v2 导出含 settings/version，不含 `apiKey`、authorization、headers、password、secret、token；
- fixture 注入秘密配置键会被拒绝且不写库；
- v2 settings 含顶层/嵌套 `apiKey`、token 或未知对象时，恢复导出逐字段重建并使用默认 settings，输出中既没有秘密键也没有秘密值；
- 事实校验失败时不生成恢复文件；
- 用户备注中出现普通单词“token”不被误删或误报。

## 14. N1 验收证据

N1 只有在以下证据齐全时才可独立提交并标记完成：

- 类型检查、全部 Vitest、Playwright、生产构建与 cap sync 通过；
- v1 三类 fixture 迁移测试和 v1/v2 导入测试通过；
- 失败注入证明 migrate/settle/undo/import/settings 不造成内存与存储分叉；
- runtime audit 无生产依赖漏洞；
- secret scan 证明 SQLite snapshot 与 v2 导出类型均无秘密字段；
- code-review 与 simplify 完成并记录；
- N0 设备恢复后补跑 SQLite 原生契约；若设备仍不可用，N1 可以保留实现为待原生补证，但不得用 Memory/浏览器结果声称 SQLite 原生验证完成。
