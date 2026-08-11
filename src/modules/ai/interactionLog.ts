/**
 * 模块名称：AI 交互历史
 * 职责描述：严格校验脱敏交互记录，并按条数和 UTF-8 字节预算确定性裁剪
 * 输入/输出：接收 unknown history 或新记录，返回独立的规范历史数组
 * 依赖关系：Zod、AiGoalDraft Schema、AI 结果类型
 * 注意事项：inputSummary 只允许固定字符数格式，绝不保存用户输入片段
 */
import { z } from 'zod';
import { AiGoalDraftSchema } from './goalDraftSchema';

const MAX_HISTORY_ENTRIES = 50;
const MAX_HISTORY_BYTES = 1_048_576;

const resultSchema = z.enum([
  'success',
  'auth',
  'rate-limited',
  'timeout',
  'unavailable',
  'server',
  'response-too-large',
  'invalid-response',
]);

export const AiInteractionLogSchema = z.object({
  id: z.string().min(1).max(200),
  requestType: z.literal('goal-draft'),
  providerModel: z.string().min(1).max(160).refine((value) => value.trim().length > 0),
  schemaVersion: z.literal('goal-draft-v1'),
  inputSummary: z.string().max(64).regex(/^GoalDraft request \([0-9]+ characters\)$/),
  validatedOutput: AiGoalDraftSchema.nullable(),
  startedAt: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  result: resultSchema,
}).strict().superRefine((entry, context) => {
  const hasOutput = entry.validatedOutput !== null;
  if ((entry.result === 'success') !== hasOutput) {
    context.addIssue({
      code: 'custom',
      path: ['validatedOutput'],
      message: '只有成功记录可以包含已验证输出',
    });
  }
});

export type AiInteractionLog = z.infer<typeof AiInteractionLogSchema>;

const serializedBytes = (history: readonly AiInteractionLog[]): number =>
  new TextEncoder().encode(JSON.stringify(history)).byteLength;

const assertUniqueIds = (history: readonly AiInteractionLog[]): void => {
  if (new Set(history.map((entry) => entry.id)).size !== history.length) {
    throw new Error('AI interaction history 包含重复 ID');
  }
};

export const buildGoalDraftInputSummary = (input: string): string =>
  `GoalDraft request (${[...input].length} characters)`;

export const normalizeAiInteractionHistory = (value: unknown): AiInteractionLog[] => {
  const history = z.array(AiInteractionLogSchema).max(MAX_HISTORY_ENTRIES).parse(value);
  assertUniqueIds(history);
  if (serializedBytes(history) > MAX_HISTORY_BYTES) {
    throw new Error('AI interaction history 超过 1 MiB');
  }
  return history;
};

const compareAge = (left: AiInteractionLog, right: AiInteractionLog): number =>
  left.startedAt - right.startedAt || left.id.localeCompare(right.id);

export const appendAiInteraction = (
  value: unknown,
  candidateValue: unknown,
): { history: AiInteractionLog[]; appended: boolean; warning: 'history-limit' | null } => {
  const history = normalizeAiInteractionHistory(value);
  const candidate = AiInteractionLogSchema.parse(candidateValue);
  assertUniqueIds([...history, candidate]);
  const next = [...history, candidate];

  while (next.length > MAX_HISTORY_ENTRIES || serializedBytes(next) > MAX_HISTORY_BYTES) {
    const oldest = [...next].sort(compareAge)[0]!;
    if (oldest === candidate) {
      return { history, appended: false, warning: 'history-limit' };
    }
    next.splice(next.indexOf(oldest), 1);
  }

  return { history: next, appended: true, warning: null };
};
