/**
 * 模块名称：可编辑 AI GoalDraft 映射
 * 职责描述：把已验证模型输出复制为 UI-only 草稿，并在确认时映射/复验本地 Goal 与 Activity 输入
 * 输入/输出：接收 AiGoalDraft 或 EditableAiGoalDraft；输出经本地域 normalizer 验证的 1 Goal + 1–5 Activities
 * 依赖关系：AI GoalDraft 类型、Goal/Activity 类型与 validation normalizer
 * 注意事项：nullable progress 字段和 clarificationResolved 只属于临时 UI，不能绕过确认校验进入持久事实
 */
import type { AiGoalDraft } from '../../modules/ai/goalDraftSchema';
import type { ActivityInput, FeedbackConfig, GoalInput } from '../../modules/goals/types';
import { normalizeActivityInput, normalizeGoalInput, ValidationError } from '../../modules/goals/validation';

export type EditableAiGoalDraft = AiGoalDraft & { clarificationResolved: boolean };

export const createEditableAiGoalDraft = (draft: AiGoalDraft): EditableAiGoalDraft => ({
  ...structuredClone(draft),
  clarificationResolved: !draft.clarificationNeeded,
});

const mapFeedback = (draft: EditableAiGoalDraft): FeedbackConfig => {
  if (draft.feedbackModel.type === 'progress') {
    const { baseline, target, unit } = draft.feedbackModel;
    if (baseline === null || target === null || unit === null) {
      throw new ValidationError('请补全进度的当前值、目标值和单位');
    }
    return { type: 'progress', baseline, target, unit };
  }
  return draft.feedbackModel.type === 'cumulative'
    ? { type: 'cumulative', unit: draft.feedbackModel.unit }
    : { type: 'experience' };
};

export const mapEditableAiGoalDraft = (
  draft: EditableAiGoalDraft,
): { goal: GoalInput; activities: ActivityInput[] } => {
  if (draft.clarificationNeeded && !draft.clarificationResolved) {
    throw new ValidationError('请先完成并确认模型提出的澄清问题');
  }
  if (draft.suggestedActivities.length < 1 || draft.suggestedActivities.length > 5) {
    throw new ValidationError('一个目标必须包含 1–5 个活动');
  }
  const goal = normalizeGoalInput({
    title: draft.title,
    description: draft.description,
    importance: draft.importanceSuggestion,
    feedback: mapFeedback(draft),
    desiredCadenceDays: draft.desiredCadenceDays,
    minimumRestHours: draft.minimumRestHours,
    defaultEnergyCost: draft.defaultEnergyCost,
  });
  const activities = draft.suggestedActivities.map((activity) => normalizeActivityInput({
    title: activity.title,
    description: activity.description,
    minimumMinutes: activity.minimumMinutes,
    maximumMinutes: activity.maximumMinutes,
    energyCost: activity.energyCost,
    contexts: activity.contexts,
    minimumRestHours: activity.minimumRestHours,
    suggestedCadenceDays: activity.suggestedCadenceDays,
    rewardWeight: 1,
  }));
  return { goal, activities };
};
