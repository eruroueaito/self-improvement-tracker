/**
 * 模块名称：Goal Catalog 页面
 * 职责描述：快速创建 Goal 与首 Activity，简洁浏览 Goal，并承载本地数据和设置入口
 * 输入/输出：接收应用快照与命令回调，输出紧凑 Catalog 和显式详情导航
 * 依赖关系：React、应用选择器、GoalForm、SettingsPanel
 * 注意事项：Catalog 不直接编辑状态或 Activity；导入必须预览确认，清空必须二次确认
 */
import { useRef, useState, type ChangeEvent } from 'react';
import type { ImportPreview } from '../../app/importExport';
import type { AppSnapshot } from '../../app/ports';
import { selectGoalCatalogItems } from '../../app/selectors';
import type { ActivityDraft, GoalDraft } from '../../modules/goals/types';
import type { AppSettings } from '../../modules/settings/settings';
import { SettingsPanel } from '../settings/SettingsPanel';
import { GoalForm } from './GoalForm';

export function GoalsScreen(props: {
  snapshot: AppSnapshot;
  busy: boolean;
  onCreate: (goal: GoalDraft, activity: ActivityDraft) => Promise<boolean>;
  onOpenGoal: (goalId: string) => void;
  onExport: () => Promise<void>;
  onPreviewImport: (contents: string) => ImportPreview;
  onConfirmImport: (contents: string) => Promise<boolean>;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [createOpen, setCreateOpen] = useState(props.snapshot.goals.length === 0);
  const [pendingImport, setPendingImport] = useState<{ contents: string; preview: ImportPreview } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const catalogItems = selectGoalCatalogItems(props.snapshot);

  const importFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const contents = await file.text();
        setPendingImport({ contents, preview: props.onPreviewImport(contents) });
        setImportError(null);
      } catch (cause) {
        setPendingImport(null);
        setImportError(cause instanceof Error ? cause.message : '无法预览导入文件');
      }
    }
    event.target.value = '';
  };

  const confirmImport = async (): Promise<void> => {
    if (!pendingImport) return;
    if (await props.onConfirmImport(pendingImport.contents)) {
      setPendingImport(null);
      setImportError(null);
    }
  };

  return (
    <div className="stack">
      <section className="section-heading">
        <div><h2>长期方向</h2><p>保持目标简洁，具体行动在详情中管理。</p></div>
        <button className="button secondary" onClick={() => setCreateOpen((open) => !open)}>{createOpen ? '收起' : '新建目标'}</button>
      </section>

      {createOpen && (
        <GoalForm
          mode="create"
          busy={props.busy}
          onSubmit={props.onCreate}
          onCancel={() => setCreateOpen(false)}
          onDone={() => setCreateOpen(false)}
        />
      )}

      <div className="goal-list">
        {catalogItems.length === 0 && !createOpen && <div className="empty">还没有目标。创建一个小而明确的起点吧。</div>}
        {catalogItems.map((item) => (
          <article className="card goal-card" key={item.goal.id}>
            <div>
              <span className={`status ${item.goal.status}`}>{item.goal.status === 'active' ? '进行中' : item.goal.status === 'paused' ? '已暂停' : '已归档'}</span>
              <h3>{item.goal.title}</h3>
              <p className="feedback">{item.feedback.primary}</p>
              <small>{item.activeActivityCount} 个可用活动</small>
              {item.needsActivity && <p className="needs-activity">需要活动</p>}
            </div>
            <button onClick={() => props.onOpenGoal(item.goal.id)}>查看详情</button>
          </article>
        ))}
      </div>

      <details className="card settings">
        <summary>本地数据与设置</summary>
        <SettingsPanel settings={props.snapshot.settings} busy={props.busy} onChange={props.onSettingsChange} />
        <hr />
        <p>导出包含全部目标、专注、历史、奖励和非秘密设置，不包含密钥。</p>
        <div className="actions">
          <button disabled={props.busy} onClick={() => void props.onExport()}>导出 JSON</button>
          <button disabled={props.busy} onClick={() => fileRef.current?.click()}>导入 JSON</button>
          <button disabled={props.busy} className="danger" onClick={() => void props.onClear()}>清空全部本地数据</button>
          <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event)} />
        </div>
        {importError && <div className="message error import-message" role="alert">{importError}</div>}
        {pendingImport && (
          <section className="import-preview" aria-labelledby="import-preview-title">
            <h3 id="import-preview-title">确认覆盖本机数据</h3>
            <p className="import-warning">导入会全量替换当前目标、专注历史、奖励和设置，无法合并。</p>
            <dl>
              <div><dt>来源版本</dt><dd>v{pendingImport.preview.sourceVersion}</dd></div>
              <div><dt>目标 / 活动</dt><dd>{pendingImport.preview.goalCount} / {pendingImport.preview.activityCount}</dd></div>
              <div><dt>专注 / 奖励</dt><dd>{pendingImport.preview.sessionCount} / {pendingImport.preview.rewardCount}</dd></div>
              <div><dt>进行中专注</dt><dd>{pendingImport.preview.hasActiveSession ? '有，将恢复' : '无'}</dd></div>
              <div><dt>主题 / 动效</dt><dd>{pendingImport.preview.settings.theme} / {pendingImport.preview.settings.motion}</dd></div>
              <div><dt>AI / AI 历史</dt><dd>{pendingImport.preview.settings.ai.enabled ? '开' : '关'} / {pendingImport.preview.settings.ai.historyEnabled ? '开' : '关'}</dd></div>
            </dl>
            <div className="actions">
              <button disabled={props.busy} className="button primary" onClick={() => void confirmImport()}>确认导入并覆盖</button>
              <button disabled={props.busy} onClick={() => { setPendingImport(null); setImportError(null); }}>取消</button>
            </div>
          </section>
        )}
      </details>
    </div>
  );
}
