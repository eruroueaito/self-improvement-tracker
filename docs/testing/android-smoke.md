# N0 Android 原生冒烟记录

状态：固定 SDK 与 APK 已完成；等待 API 36 模拟器原生冒烟后填写最终结果。

## 固定环境

| 项目 | 要求 | 实际证据 |
|---|---|---|
| Node | 24.14.0 | 本地环境验证通过 |
| npm | 11.12.1 | `.tools/npm` 环境验证通过 |
| JDK | 本地 Oracle 21.0.6+8；CI Temurin 21.0.6+7 | 本地 Oracle `21.0.6+8-LTS-188` |
| Android command-line tools | 15859902 | `D:\Android\Sdk\cmdline-tools\latest` |
| Android Platform | 36 | Platform 36 r02，环境验证通过 |
| Build Tools | 35.0.0 | 环境验证通过 |
| Gradle | 8.14.3，SHA 已固定 | `.tools/gradle/gradle-8.14.3` |
| Runtime | API 33+ 模拟器或真机 | API 36 AVD 已创建；当前宿主 WHPX 不可用，尚未形成运行证据 |
| SDK License | 安装器显式 `-AcceptSdkLicense`；CI 保存 sdkmanager license step | 本地以显式开关接受；CI 脚本校验 sdkmanager 退出码 |

## 构建与安装

- [x] `npm ci`、build 和 `cap sync android`
- [x] `assembleDebug`
- [x] APK SHA-256：`5ae8393023016f1462af85a825b927f43b0e9e2968d0bafd1cee90fb03ddecfe`
- [x] 最终 APK 无 `INTERNET`、`USE_BIOMETRIC`、`USE_FINGERPRINT` 权限
- [ ] `adb install -r`
- [ ] 冷启动无崩溃

### 可重复证据采集

设备进入 `adb devices -l` 的 `device` 状态后，先运行：

```powershell
npm run verify:n0:android-smoke -- -CheckpointName bootstrap
```

脚本只选择唯一 ready 设备；多设备时必须加 `-Serial <serial>`。它会校验 API 33+、安装 APK、比对本地 APK 与设备 `base.apk` 的 SHA-256、冷启动、确认进程存活和 `INTERNET` 权限为 denied，并把设备/API、通知权限、飞行模式、Wi-Fi、SQLite 文件列表、应用 alarm 与错误日志写入被 Git 忽略的 `output/android-smoke/<timestamp>-<serial>-<checkpoint>/`。

完成下面的人工闭环后，用不清数据的重启检查点取证：

```powershell
npm run verify:n0:android-smoke -- -SkipInstall -Restart -CheckpointName after-closed-loop
```

通知允许/拒绝、Doze、导出和导入分别在操作后用不同 `-CheckpointName` 再采集一次。脚本不会把“安装成功”冒充 UI 通过，也不会清除应用数据；每项体验仍必须在本文件勾选并填写实际观察。

runner 自身的设备选择、API、APK 哈希、SQLite、网络权限和崩溃分支可离线复验：

```powershell
npm run test:n0:android-smoke-runner
```

该命令使用 fake ADB，输出目录以 `TEST-ONLY-` 开头，`evidence.md` 固定写入 `evidence_kind: test-double-not-native`，输出只能证明脚本编排行为，**不构成**模拟器或真机原生证据。常规 smoke 命令不接受未显式授权的 ADB 注入。

## SQLite 与离线闭环

- [ ] 创建 Goal 和 ActivityTemplate
- [ ] Goal Catalog 在小屏上保持紧凑，详情页可返回且底部 Roll 始终一跳可达
- [ ] 同一 Goal 新增、编辑、归档和恢复多个 Activity，刷新/重启后字段保持
- [ ] 归档最后一个 Activity 后，Catalog、详情和 Roll 都显示可操作修复提示
- [ ] progress、累计次数、累计分钟和 experience 在结算/撤销后显示一致
- [ ] Goal 详情最近五条记录与 History 初始 Goal 筛选一致
- [ ] Roll 返回本地候选
- [ ] Flowtime 结束、手动结算、奖励写入
- [ ] 撤销后投影一致
- [ ] force-stop / 重启后数据仍在
- [ ] 飞行模式下完整闭环可用

## Countdown 与通知

- [ ] API 33+ 允许通知权限时成功排程
- [ ] 后台/锁屏到期时显示通知
- [ ] Session 提前结束后通知取消
- [ ] 拒绝通知权限时无崩溃，Session 按绝对时间恢复
- [ ] Doze/无精确闹钟权限时只允许提醒延迟，不改变 Session 完成事实

## 文件导入导出

- [ ] 导出 JSON 写入 cache 并打开系统分享面板
- [ ] 导出内容不含秘密
- [ ] 清空后从 JSON 导入，数据和奖励投影恢复

## 网络边界

- [x] merged debug manifest 不含 INTERNET 权限
- [x] CSP 与静态网络扫描通过
- [x] 在线运行 Web 壳时没有本机测试源之外的请求（Playwright Edge 交叉验证）

## 结论

本地 debug APK 已重新构建并以 Android Debug 证书完成 v2 签名；精确环境、14 项单测、0 runtime 漏洞、生产构建、Capacitor 同步、Edge E2E 和网络边界均通过。API 36 AVD 已创建，但当前宿主的 emulator `-accel-check` 返回 6；N0 尚未完成，需启用 Windows Hypervisor Platform 并重启，或连接物理 Android 设备后补齐安装/原生闭环/通知/导入导出证据。远端 CI 还需在推送后形成运行记录。
