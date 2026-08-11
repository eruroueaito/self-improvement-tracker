/**
 * 模块名称：AI Provider 设置
 * 职责描述：分别编辑非秘密 Provider 配置、短生命周期凭据、连接测试和本地 AI 历史操作
 * 输入/输出：接收当前设置/状态与应用门面回调；只在受控 password/header value 中短暂持有秘密
 * 依赖关系：React、AI 设置/凭据类型、AiGoalDraftService 连接测试类型
 * 注意事项：修改 endpoint 后必须先保存非秘密设置再绑定凭据；保存、测试、删除或卸载后不回显秘密
 */
import { useEffect, useMemo, useState } from 'react';
import type { TestAiConnectionInput, AiConnectionTestOutcome } from '../../app/aiGoalDraftService';
import {
  normalizeProviderCredentials,
  type ProviderCredentials,
} from '../../modules/ai/credentials';
import type { AiProviderSettings as AiProviderSettingsValue } from '../../modules/ai/types';
import type { AppSettings } from '../../modules/settings/settings';

type HeaderRow = { id: number; name: string; value: string };

export function AiProviderSettings(props: {
  settings: AppSettings;
  busy: boolean;
  credentialsConfigured: boolean;
  historyCount: number;
  onSaveSettings: (settings: AppSettings) => Promise<boolean>;
  onSaveCredentials: (credentials: ProviderCredentials) => Promise<boolean>;
  onDeleteCredentials: () => Promise<boolean>;
  onTestConnection: (input: TestAiConnectionInput) => Promise<AiConnectionTestOutcome>;
  onClearHistory: () => Promise<boolean>;
}) {
  const [provider, setProvider] = useState<AiProviderSettingsValue>(() => structuredClone(props.settings.ai.provider));
  const [apiKey, setApiKey] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [nextHeaderId, setNextHeaderId] = useState(1);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => setProvider(structuredClone(props.settings.ai.provider)), [props.settings.ai.provider]);

  const providerDirty = JSON.stringify(provider) !== JSON.stringify(props.settings.ai.provider);
  const host = useMemo(() => {
    try { return new URL(provider.baseUrl).host; } catch { return '无效 endpoint'; }
  }, [provider.baseUrl]);

  const clearSecrets = (): void => {
    setApiKey('');
    setHeaders([]);
  };
  const credentialsDraft = (): ProviderCredentials | undefined => {
    const populatedHeaders = headers.filter((row) => row.name.length > 0 || row.value.length > 0);
    if (apiKey.length === 0 && populatedHeaders.length === 0) return undefined;

    const normalizedNames = new Set<string>();
    for (const row of populatedHeaders) {
      const normalizedName = row.name.replace(/[A-Z]/g, (character) => character.toLowerCase());
      if (normalizedNames.has(normalizedName)) throw new Error('Provider header 名大小写不敏感重复');
      normalizedNames.add(normalizedName);
    }
    return normalizeProviderCredentials({
      apiKey,
      customHeaders: Object.fromEntries(populatedHeaders.map((row) => [row.name, row.value])),
    });
  };
  const run = async (action: () => Promise<void>): Promise<void> => {
    if (working || props.busy) return;
    setWorking(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '表单校验失败');
    } finally {
      setWorking(false);
    }
  };

  const saveSettings = (): void => void run(async () => {
    if (await props.onSaveSettings({
      ...props.settings,
      ai: { ...props.settings.ai, provider },
    })) setStatus('Provider 设置已保存');
  });
  const saveCredentials = (): void => void run(async () => {
    const credentials = credentialsDraft();
    if (!credentials) {
      setStatus('请输入 API 密钥或自定义认证 header');
      return;
    }
    if (await props.onSaveCredentials(credentials)) {
      clearSecrets();
      setStatus('凭据已安全保存，不会回显');
    }
  });
  const testConnection = (): void => void run(async () => {
    try {
      const outcome = await props.onTestConnection({
        settings: provider,
        credentials: credentialsDraft(),
        signal: new AbortController().signal,
      });
      setStatus(outcome.ok ? '连接测试成功' : `连接测试失败：${outcome.error}`);
    } finally {
      clearSecrets();
    }
  });

  return (
    <section className="ai-provider-settings" aria-labelledby="ai-provider-title">
      <h4 id="ai-provider-title">AI Provider</h4>
      <p className="privacy-note">目标文本只会在你主动生成或测试时发送到 <b>{host}</b>，模型 <b>{provider.model || '未配置'}</b>。不会发送数据库、设备、伙伴、奖励、Roll、Session 或历史。</p>
      <div className="form-grid">
        <label className="wide">Base URL
          <input value={provider.baseUrl} onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" />
        </label>
        <label>模型 ID
          <input value={provider.model} onChange={(event) => setProvider({ ...provider, model: event.target.value })} maxLength={160} />
        </label>
        <label>请求超时（毫秒）
          <input type="number" min={5_000} max={120_000} step={1_000} value={provider.requestTimeoutMs} onChange={(event) => setProvider({ ...provider, requestTimeoutMs: Number(event.target.value) })} />
        </label>
        <label>结构化输出
          <select value={provider.structuredOutputMode} onChange={(event) => setProvider({ ...provider, structuredOutputMode: event.target.value as AiProviderSettingsValue['structuredOutputMode'] })}>
            <option value="json-schema">JSON Schema（推荐）</option>
            <option value="json-object">JSON Object（兼容模式）</option>
          </select>
        </label>
      </div>
      <div className="actions"><button type="button" disabled={working || props.busy || !providerDirty} onClick={saveSettings}>保存 Provider 设置</button></div>

      <hr />
      <p><b>凭据状态：</b>{props.credentialsConfigured ? '已为当前 endpoint 配置' : '当前 endpoint 未配置'}</p>
      {providerDirty && <p className="message warning">endpoint/model 表单尚未保存。保存凭据前请先保存 Provider 设置；连接测试仍可使用这份表单和一次性凭据。</p>}
      <label>API 密钥
        <input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      {headers.map((row) => (
        <div className="header-row" key={row.id}>
          <label>Header 名<input value={row.name} onChange={(event) => setHeaders((items) => items.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} /></label>
          <label>Header 值<input type="password" autoComplete="off" value={row.value} onChange={(event) => setHeaders((items) => items.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} /></label>
          <button type="button" onClick={() => setHeaders((items) => items.filter((item) => item.id !== row.id))}>删除 Header</button>
        </div>
      ))}
      <div className="actions">
        <button type="button" disabled={working || props.busy || headers.length >= 16} onClick={() => {
          setHeaders((items) => [...items, { id: nextHeaderId, name: '', value: '' }]);
          setNextHeaderId((value) => value + 1);
        }}>添加认证 Header</button>
        <button type="button" disabled={working || props.busy || providerDirty} onClick={saveCredentials}>保存或替换凭据</button>
        <button type="button" disabled={working || props.busy || !props.credentialsConfigured} onClick={() => void run(async () => {
          if (await props.onDeleteCredentials()) {
            clearSecrets();
            setStatus('凭据已删除');
          }
        })}>删除已保存凭据</button>
      </div>
      <p className="privacy-note">连接测试会向上述 endpoint 发出一次固定模型请求，可能产生少量费用；不会保存一次性凭据，也不会写 AI 历史。</p>
      <button type="button" disabled={working || props.busy} onClick={testConnection}>测试连接（可能产生费用）</button>

      <hr />
      <p>本地 AI 历史：{props.historyCount} 条。记录可能包含模型生成的目标原文。</p>
      <button type="button" disabled={working || props.busy || props.historyCount === 0} onClick={() => void run(async () => {
        if (await props.onClearHistory()) setStatus('AI 历史已清空，凭据未改变');
      })}>清空 AI 历史</button>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
