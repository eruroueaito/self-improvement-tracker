/**
 * 模块名称：AI GoalDraft 面板
 * 职责描述：承载主动生成、取消、临时可编辑草稿和显式本地确认
 * 输入/输出：接收窄应用回调；输出经 aiDraftMapping 复验的 GoalInput 与 1–5 ActivityInput
 * 依赖关系：React、MvpApplication GoalDraft outcome、AI 草稿映射、领域输入类型
 * 注意事项：输入/草稿只在组件内存中；卸载或取消会 abort，未经确认绝不写正式 Goal/Activity
 */
import { useEffect, useRef, useState } from 'react';
import type { GenerateAiGoalDraftResult } from '../../app/mvpApplication';
import type { AiActivityDraft } from '../../modules/ai/goalDraftSchema';
import type { ActivityInput, GoalInput } from '../../modules/goals/types';
import {
  createEditableAiGoalDraft,
  mapEditableAiGoalDraft,
  type EditableAiGoalDraft,
} from './aiDraftMapping';

const errorLabels: Record<string, string> = {
  disabled: 'AI GoalDraft 当前已关闭，请使用手动创建或前往设置。',
  'not-configured': '当前 Provider 或 endpoint-bound 凭据未配置，请先前往设置。',
  'invalid-config': 'Provider 设置或输入无效。',
  'secret-store': '安全凭据暂时不可用。',
  auth: '凭据无效或没有权限。',
  'rate-limited': '请求过于频繁或额度受限，不会自动重试。',
  timeout: '请求超时，输入已保留。',
  cancelled: '生成已取消。',
  unavailable: 'Provider 暂时不可用。',
  server: 'Provider 服务错误。',
  'response-too-large': '模型响应超过安全上限。',
  'invalid-response': '模型结果无法通过严格本地校验。',
  storage: '本地存储暂时不可用。',
};

const newActivity = (): AiActivityDraft => ({
  title: '', description: '', minimumMinutes: 10, maximumMinutes: 30, energyCost: 2,
  contexts: [], minimumRestHours: null, suggestedCadenceDays: null,
});

