/**
 * 模块名称：AI GoalDraft 服务测试
 * 职责描述：验证开关、调用时凭据读取、错误映射与可选脱敏历史候选
 * 输入/输出：向 fake ports 发起生成并断言临时草稿 outcome；不使用 DataStore
 * 依赖关系：Vitest、AiGoalDraftService、应用端口
 * 注意事项：history 关闭时不得分配 ID 或克隆输出
 */
import { describe, expect, it, vi } from 'vitest';
import type { AiGoalDraft } from '../modules/ai/goalDraftSchema';
import { createDefaultAppSettings, type AppSettings } from '../modules/settings/settings';
import type { EndpointBoundProviderCredentials } from '../modules/ai/credentials';
import { AiOperationError } from '../adapters/ai/openAiCompatibleProvider';
import { AiGoalDraftService } from './aiGoalDraftService';
import type { Clock, IdGenerator, ProviderAdapter, SecretStore } from './ports';

const draft = (): AiGoalDraft => ({
  schemaVersion: 'goal-draft-v1', title: '阅读', description: '',
  feedbackModel: { type: 'cumulative', unit: 'minutes' }, importanceSuggestion: 3,
  desiredCadenceDays: 1, minimumRestHours: 0, defaultEnergyCost: 2,
  suggestedActivities: [{ title: '读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 20,
    energyCost: 2, contexts: [], minimumRestHours: null, suggestedCadenceDays: 1 }],
  clarificationNeeded: false, clarificationQuestions: [],
});

const enabledSettings = (historyEnabled = true): AppSettings => ({
  ...createDefaultAppSettings(),
  ai: {
    enabled: true, goalDraftEnabled: true, historyEnabled,
    provider: {
      protocol: 'openai-chat-completions', baseUrl: 'https://provider.invalid/v1', model: 'fixture-model',
      requestTimeoutMs: 30_000, structuredOutputMode: 'json-schema',
    },
  },
});

const boundCredentials: EndpointBoundProviderCredentials = {
  binding: { protocol: 'openai-chat-completions', baseUrl: 'https://provider.invalid/v1' },
  apiKey: 'fixture-key', customHeaders: {},
};

const setup = (providerImpl: ProviderAdapter['completeStructured'], credentials = boundCredentials) => {
  const provider: ProviderAdapter = { completeStructured: vi.fn(providerImpl) };
  const secrets: SecretStore = {
    readProviderCredentials: vi.fn(async () => structuredClone(credentials)),
    writeProviderCredentials: vi.fn(), deleteProviderCredentials: vi.fn(), hasProviderCredentials: vi.fn(),
  };
  let now = 1_000;
  const clock: Clock = { now: () => (now += 25) };
  const ids: IdGenerator = { next: vi.fn(() => 'interaction-1') };
  return { service: new AiGoalDraftService(secrets, provider, clock, ids), provider, secrets, ids };
};

