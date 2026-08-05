# 原创 CSS 像素伙伴资产登记

- 创建日期：2026-08-05
- 许可：随仓库按 MIT License 发布
- 来源：项目内原创 CSS/DOM 代码
- 第三方素材：无
- 远程图片、字体、sprite、Canvas：无

## 设计构成

伙伴由 `CompanionAvatar.tsx` 的单一语义 DOM 骨架与 `styles.css` 的本地矩形、圆角、描边和阶梯动画组成。三个阶段共用身体、叶冠、眼睛、嘴、手脚、星光与休息文字节点，只通过稳定 class 改变尺寸和静态姿势。

阶段：`seed`、`sprout`、`companion`。

状态：`idle`（安静陪伴）、`working`（正在专注）、`celebrating`（刚刚完成）、`sleeping`（安静休息）。

完整矩阵共 12 组。每组均有中文可访问名称和不依赖动画的眼睛/手臂/星光/`Z` 静态差异。

## 房间解锁

- 50 历史最高 XP：`desk-book`（桌边小书）
- 150 历史最高 XP：`window-plant`（窗边小植株）
- 300 历史最高 XP：`photo-string`（照片挂绳）

解锁只由 RewardLedger 历史最高值派生，不单独持久化，也不进入 Roll。

## 动效边界

`system` 只允许轻微眨眼和不超过 2 秒的一次庆祝；`reduced`、`none` 与 `prefers-reduced-motion: reduce` 均保留相同静态含义并关闭伙伴动画。所有视觉元素均设置 `pointer-events: none`，不能遮挡或拦截核心操作。
