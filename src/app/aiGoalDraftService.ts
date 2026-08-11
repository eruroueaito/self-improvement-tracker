/**
 * 模块名称：AI GoalDraft 应用服务
 * 职责描述：检查功能开关、在调用时读取 endpoint-bound 凭据，并生成临时草稿及可选历史候选
 * 输入/输出：接收当前设置、自然语言输入和 AbortSignal；返回不写 DataStore 的判别联合 outcome
 * 依赖关系：SecretStore/ProviderAdapter/Clock/IdGenerator 端口、AI schema、设置 normalizer
 * 注意事项：只有实际 POST 的非取消结果可生成 history candidate；history 关闭时不分配 ID、不克隆输出
 */
import { AiOperationError, type ProviderErrorCode } from '../adapters/ai/openAiCompatibleProvider';
import { AiGoalDraftSchema, type AiGoalDraft } from '../modules/ai/goalDraftSchema';
import {
  AiInteractionLogSchema,
  buildGoalDraftInputSummary,
  type AiInteractionLog,
} from '../modules/ai/interactionLog';
import type { AiInteractionResult } from '../modules/ai/types';
import { normalizeAppSettings, type AppSettings } from '../modules/settings/settings';
import type { Clock, IdGenerator, ProviderAdapter, SecretStore } from './ports';

export type AiGoalDraftServiceError =
  | 'disabled'
  | 'not-configured'
  | 'invalid-config'
  | 'secret-store'
  | ProviderErrorCode
  | 'storage';

export type AiGoalDraftOutcome =
  | { ok: true; draft: AiGoalDraft; interactionCandidate: AiInteractionLog | null }
  | { ok: false; error: AiGoalDraftServiceError; interactionCandidate: AiInteractionLog | null };

export interface GenerateAiGoalDraftInput {
  settings: AppSettings;
  input: string;
  signal: AbortSignal;
}

type FailedAiInteractionResult = Exclude<AiInteractionResult, 'success'>;

const isHistoryResult = (code: ProviderErrorCode): code is FailedAiInteractionResult => [
  'auth', 'rate-limited', 'timeout', 'unavailable', 'server', 'response-too-large', 'invalid-response',
].includes(code);

export class AiGoalDraftService {
  constructor(
    private readonly secretStore: SecretStore,
    private readonly provider: ProviderAdapter,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  private historyCandidate(input: {
    enabled: boolean;
    model: string;
    requestInput: string;
    startedAt: number;
    result: AiInteractionResult;
    output: AiGoalDraft | null;
  }): AiInteractionLog | null {
    if (!input.enabled) return null;
    return AiInteractionLogSchema.parse({
      id: this.ids.next(),
      requestType: 'goal-draft',
      providerModel: input.model,
      schemaVersion: 'goal-draft-v1',
      inputSummary: buildGoalDraftInputSummary(input.requestInput),
      validatedOutput: input.output === null ? null : structuredClone(input.output),
      startedAt: input.startedAt,
      durationMs: Math.max(0, this.clock.now() - input.startedAt),
      result: input.result,
    });
  }

  async generate(input: GenerateAiGoalDraftInput): Promise<AiGoalDraftOutcome> {
    try {
      if (input.settings.ai.enabled === false || input.settings.ai.goalDraftEnabled === false) {
        return { ok: false, error: 'disabled', interactionCandidate: null };
      }
    } catch {
      return { ok: false, error: 'invalid-config', interactionCandidate: null };
    }

    let settings: AppSettings;
    let requestInput: string;
    try {
      settings = normalizeAppSettings(input.settings);
      if (settings.ai.provider.model.length === 0) {
        return { ok: false, error: 'not-configured', interactionCandidate: null };
      }
      requestInput = input.input.trim();
      const inputLength = [...requestInput].length;
      if (inputLength < 1 || inputLength > 10_000) {
        return { ok: false, error: 'invalid-config', interactionCandidate: null };
      }
    } catch {
      return { ok: false, error: 'invalid-config', interactionCandidate: null };
    }
    const binding = {
      protocol: settings.ai.provider.protocol,
      baseUrl: settings.ai.provider.baseUrl,
    } as const;

    let credentials;
    try {
      credentials = await this.secretStore.readProviderCredentials(binding);
    } catch {
      return { ok: false, error: 'secret-store', interactionCandidate: null };
    }
    if (!credentials) return { ok: false, error: 'not-configured', interactionCandidate: null };

    const startedAt = this.clock.now();
    try {
      const raw = await this.provider.completeStructured({
        settings: settings.ai.provider,
        credentials,
        task: { type: 'goal-draft', input: requestInput },
        signal: input.signal,
      });
      const parsed = AiGoalDraftSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: 'invalid-response',
          interactionCandidate: this.historyCandidate({
            enabled: settings.ai.historyEnabled,
            model: settings.ai.provider.model,
            requestInput,
            startedAt,
            result: 'invalid-response',
            output: null,
          }),
        };
      }
      return {
        ok: true,
        draft: parsed.data,
        interactionCandidate: this.historyCandidate({
          enabled: settings.ai.historyEnabled,
          model: settings.ai.provider.model,
          requestInput,
          startedAt,
          result: 'success',
          output: parsed.data,
        }),
      };
    } catch (error) {
      if (!(error instanceof AiOperationError)) {
        return { ok: false, error: 'unavailable', interactionCandidate: null };
      }
      const eligible = error.requestAttempted && error.code !== 'cancelled' && isHistoryResult(error.code);
      return {
        ok: false,
        error: error.code,
        interactionCandidate: eligible
          ? this.historyCandidate({
              enabled: settings.ai.historyEnabled,
              model: settings.ai.provider.model,
              requestInput,
              startedAt,
              result: error.code,
              output: null,
            })
          : null,
      };
    }
  }
}
