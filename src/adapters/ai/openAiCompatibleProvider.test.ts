/**
 * 模块名称：OpenAI-compatible Provider 适配器测试
 * 职责描述：锁定单次封闭请求、严格响应解析、大小预算与取消/超时错误语义
 * 输入/输出：向 fake fetch 提供受控 Response，并断言脱敏结果或闭合错误码
 * 依赖关系：Vitest、ProviderAdapter、AI GoalDraft schema
 * 注意事项：fixture 只使用虚构凭据，绝不访问真实网络
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EndpointBoundProviderCredentials } from '../../modules/ai/credentials';
import type { AiProviderSettings } from '../../modules/ai/types';
import { aiGoalDraftJsonSchema } from '../../modules/ai/goalDraftSchema';
import { AiOperationError, OpenAiCompatibleProvider } from './openAiCompatibleProvider';

const settings = (overrides: Partial<AiProviderSettings> = {}): AiProviderSettings => ({
  protocol: 'openai-chat-completions',
  baseUrl: 'https://provider.invalid/v1',
  model: 'fixture-model',
  requestTimeoutMs: 30_000,
  structuredOutputMode: 'json-schema',
  ...overrides,
});

const credentials = (): EndpointBoundProviderCredentials => ({
  binding: { protocol: 'openai-chat-completions', baseUrl: 'https://provider.invalid/v1' },
  apiKey: 'fixture-key-never-real',
  customHeaders: { 'x-tenant': 'fixture-tenant' },
});

const draft = () => ({
  schemaVersion: 'goal-draft-v1',
  title: '建立阅读习惯',
  description: '从短时阅读开始。',
  feedbackModel: { type: 'cumulative', unit: 'minutes' },
  importanceSuggestion: 3,
  desiredCadenceDays: 1,
  minimumRestHours: 0,
  defaultEnergyCost: 2,
  suggestedActivities: [{
    title: '每天阅读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 30,
    energyCost: 2, contexts: ['home'], minimumRestHours: null, suggestedCadenceDays: 1,
  }],
  clarificationNeeded: false,
  clarificationQuestions: [],
});

const providerResponse = (content: unknown = JSON.stringify(draft()), finishReason = 'stop') =>
  new Response(JSON.stringify({
    choices: [{ finish_reason: finishReason, message: { content, refusal: null } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });

const run = async (response: Response, config = settings(), signal = new AbortController().signal) => {
  const fetchSpy = vi.fn(async () => response) as unknown as typeof fetch;
  const provider = new OpenAiCompatibleProvider(fetchSpy);
  const result = await provider.completeStructured({
    settings: config,
    credentials: credentials(),
    task: { type: 'goal-draft', input: '  我想养成阅读习惯  ' },
    signal,
  });
  return { fetchSpy, result };
};

afterEach(() => vi.useRealTimers());

describe('OpenAiCompatibleProvider', () => {
  it('sends exactly one closed POST with the fixed schema and fetch policy', async () => {
    const { fetchSpy, result } = await run(providerResponse());

    expect(result).toEqual(draft());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchSpy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe('https://provider.invalid/v1/chat/completions');
    expect(init).toMatchObject({
      method: 'POST', redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer',
      cache: 'no-store', mode: 'cors',
    });
    expect(init.headers).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer fixture-key-never-real',
      'x-tenant': 'fixture-tenant',
    });
    const body = JSON.parse(String(init.body));
    expect(Object.keys(body).sort()).toEqual(['messages', 'model', 'response_format', 'store']);
    expect(body).toMatchObject({
      model: 'fixture-model', store: false,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'goal_draft_v1', strict: true, schema: aiGoalDraftJsonSchema },
      },
    });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content).toContain('我想养成阅读习惯');
    expect(body.messages[1].content).not.toContain('  我想养成阅读习惯  ');
    for (const forbidden of ['temperature', 'tools', 'stream', 'reasoning', 'user']) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });

  it('uses explicit json_object mode while retaining strict local parsing', async () => {
    const { fetchSpy } = await run(providerResponse(), settings({ structuredOutputMode: 'json-object' }));
    const body = JSON.parse(String((fetchSpy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].body));
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('keeps connection testing inside the same closed task union and fixed schema', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}', refusal: null } }],
    }))) as unknown as typeof fetch;
    const provider = new OpenAiCompatibleProvider(fetchSpy);
    await expect(provider.completeStructured({
      settings: settings(), credentials: credentials(), task: { type: 'connection-test' },
      signal: new AbortController().signal,
    })).resolves.toEqual({ ok: true });
    const body = JSON.parse(String((fetchSpy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].body));
    expect(body.response_format.json_schema).toMatchObject({ name: 'connection_test_v1', strict: true });
    expect(JSON.stringify(body)).not.toContain('BEGIN_UNTRUSTED_GOAL_TEXT');
  });

  it.each([
    [401, 'auth'], [403, 'auth'], [429, 'rate-limited'], [500, 'server'], [599, 'server'],
    [300, 'unavailable'], [404, 'unavailable'],
  ] as const)('maps HTTP %s to %s without exposing provider content', async (status, code) => {
    const secretBody = 'fixture-sensitive-provider-message';
    await expect(run(new Response(secretBody, { status }))).rejects.toMatchObject({ code });
    try {
      await run(new Response(secretBody, { status }));
    } catch (error) {
      expect(String(error)).not.toContain(secretBody);
      expect(String(error)).not.toContain('provider.invalid');
      expect(String(error)).not.toContain('fixture-key');
    }
  });

  it.each([
    [providerResponse(JSON.stringify(draft()), 'length')],
    [providerResponse([JSON.stringify(draft())])],
    [providerResponse('```json\n{}\n```')],
    [providerResponse('{"schemaVersion":"goal-draft-v1"}')],
    [new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(draft()), refusal: 'no' } }] }))],
  ])('rejects non-stop, array, fenced, schema-invalid, or refused output', async (response) => {
    await expect(run(response)).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('rejects Content-Length and streamed bodies beyond 256 KiB', async () => {
    await expect(run(new Response('small', {
      status: 200,
      headers: { 'content-length': String(256 * 1_024 + 1) },
    }))).rejects.toMatchObject({ code: 'response-too-large' });

    const chunk = new Uint8Array(200 * 1_024);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    await expect(run(new Response(stream))).rejects.toMatchObject({ code: 'response-too-large' });
  });

  it('distinguishes caller cancellation from internal timeout and never retries', async () => {
    vi.useFakeTimers();
    const hangingFetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })) as unknown as typeof fetch;
    const provider = new OpenAiCompatibleProvider(hangingFetch);

    const caller = new AbortController();
    const cancelled = provider.completeStructured({
      settings: settings(), credentials: credentials(), task: { type: 'goal-draft', input: 'read' }, signal: caller.signal,
    });
    caller.abort();
    await expect(cancelled).rejects.toMatchObject({ code: 'cancelled', requestAttempted: true });

    const timedOut = provider.completeStructured({
      settings: settings({ requestTimeoutMs: 5_000 }), credentials: credentials(),
      task: { type: 'goal-draft', input: 'read' }, signal: new AbortController().signal,
    });
    const timeoutExpectation = expect(timedOut).rejects.toMatchObject({ code: 'timeout', requestAttempted: true });
    await vi.advanceTimersByTimeAsync(5_000);
    caller.abort();
    await timeoutExpectation;
    expect(hangingFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid input and endpoint-mismatched credentials before fetch', async () => {
    const fetchSpy = vi.fn() as unknown as typeof fetch;
    const provider = new OpenAiCompatibleProvider(fetchSpy);
    const mismatched = credentials();
    mismatched.binding.baseUrl = 'https://other.invalid/v1';
    await expect(provider.completeStructured({
      settings: settings(), credentials: mismatched, task: { type: 'goal-draft', input: ' ' },
      signal: new AbortController().signal,
    })).rejects.toBeInstanceOf(AiOperationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
