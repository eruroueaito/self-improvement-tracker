/**
 * 模块名称：应用依赖装配
 * 职责描述：根据运行平台选择 SQLite 或浏览器存储，并创建唯一 MvpApplication 实例
 * 输入/输出：无输入，输出已装配但尚未 initialize 的应用门面
 * 依赖关系：Capacitor、应用门面及所有平台适配器
 * 注意事项：这是产品代码中唯一引用具体数据存储实现的位置
 */
import { Capacitor } from '@capacitor/core';
import { CryptoIdGenerator, SystemClock } from '../adapters/clock/systemServices';
import { LocalStorageStore } from '../adapters/browser/localStorageStore';
import { BrowserExportService, NativeExportService } from '../adapters/files/exportServices';
import { NativeNotificationService, NoopNotificationService } from '../adapters/notifications/notificationServices';
import { SqliteStore } from '../adapters/sqlite/sqliteStore';
import { MvpApplication } from './mvpApplication';

export const createMvpApplication = (): MvpApplication => {
  const native = Capacitor.isNativePlatform();
  return new MvpApplication(
    native ? new SqliteStore() : new LocalStorageStore(),
    new SystemClock(),
    new CryptoIdGenerator(),
    native ? new NativeNotificationService() : new NoopNotificationService(),
    native ? new NativeExportService() : new BrowserExportService(),
  );
};
