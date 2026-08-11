# N3.1 伙伴中性占位实施计划

> 状态：已完成（2026-08-11）
> 设计依据：`docs/superpowers/specs/2026-08-11-pixel-first-final-native-acceptance-design.md`
> 范围边界：只替换伙伴表现层；保留 ActivityStateEngine、stage/mood、celebration、unlock、公平性、reduced-motion、可访问语义和持久数据。

## 1. 完成定义

N3.1 只有在以下条件全部成立时完成：

1. 运行时不再渲染像素身体、叶冠、眼睛、手脚、星光、Z、光晕、房间物品或装饰动画。
2. `CompanionAvatar` 仍暴露 3 stage × 4 mood、compact/expanded、motion class、`data-stage`、`data-mood`、稳定 role/aria label 和可见状态文字。
3. `ActivityStateEngine`、selectors、奖励投影、公平性、解锁与庆祝时限测试保持原样通过。
4. `?companion-matrix=1` 继续渲染 12 个真实组件，但只验收占位语义、状态组合、无装饰节点和无 animation。
5. TypeScript、Vitest、N3 E2E、production build、网络边界、Capacitor sync、Android debug build 与 `git diff --check` 通过。
6. Pixel/API31 可用时运行窄 development smoke；设备不可用不阻止 N3.1，但观察到的缺陷必须修复。正式设备结果只在 N6 记录。

## 2. W1：组件契约先红后绿

### 文件

- 修改 `src/ui/companion/CompanionAvatar.test.tsx`
- 修改 `src/ui/companion/CompanionAvatar.tsx`

### 步骤

1. 把 12 组合测试改为先要求：
   - 唯一 `[data-part="placeholder"]`；
   - 可见“伙伴占位”与 stage/mood 文本；
   - 保留原稳定 class/data/aria 契约；
   - 历史 13 个美术 `data-part` 全部不存在。
2. 单独验证 `system/reduced/none` 只保留兼容 class，不产生任何装饰 animation。
3. 将 `CompanionAvatar` 简化为单一中性占位容器和语义文本，不保留隐藏美术 DOM。
4. 更新模块头注释，说明这是临时占位表现而非最终美术。

### 验证

```powershell
npx vitest run src/ui/companion/CompanionAvatar.test.tsx
npm run typecheck
```

## 3. W2：移除房间装饰与 CSS 动画

### 文件

- 修改 `src/ui/roll/RollScreen.tsx`
- 修改 `src/ui/companion/CompanionMatrixScreen.tsx`
- 修改 `src/ui/styles.css`
- 修改受影响的 App/组件测试

### 步骤

1. 从 hero 场景删除 room unlock 装饰 DOM；unlock projection 和 label selector 保留，不删除领域逻辑。
2. 删除 `.companion-body/leaf/eyes/arms/...`、`.room-unlock*`、阶段体型、mood 姿势、keyframes 和 reduced-motion 后代补丁。
3. 新增最小中性占位样式：边框、纯色背景、稳定尺寸、清晰文字；stage/mood 只能通过文本/属性表达，不暗示最终造型。
4. matrix 页面文案从 “LOCAL CSS ACCEPTANCE” 改为“逻辑与可访问性占位验收”，不再称视觉矩阵。
5. 保留 mobile layout，确保 compact/expanded 在 Pixel 3 XL 宽度不溢出。

### 验证

```powershell
npm run typecheck
npx vitest run src/ui/companion/CompanionAvatar.test.tsx src/app/companionSelectors.test.ts src/modules/companion/activityStateEngine.test.ts
rg -n "companion-(body|leaf|eyes|mouth|arms|legs|stars|sleep-z|blush|glow)|unlock-(desk-book|window-plant|photo-string)|@keyframes companion" src
```

最后一条必须零命中；若保留历史测试文字，需逐项确认不在产品 DOM/CSS。

## 4. W3：浏览器与 production 验收

### 文件

- 修改 `e2e/n3-companion.spec.ts`
- 必要时修改 production matrix 相关 Playwright 配置/测试，但不新增产品后门

### 步骤

1. 保留结算→celebrating→撤销/2 秒退出的逻辑断言。
2. 把眼睛/星光 computed-style 断言替换为：
   - 12 个 placeholder 全部存在；
   - stage/mood pair 唯一；
   - 无历史装饰 `data-part`；
   - placeholder 与所有后代 `animation-name: none`；
   - 无远程网络请求和持久写入。
3. 验证 reduced/none 设置刷新后仍保留状态文字和兼容 class。

### 验证

```powershell
npx playwright test e2e/n3-companion.spec.ts
npm run build
npm run verify:n0:network
npx cap sync android
```

## 5. W4：阶段收口

1. 运行完整固定 Node 24/npm 11.12.1 验证链。
2. 执行 code-review，再执行 simplify；修复全部 High/Medium。
3. Pixel 在线时保留数据覆盖安装当前 debug APK，窄验收冷启动、进程/崩溃、compact/expanded 占位与既有数据恢复，记录 `development-smoke`；12 状态和 320px 边界由 production E2E 验证。
4. 更新 `task_plan.md`、`findings.md`、`progress.md`，形成独立 N3.1 产品提交，不混入 N4。

## 6. 提交边界

建议单一可回退提交：

```text
feat: replace companion artwork with neutral placeholder
```

只包含 N3.1 产品/测试文件及对应规划记录；不得包含 N4 依赖、schema 或联网权限。
