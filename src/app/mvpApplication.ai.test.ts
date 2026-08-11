/**
 * 模块名称：MVP 应用 AI 编排测试
 * 职责描述：验证网络等待不占 mutation queue、history generation 隐私优先和历史写失败降级
 * 输入/输出：用可控 GoalDraft generator 返回候选，并断言最新快照、草稿与 warning
 * 依赖关系：Vitest、MvpApplication、MemoryStore、AI interaction schema
 * 注意事项：不调用 fetch 或真实 SecretStore；所有候选均为严格本地 fixture
 */
import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../adapters/memory/memoryStore';
import { SessionSecretStore } from '../adapters/secrets/sessionSecretStore';
import type { AiGoalDraftOutcome, AiGoalDraftServicePort } from './aiGoalDraftService';
import type { AiInteractionLog } from '../modules/ai/interactionLog';
import { createDefaultAppSettings } from '../modules/settings/settings';
import type { Clock, CurrentAppSnapshot, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class FailingStore extends MemoryStore {
  failNext = false;
  override async replace(snapshot: CurrentAppSnapshot): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('replace failed');
    }
    await super.replace(snapshot);
  }
}

class FakeIds implements IdGenerator {
  private value = 0;
  next(): string { return `id-${++this.value}`; }
}

const clock: Clock = { now: () => 1_000 };
const notifications: NotificationPort = { async scheduleCountdown() {}, async cancelCountdown() {} };
const files: ExportFilePort = { async save() {} };
const draft = {
  schemaVersion: 'goal-draft-v1' as const,
  title: '阅读', description: '', feedbackModel: { type: 'experience' as const },
  importanceSuggestion: 3 as const, desiredCadenceDays: 1, minimumRestHours: 0, defaultEnergyCost: 2 as const,
  suggestedActivities: [{ title: '读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 20,
    energyCost: 2 as const, contexts: [], minimumRestHours: null, suggestedCadenceDays: 1 }],
  clarificationNeeded: false, clarificationQuestions: [],
};
const candidate = (): AiInteractionLog => ({
  id: 'interaction-1', requestType: 'goal-draft', providerModel: 'fixture-model', schemaVersion: 'goal-draft-v1',
  inputSummary: 'GoalDraft request (4 characters)', validatedOutput: draft,
  startedAt: 1_000, durationMs: 25, result: 'success',
});
const success = (): AiGoalDraftOutcome => ({ ok: true, draft, interactionCandidate: candidate() });

const enabledSettings = () => ({
  ...createDefaultAppSettings(),
  ai: {
    enabled: true, goalDraftEnabled: true, historyEnabled: true,
    provider: {
      protocol: 'openai-chat-completions' as const, baseUrl: 'https://provider.invalid/v1',
      model: 'fixture-model', requestTimeoutMs: 30_000, structuredOutputMode: 'json-schema' as const,
    },
  },
});

const setup = async (generate: AiGoalDraftServicePort['generate']) => {
  const store = new FailingStore();
  const generator: AiGoalDraftServicePort = { generate: vi.fn(generate) };
  const app = new MvpApplication(
    store, clock, new FakeIds(), notifications, files, new SessionSecretStore(), generator,
  );
  await app.initialize();
  await app.updateSettings(enabledSettings());
  return { app, store, generator };
};

describe('MvpApplication AI orchestration', () => {
  it('does not hold the mutation queue while waiting for the provider and appends to the latest snapshot', async () => {
    let resolveProvider!: (outcome: AiGoalDraftOutcome) => void;
    const pending = new Promise<AiGoalDraftOutcome>((resolve) => { resolveProvider = resolve; });
    const { app } = await setup(async () => pending);

    const generation = app.generateAiGoalDraft('read', new AbortController().signal);
    await app.createGoalWithActivities({
      title: '并发目标', importance: 3, feedback: { type: 'experience' }, defaultEnergyCost: 2,
    }, [{ title: '并发活动', minimumMinutes: 10, maximumMinutes: 20, energyCost: 2 }]);
    resolveProvider(success());

    await expect(generation).resolves.toMatchObject({ ok: true, historyWarning: null });
    expect(app.getSnapshot().goals.map((goal) => goal.title)).toEqual(['并发目标']);
    expect(app.getSnapshot().aiInteractions).toEqual([candidate()]);
  });

  it('lets clear history win over an older in-flight candidate', async () => {
    let resolveProvider!: (outcome: AiGoalDraftOutcome) => void;
    const { app } = await setup(async () => new Promise((resolve) => { resolveProvider = resolve; }));

    const generation = app.generateAiGoalDraft('read', new AbortController().signal);
    await app.clearAiHistory();
    resolveProvider(success());
    await generation;

    expect(app.getSnapshot().aiInteractions).toEqual([]);
  });

  it('invalidates old candidates when disabling history even if that settings write fails', async () => {
    let resolveProvider!: (outcome: AiGoalDraftOutcome) => void;
    const { app, store } = await setup(async () => new Promise((resolve) => { resolveProvider = resolve; }));
    const generation = app.generateAiGoalDraft('read', new AbortController().signal);
    store.failNext = true;

    await expect(app.updateSettings({
      ...enabledSettings(), ai: { ...enabledSettings().ai, historyEnabled: false },
    })).rejects.toThrow('replace failed');
    resolveProvider(success());
    await generation;

    expect(app.getSnapshot().settings.ai.historyEnabled).toBe(true);
    expect(app.getSnapshot().aiInteractions).toEqual([]);
  });

  it('does not revive an old candidate after history is disabled and then re-enabled', async () => {
    let resolveProvider!: (outcome: AiGoalDraftOutcome) => void;
    const { app } = await setup(async () => new Promise((resolve) => { resolveProvider = resolve; }));
    const generation = app.generateAiGoalDraft('read', new AbortController().signal);

    await app.updateSettings({
      ...enabledSettings(), ai: { ...enabledSettings().ai, historyEnabled: false },
    });
    await app.updateSettings(enabledSettings());
    resolveProvider(success());
    await generation;

    expect(app.getSnapshot().settings.ai.historyEnabled).toBe(true);
    expect(app.getSnapshot().aiInteractions).toEqual([]);
  });

  it('keeps a validated draft when history persistence fails and returns a non-blocking warning', async () => {
    const { app, store } = await setup(async () => success());
    store.failNext = true;

    await expect(app.generateAiGoalDraft('read', new AbortController().signal)).resolves.toMatchObject({
      ok: true, draft, historyWarning: 'storage',
    });
    expect(app.getSnapshot().aiInteractions).toEqual([]);
  });

  it('preserves the provider error code when its eligible failure-history write fails', async () => {
    const failedCandidate: AiInteractionLog = {
      ...candidate(), result: 'auth', validatedOutput: null,
    };
    const { app, store } = await setup(async () => ({
      ok: false, error: 'auth', interactionCandidate: failedCandidate,
    }));
    store.failNext = true;

    await expect(app.generateAiGoalDraft('read', new AbortController().signal)).resolves.toEqual({
      ok: false, error: 'auth', interactionCandidate: failedCandidate, historyWarning: 'storage',
    });
  });
});
