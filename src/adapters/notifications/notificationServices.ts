/**
 * 模块名称：倒计时通知适配器
 * 职责描述：在 Android 安排尽力本地通知，并为浏览器提供无副作用降级
 * 输入/输出：接收 Session ID、活动名和到期时间，安排或取消通知
 * 依赖关系：Capacitor Local Notifications
 * 注意事项：通知从不作为 Session 完成的事实来源
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import type { NotificationPort } from '../../app/ports';

const notificationId = (sessionId: string): number => {
  let hash = 0;
  for (const character of sessionId) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) || 1;
};

export class NativeNotificationService implements NotificationPort {
  async scheduleCountdown(sessionId: string, activityTitle: string, dueAt: number): Promise<void> {
    const permission = await LocalNotifications.checkPermissions();
    const result = permission.display === 'granted' ? permission : await LocalNotifications.requestPermissions();
    if (result.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId(sessionId),
        title: '专注时间到了',
        body: activityTitle,
        schedule: { at: new Date(dueAt), allowWhileIdle: true },
      }],
    });
  }

  async cancelCountdown(sessionId: string): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(sessionId) }] });
  }
}

export class NoopNotificationService implements NotificationPort {
  async scheduleCountdown(): Promise<void> {}
  async cancelCountdown(): Promise<void> {}
}
