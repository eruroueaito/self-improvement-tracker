/**
 * 模块名称：本地策略设置面板
 * 职责描述：编辑主题、动效、触觉、通知与 AI 非秘密策略
 * 输入/输出：接收当前 AppSettings，向应用门面提交完整的下一份设置
 * 依赖关系：React 事件类型与 settings 领域类型
 * 注意事项：控件只保存本地策略，不请求系统权限、不持有凭据、不发起网络请求
 */
import type { ChangeEvent } from 'react';
import type { AppSettings } from '../../modules/settings/settings';

export function SettingsPanel(props: {
  settings: AppSettings;
  busy: boolean;
  onChange: (settings: AppSettings) => Promise<void>;
}) {
  const update = (settings: AppSettings): void => {
    void props.onChange(settings);
  };
  const updateBoolean = (key: 'hapticsEnabled' | 'notificationsEnabled') =>
    (event: ChangeEvent<HTMLInputElement>): void => update({
      ...props.settings,
      [key]: event.target.checked,
    });

  return (
    <fieldset className="settings-panel" disabled={props.busy}>
      <legend>偏好设置</legend>
      <div className="settings-grid">
        <label>主题
          <select value={props.settings.theme} onChange={(event) => update({ ...props.settings, theme: event.target.value as AppSettings['theme'] })}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label>动态效果
          <select value={props.settings.motion} onChange={(event) => update({ ...props.settings, motion: event.target.value as AppSettings['motion'] })}>
            <option value="system">跟随系统</option>
            <option value="reduced">减少动态</option>
            <option value="none">关闭动态</option>
          </select>
        </label>
      </div>
      <label className="toggle"><input type="checkbox" checked={props.settings.hapticsEnabled} onChange={updateBoolean('hapticsEnabled')} />启用触觉策略</label>
      <label className="toggle"><input type="checkbox" checked={props.settings.notificationsEnabled} onChange={updateBoolean('notificationsEnabled')} />允许新的倒计时通知</label>
      <label className="toggle"><input type="checkbox" checked={props.settings.ai.enabled} onChange={(event) => update({
        ...props.settings,
        ai: { ...props.settings.ai, enabled: event.target.checked },
      })} />启用 AI 功能策略（不含 API 密钥）</label>
      <label className="toggle"><input type="checkbox" checked={props.settings.ai.historyEnabled} onChange={(event) => update({
        ...props.settings,
        ai: { ...props.settings.ai, historyEnabled: event.target.checked },
      })} />允许 AI 使用本地历史策略</label>
      <small>这些开关只保存在本机。AI 默认关闭，本阶段不会连接模型或请求额外权限。</small>
    </fieldset>
  );
}
