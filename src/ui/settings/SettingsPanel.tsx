/**
 * 模块名称：本地策略设置面板
 * 职责描述：编辑主题、动效、触觉、通知与 AI 非秘密策略
 * 输入/输出：接收当前 AppSettings，向应用门面提交完整的下一份设置
 * 依赖关系：React 事件类型与 settings 领域类型
 * 注意事项：控件只保存本地策略，不请求系统权限、不持有凭据、不发起网络请求
 */
import type { ChangeEvent } from 'react';
import type { AiConnectionTestOutcome, TestAiConnectionInput } from '../../app/aiGoalDraftService';
import type { ProviderCredentials } from '../../modules/ai/credentials';
import type { AppSettings } from '../../modules/settings/settings';
import { AiProviderSettings } from './AiProviderSettings';

export function SettingsPanel(props: {
  settings: AppSettings;
  busy: boolean;
  onChange: (settings: AppSettings) => Promise<boolean>;
  aiActions: {
    credentialsConfigured: boolean;
    historyCount: number;
    onSaveSettings: (settings: AppSettings) => Promise<boolean>;
    onSaveCredentials: (credentials: ProviderCredentials) => Promise<boolean>;
    onDeleteCredentials: () => Promise<boolean>;
    onTestConnection: (input: TestAiConnectionInput) => Promise<AiConnectionTestOutcome>;
    onClearHistory: () => Promise<boolean>;
  };
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
      <label className="toggle"><input type="checkbox" checked={props.settings.ai.goalDraftEnabled} onChange={(event) => update({
        ...props.settings,
        ai: { ...props.settings.ai, goalDraftEnabled: event.target.checked },
      })} />允许主动生成 GoalDraft</label>
      <label className="toggle"><input type="checkbox" checked={props.settings.ai.historyEnabled} onChange={(event) => update({
        ...props.settings,
        ai: { ...props.settings.ai, historyEnabled: event.target.checked },
      })} />保存本地 AI 调用历史（可能包含目标原文）</label>
      <small>这些开关只保存在本机。AI 默认关闭，手动目标流程始终可用。</small>
      <AiProviderSettings
        settings={props.settings}
        busy={props.busy}
        {...props.aiActions}
      />
    </fieldset>
  );
}
