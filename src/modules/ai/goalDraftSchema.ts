/**
 * 模块名称：AI GoalDraft Schema
 * 职责描述：以单一 Zod schema 严格校验模型生成的 Goal 与 Activity 草稿
 * 输入/输出：接收 unknown，输出 AiGoalDraft，并导出同源 Provider JSON Schema
 * 依赖关系：Zod
 * 注意事项：跨字段规则仍须在本地执行；JSON Schema 不能替代响应二次校验
 */
import { z } from 'zod';

const nonBlankString = (maximum: number) => z.string()
  .min(1)
  .max(maximum)
  .refine((value) => value.trim().length > 0, '文本不能为空');

const energyCostSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const nullableCadenceSchema = z.number().finite().positive().max(3_650).nullable();
const nullableRestSchema = z.number().finite().min(0).max(8_760).nullable();

export const AiActivityDraftSchema = z.object({
  title: nonBlankString(80),
  description: z.string().max(2_000),
  minimumMinutes: z.number().int().min(1).max(480),
  maximumMinutes: z.number().int().min(1).max(480),
  energyCost: energyCostSchema,
  contexts: z.array(nonBlankString(40)).max(10),
  minimumRestHours: nullableRestSchema,
  suggestedCadenceDays: nullableCadenceSchema,
}).strict().superRefine((activity, context) => {
  if (activity.maximumMinutes < activity.minimumMinutes) {
    context.addIssue({
      code: 'custom',
      path: ['maximumMinutes'],
      message: '最长时长不能小于最短时长',
    });
  }
});

const progressFeedbackSchema = z.object({
  type: z.literal('progress'),
  baseline: z.number().finite().min(0).max(1_000_000).nullable(),
  target: z.number().finite().min(0).max(1_000_000).nullable(),
  unit: nonBlankString(24).nullable(),
}).strict().superRefine((feedback, context) => {
  if (feedback.baseline !== null && feedback.target !== null && feedback.target <= feedback.baseline) {
    context.addIssue({ code: 'custom', path: ['target'], message: '目标值必须大于当前起点' });
  }
});

const feedbackModelSchema = z.discriminatedUnion('type', [
  progressFeedbackSchema,
  z.object({ type: z.literal('cumulative'), unit: z.enum(['minutes', 'times']) }).strict(),
  z.object({ type: z.literal('experience') }).strict(),
]);

export const AiGoalDraftSchema = z.object({
  schemaVersion: z.literal('goal-draft-v1'),
  title: nonBlankString(80),
  description: z.string().max(2_000),
  feedbackModel: feedbackModelSchema,
  importanceSuggestion: energyCostSchema,
  desiredCadenceDays: nullableCadenceSchema,
  minimumRestHours: z.number().finite().min(0).max(8_760),
  defaultEnergyCost: energyCostSchema,
  suggestedActivities: z.array(AiActivityDraftSchema).min(1).max(5),
  clarificationNeeded: z.boolean(),
  clarificationQuestions: z.array(nonBlankString(240)).max(5),
}).strict().superRefine((draft, context) => {
  const progressIncomplete = draft.feedbackModel.type === 'progress'
    && (draft.feedbackModel.baseline === null
      || draft.feedbackModel.target === null
      || draft.feedbackModel.unit === null);
  if (progressIncomplete && !draft.clarificationNeeded) {
    context.addIssue({ code: 'custom', path: ['clarificationNeeded'], message: '进度信息不完整时必须澄清' });
  }
  if (draft.clarificationNeeded && draft.clarificationQuestions.length === 0) {
    context.addIssue({ code: 'custom', path: ['clarificationQuestions'], message: '需要澄清时至少提供一个问题' });
  }
  if (!draft.clarificationNeeded && draft.clarificationQuestions.length > 0) {
    context.addIssue({ code: 'custom', path: ['clarificationQuestions'], message: '无需澄清时问题必须为空' });
  }
});

export type AiActivityDraft = z.infer<typeof AiActivityDraftSchema>;
export type AiGoalDraft = z.infer<typeof AiGoalDraftSchema>;

export const aiGoalDraftJsonSchema = z.toJSONSchema(AiGoalDraftSchema, {
  target: 'draft-2020-12',
  io: 'input',
});