export function AiGoalDraftPanel(props: {
  endpointHost: string;
  model: string;
  busy: boolean;
  onGenerate: (input: string, signal: AbortSignal) => Promise<GenerateAiGoalDraftResult>;
  onConfirm: (goal: GoalInput, activities: ActivityInput[]) => Promise<boolean>;
}) {
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<EditableAiGoalDraft | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestToken = useRef(0);

  useEffect(() => () => {
    requestToken.current += 1;
    controller.current?.abort();
  }, []);

  const generate = async (): Promise<void> => {
    if (requesting || props.busy) return;
    const currentToken = ++requestToken.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setRequesting(true);
    setMessage(null);
    try {
      const outcome = await props.onGenerate(input, nextController.signal);
      if (currentToken !== requestToken.current) return;
      if (outcome.ok) {
        setDraft(createEditableAiGoalDraft(outcome.draft));
        setMessage(outcome.historyWarning ? `草稿已生成；历史记录警告：${outcome.historyWarning}` : '草稿已生成，请检查并编辑后确认。');
      } else if (outcome.error !== 'cancelled') {
        setMessage(errorLabels[outcome.error] ?? '生成失败，输入已保留。');
      }
    } catch (error) {
      if (currentToken === requestToken.current && !(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage('生成失败，输入已保留。');
      }
    } finally {
      if (currentToken === requestToken.current) {
        controller.current = null;
        setRequesting(false);
      }
    }
  };
  const cancel = (): void => {
    requestToken.current += 1;
    controller.current?.abort();
    controller.current = null;
    setRequesting(false);
    setMessage('生成已取消，输入已保留。');
  };
  const updateActivity = (index: number, changes: Partial<AiActivityDraft>): void => {
    setDraft((current) => current ? {
      ...current,
      suggestedActivities: current.suggestedActivities.map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, ...changes } : activity),
    } : null);
  };
  const updateProgress = (changes: Partial<{ baseline: number | null; target: number | null; unit: string | null }>): void => {
    setDraft((current) => current && current.feedbackModel.type === 'progress' ? {
      ...current,
      feedbackModel: { ...current.feedbackModel, ...changes },
    } : current);
  };
  const confirm = async (): Promise<void> => {
    if (!draft || props.busy || requesting) return;
    try {
      const mapped = mapEditableAiGoalDraft(draft);
      if (await props.onConfirm(mapped.goal, mapped.activities)) {
        setDraft(null);
        setInput('');
        setMessage('目标和活动已保存到本机。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '草稿无法通过本地校验');
    }
  };

  return (
    <section className="card ai-goal-draft" aria-labelledby="ai-goal-draft-title">
      <h3 id="ai-goal-draft-title">AI 辅助起草（可选）</h3>
      <p className="privacy-note">只有点击生成后，下方输入才会离开设备发送到 <b>{props.endpointHost}</b>，模型 <b>{props.model || '未配置'}</b>。不发送本地数据库、设备、伙伴、奖励、Roll、Session 或历史。</p>
      <label>用自然语言描述目标
        <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={10_000} placeholder="例如：我想在三个月内建立稳定阅读习惯" />
      </label>
      <div className="actions">
        <button type="button" className="button secondary" disabled={props.busy || requesting || input.trim().length === 0} onClick={() => void generate()}>生成可编辑草稿</button>
        {requesting && <button type="button" onClick={cancel}>取消生成</button>}
      </div>
      {message && <p role="status">{message}</p>}

      {draft && (
        <div className="ai-draft-editor">
          {draft.clarificationNeeded && (
            <section className="message warning">
              <b>需要澄清</b>
              <ul>{draft.clarificationQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
              <label className="toggle"><input type="checkbox" checked={draft.clarificationResolved} onChange={(event) => setDraft({ ...draft, clarificationResolved: event.target.checked })} />我已在草稿中补全并确认这些信息</label>
            </section>
          )}
          <div className="form-grid">
            <label>草稿目标名称<input value={draft.title} maxLength={80} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>重要性<select value={draft.importanceSuggestion} onChange={(event) => setDraft({ ...draft, importanceSuggestion: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>默认精力<select value={draft.defaultEnergyCost} onChange={(event) => setDraft({ ...draft, defaultEnergyCost: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>目标节奏（天，可空）<input type="number" min="0.01" step="any" value={draft.desiredCadenceDays ?? ''} onChange={(event) => setDraft({ ...draft, desiredCadenceDays: event.target.value === '' ? null : Number(event.target.value) })} /></label>
            <label>目标最短休息（小时）<input type="number" min="0" step="any" value={draft.minimumRestHours} onChange={(event) => setDraft({ ...draft, minimumRestHours: Number(event.target.value) })} /></label>
            <label className="wide">目标说明<textarea value={draft.description} maxLength={2_000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label>反馈方式<select value={draft.feedbackModel.type} onChange={(event) => {
              const type = event.target.value;
              setDraft({
                ...draft,
                feedbackModel: type === 'progress'
                  ? { type: 'progress', baseline: null, target: null, unit: null }
                  : type === 'cumulative'
                    ? { type: 'cumulative', unit: 'minutes' }
                    : { type: 'experience' },
              });
            }}><option value="cumulative">累计</option><option value="progress">数值进度</option><option value="experience">经验值</option></select></label>
            {draft.feedbackModel.type === 'cumulative' && <label>累计单位<select value={draft.feedbackModel.unit} onChange={(event) => setDraft({ ...draft, feedbackModel: { type: 'cumulative', unit: event.target.value as 'minutes' | 'times' } })}><option value="minutes">分钟</option><option value="times">次数</option></select></label>}
            {draft.feedbackModel.type === 'progress' && <>
              <label>当前值<input type="number" step="any" value={draft.feedbackModel.baseline ?? ''} onChange={(event) => updateProgress({ baseline: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              <label>目标值<input type="number" step="any" value={draft.feedbackModel.target ?? ''} onChange={(event) => updateProgress({ target: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              <label>单位<input value={draft.feedbackModel.unit ?? ''} maxLength={24} onChange={(event) => updateProgress({ unit: event.target.value === '' ? null : event.target.value })} /></label>
            </>}
          </div>

          <h4>建议活动（{draft.suggestedActivities.length}/5）</h4>
          {draft.suggestedActivities.map((activity, index) => (
            <section className="ai-activity-editor" key={index}>
              <div className="form-grid">
                <label>活动 {index + 1} 名称<input value={activity.title} maxLength={80} onChange={(event) => updateActivity(index, { title: event.target.value })} /></label>
                <label>精力<select value={activity.energyCost} onChange={(event) => updateActivity(index, { energyCost: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>最短分钟<input type="number" min={1} max={480} value={activity.minimumMinutes} onChange={(event) => updateActivity(index, { minimumMinutes: Number(event.target.value) })} /></label>
                <label>最长分钟<input type="number" min={1} max={480} value={activity.maximumMinutes} onChange={(event) => updateActivity(index, { maximumMinutes: Number(event.target.value) })} /></label>
                <label className="wide">活动说明<textarea value={activity.description} maxLength={2_000} onChange={(event) => updateActivity(index, { description: event.target.value })} /></label>
                <label className="wide">场景（逗号分隔）<input value={activity.contexts.join(', ')} onChange={(event) => updateActivity(index, { contexts: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
                <label>活动节奏（天，可空）<input type="number" min="0.01" step="any" value={activity.suggestedCadenceDays ?? ''} onChange={(event) => updateActivity(index, { suggestedCadenceDays: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                <label>活动最短休息（小时，可空）<input type="number" min="0" step="any" value={activity.minimumRestHours ?? ''} onChange={(event) => updateActivity(index, { minimumRestHours: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              </div>
              <button type="button" disabled={draft.suggestedActivities.length === 1} onClick={() => setDraft({ ...draft, suggestedActivities: draft.suggestedActivities.filter((_, activityIndex) => activityIndex !== index) })}>删除活动 {index + 1}</button>
            </section>
          ))}
          <div className="actions">
            <button type="button" disabled={draft.suggestedActivities.length >= 5} onClick={() => setDraft({ ...draft, suggestedActivities: [...draft.suggestedActivities, newActivity()] })}>添加活动</button>
            <button type="button" className="button primary" disabled={props.busy || requesting} onClick={() => void confirm()}>确认并保存到本机</button>
            <button type="button" disabled={props.busy || requesting} onClick={() => { setDraft(null); setMessage('草稿已放弃，未写入本机事实。'); }}>放弃草稿</button>
          </div>
        </div>
      )}
    </section>
  );
}