describe('AiGoalDraftService', () => {
  it.each([
    [{ ...enabledSettings(), ai: { ...enabledSettings().ai, enabled: false } }],
    [{ ...enabledSettings(), ai: { ...enabledSettings().ai, goalDraftEnabled: false } }],
  ])('returns disabled without reading secrets or calling provider', async (settings) => {
    const { service, provider, secrets } = setup(async () => draft());
    await expect(service.generate({ settings, input: 'read', signal: new AbortController().signal }))
      .resolves.toEqual({ ok: false, error: 'disabled', interactionCandidate: null });
    expect(secrets.readProviderCredentials).not.toHaveBeenCalled();
    expect(provider.completeStructured).not.toHaveBeenCalled();
  });

  it('reads endpoint-bound credentials at call time and returns a validated temporary draft', async () => {
    const { service, provider, secrets } = setup(async () => draft());
    const outcome = await service.generate({
      settings: enabledSettings(), input: '  read more  ', signal: new AbortController().signal,
    });
    expect(secrets.readProviderCredentials).toHaveBeenCalledWith({
      protocol: 'openai-chat-completions', baseUrl: 'https://provider.invalid/v1',
    });
    expect(provider.completeStructured).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({
      ok: true,
      draft: draft(),
      interactionCandidate: {
        id: 'interaction-1', requestType: 'goal-draft', providerModel: 'fixture-model',
        inputSummary: 'GoalDraft request (9 characters)', result: 'success', validatedOutput: draft(),
      },
    });
  });

  it('does not allocate or clone history data when history is disabled', async () => {
    const output = draft();
    const { service, ids } = setup(async () => output);
    const outcome = await service.generate({
      settings: enabledSettings(false), input: 'read', signal: new AbortController().signal,
    });
    expect(outcome).toEqual({ ok: true, draft: output, interactionCandidate: null });
    expect(ids.next).not.toHaveBeenCalled();
  });

  it('returns not-configured or secret-store without a provider call or history candidate', async () => {
    const missing = setup(async () => draft());
    vi.mocked(missing.secrets.readProviderCredentials).mockResolvedValueOnce(null);
    await expect(missing.service.generate({ settings: enabledSettings(), input: 'read', signal: new AbortController().signal }))
      .resolves.toEqual({ ok: false, error: 'not-configured', interactionCandidate: null });
    expect(missing.provider.completeStructured).not.toHaveBeenCalled();

    vi.mocked(missing.secrets.readProviderCredentials).mockRejectedValueOnce(new Error('secret raw failure'));
    await expect(missing.service.generate({ settings: enabledSettings(), input: 'read', signal: new AbortController().signal }))
      .resolves.toEqual({ ok: false, error: 'secret-store', interactionCandidate: null });
  });

  it('maps a runtime-damaged settings object to invalid-config without touching secrets', async () => {
    const { service, secrets } = setup(async () => draft());
    const outcome = await service.generate({
      settings: {} as AppSettings,
      input: 'read',
      signal: new AbortController().signal,
    });
    expect(outcome).toEqual({ ok: false, error: 'invalid-config', interactionCandidate: null });
    expect(secrets.readProviderCredentials).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', ''],
    ['blank', ' '.repeat(4)],
    ['overlong', 'x'.repeat(10_001)],
  ])(
    'rejects %s user input before reading credentials',
    async (_label, input) => {
      const { service, secrets } = setup(async () => draft());
      await expect(service.generate({
        settings: enabledSettings(), input, signal: new AbortController().signal,
      })).resolves.toEqual({ ok: false, error: 'invalid-config', interactionCandidate: null });
      expect(secrets.readProviderCredentials).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['auth', true], ['rate-limited', true], ['timeout', true], ['unavailable', true],
    ['server', true], ['response-too-large', true], ['invalid-response', true],
    ['cancelled', false], ['invalid-config', false],
  ] as const)('returns %s and only creates eligible failure history after an actual POST', async (code, expectsHistory) => {
    const { service, ids } = setup(async () => {
      throw new AiOperationError(code, expectsHistory);
    });
    const outcome = await service.generate({
      settings: enabledSettings(), input: 'read', signal: new AbortController().signal,
    });
    expect(outcome).toMatchObject({ ok: false, error: code });
    if (expectsHistory) {
      expect(outcome.interactionCandidate).toMatchObject({ result: code, validatedOutput: null });
      expect(ids.next).toHaveBeenCalledTimes(1);
    } else {
      expect(outcome.interactionCandidate).toBeNull();
      expect(ids.next).not.toHaveBeenCalled();
    }
  });

  it('converts provider success with invalid local output into invalid-response history', async () => {
    const { service } = setup(async () => ({ ...draft(), extra: true }));
    const outcome = await service.generate({
      settings: enabledSettings(), input: 'read', signal: new AbortController().signal,
    });
    expect(outcome).toMatchObject({
      ok: false, error: 'invalid-response',
      interactionCandidate: { result: 'invalid-response', validatedOutput: null },
    });
  });
});
