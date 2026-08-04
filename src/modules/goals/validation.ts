/**
 * 模块名称：目标领域校验
 * 职责描述：标准化并校验 Goal 与 ActivityTemplate 的用户输入
 * 输入/输出：接收草稿，返回可安全持久化的标准化字段或抛出领域错误
 * 依赖关系：目标领域类型
 * 注意事项：错误消息可直接用于本地 UI，不包含实现细节
 */
import type { ActivityDraft, FeedbackConfig, GoalDraft } from './types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const assertFiniteRange = (value: number, minimum: number, maximum: number, label: string): void => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ValidationError(`${label}必须在 ${minimum}–${maximum} 之间`);
  }
};

const normalizedText = (value: string, label: string, maximum: number): string => {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new ValidationError(`${label}长度必须为 1–${maximum} 个字符`);
  }
  return normalized;
};

const validateFeedback = (feedback: FeedbackConfig): FeedbackConfig => {
  if (feedback.type !== 'progress') {
    return feedback;
  }

  assertFiniteRange(feedback.target, Number.EPSILON, 1_000_000, '目标值');
  assertFiniteRange(feedback.baseline, 0, feedback.target, '当前起点');
  return {
    ...feedback,
    unit: normalizedText(feedback.unit, '单位', 24),
  };
};

export const normalizeGoalDraft = (draft: GoalDraft): GoalDraft => {
  assertFiniteRange(draft.importance, 1, 5, '重要性');
  assertFiniteRange(draft.defaultEnergyCost, 1, 5, '默认精力消耗');
  const cadence = draft.desiredCadenceDays ?? null;
  if (cadence !== null) {
    assertFiniteRange(cadence, Number.EPSILON, 3650, '目标周期');
  }
  assertFiniteRange(draft.minimumRestHours ?? 0, 0, 8760, '最短休息小时');

  return {
    ...draft,
    title: normalizedText(draft.title, '目标名称', 80),
    description: (draft.description ?? '').trim().slice(0, 2_000),
    feedback: validateFeedback(draft.feedback),
    desiredCadenceDays: cadence,
    minimumRestHours: draft.minimumRestHours ?? 0,
  };
};

export const normalizeContexts = (contexts: string[]): string[] =>
  [...new Set(contexts.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();

export const normalizeActivityDraft = (draft: ActivityDraft): ActivityDraft => {
  if (!Number.isInteger(draft.minimumMinutes) || !Number.isInteger(draft.maximumMinutes)) {
    throw new ValidationError('活动时长必须是整数分钟');
  }
  assertFiniteRange(draft.minimumMinutes, 1, 480, '最短时长');
  assertFiniteRange(draft.maximumMinutes, draft.minimumMinutes, 480, '最长时长');
  assertFiniteRange(draft.energyCost, 1, 5, '精力消耗');
  assertFiniteRange(draft.rewardWeight ?? 1, 0.25, 3, '奖励权重');
  const rest = draft.minimumRestHours ?? null;
  const cadence = draft.suggestedCadenceDays ?? null;
  if (rest !== null) assertFiniteRange(rest, 0, 8760, '活动休息小时');
  if (cadence !== null) assertFiniteRange(cadence, Number.EPSILON, 3650, '活动周期');

  return {
    ...draft,
    title: normalizedText(draft.title, '活动名称', 80),
    description: (draft.description ?? '').trim().slice(0, 2_000),
    contexts: normalizeContexts(draft.contexts ?? []),
    minimumRestHours: rest,
    suggestedCadenceDays: cadence,
    rewardWeight: draft.rewardWeight ?? 1,
  };
};
