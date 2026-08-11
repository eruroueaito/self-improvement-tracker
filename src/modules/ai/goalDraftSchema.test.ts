/**
 * 模块名称：AI GoalDraft Schema 测试
 * 职责描述：验证模型输出的严格字段、领域范围、澄清规则与同源 JSON Schema
 * 输入/输出：解析 unknown 候选并断言 AiGoalDraft 或严格拒绝
 * 依赖关系：Vitest、Zod、AI GoalDraft Schema
 * 注意事项：模型输出永远从 unknown 开始，不通过类型断言绕过校验
 */
import { describe, expect, it } from 'vitest';
import { AiGoalDraftSchema, aiGoalDraftJsonSchema } from './goalDraftSchema';

const validActivity = () => ({
  title: '每天阅读十分钟',
  description: '',
  minimumMinutes: 10,
  maximumMinutes: 30,
  energyCost: 2,
  contexts: ['home'],
  minimumRestHours: null,
  suggestedCadenceDays: 1,
});

const validDraft = () => ({
  schemaVersion: 'goal-draft-v1',
  title: '建立阅读习惯',
  description: '从短时阅读开始。',
  feedbackModel: { type: 'cumulative', unit: 'minutes' },
  importanceSuggestion: 3,
  desiredCadenceDays: 1,
  minimumRestHours: 0,
  defaultEnergyCost: 2,
  suggestedActivities: [validActivity()],
  clarificationNeeded: false,
  clarificationQuestions: [],
});

const collectObjectSchemas = (value: unknown): Record<string, unknown>[] => {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return [
    ...(record.type === 'object' ? [record] : []),
    ...Object.values(record).flatMap(collectObjectSchemas),
  ];
};

describe('AiGoalDraftSchema', () => {
  it('accepts every supported feedback branch and 1–5 exact activities', () => {
    expect(AiGoalDraftSchema.parse(validDraft()).schemaVersion).toBe('goal-draft-v1');
    expect(AiGoalDraftSchema.parse({
      ...validDraft(),
      feedbackModel: { type: 'experience' },
      suggestedActivities: Array.from({ length: 5 }, (_, index) => ({ ...validActivity(), title: `活动 ${index + 1}` })),
    }).suggestedActivities).toHaveLength(5);
    expect(AiGoalDraftSchema.parse({
      ...validDraft(),
      feedbackModel: { type: 'progress', baseline: 0, target: 10, unit: 'pages' },
    }).feedbackModel.type).toBe('progress');
  });

  it.each([
    { suggestedActivities: [] },
    { suggestedActivities: Array.from({ length: 6 }, validActivity) },
    { suggestedActivities: [{ ...validActivity(), extra: true }] },
    { suggestedActivities: [{ ...validActivity(), minimumMinutes: 31, maximumMinutes: 30 }] },
    { suggestedActivities: [{ ...validActivity(), contexts: ['x'.repeat(41)] }] },
    { extra: true },
    { title: ' '.repeat(3) },
  ])('rejects invalid or unknown draft fields: %o', (override) => {
    expect(() => AiGoalDraftSchema.parse({ ...validDraft(), ...override })).toThrow();
  });

  it.each([
    { baseline: null, target: 10, unit: 'pages' },
    { baseline: 0, target: null, unit: 'pages' },
    { baseline: null, target: null, unit: null },
  ])('requires clarification for incomplete progress %o', (progress) => {
    const incomplete = { ...validDraft(), feedbackModel: { type: 'progress', ...progress } };
    expect(() => AiGoalDraftSchema.parse(incomplete)).toThrow();
    expect(AiGoalDraftSchema.parse({
      ...incomplete,
      clarificationNeeded: true,
      clarificationQuestions: ['请补充当前值和目标值。'],
    }).clarificationNeeded).toBe(true);
  });

  it('rejects invalid complete progress and inconsistent clarification flags', () => {
    expect(() => AiGoalDraftSchema.parse({
      ...validDraft(),
      feedbackModel: { type: 'progress', baseline: 10, target: 10, unit: 'pages' },
    })).toThrow();
    expect(() => AiGoalDraftSchema.parse({
      ...validDraft(),
      clarificationNeeded: true,
      clarificationQuestions: [],
    })).toThrow();
    expect(() => AiGoalDraftSchema.parse({
      ...validDraft(),
      clarificationQuestions: ['不应存在的问题'],
    })).toThrow();
  });

  it('exports a strict JSON Schema from the same Zod schema', () => {
    expect(aiGoalDraftJsonSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
    });
    expect(aiGoalDraftJsonSchema.required).toEqual(expect.arrayContaining([
      'schemaVersion',
      'feedbackModel',
      'suggestedActivities',
      'clarificationNeeded',
      'clarificationQuestions',
    ]));
    for (const objectSchema of collectObjectSchemas(aiGoalDraftJsonSchema)) {
      const properties = objectSchema.properties as Record<string, unknown>;
      expect(objectSchema.additionalProperties).toBe(false);
      expect([...(objectSchema.required as string[])].sort()).toEqual(Object.keys(properties).sort());
    }
  });
});
