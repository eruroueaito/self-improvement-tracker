/**
 * 模块名称：可编辑 AI GoalDraft 映射测试
 * 职责描述：验证临时模型草稿必须经澄清和本地域校验后才能映射为 Goal/Activity 输入
 * 输入/输出：传入 AiGoalDraft/可编辑副本，断言独立状态、标准输入或 ValidationError
 * 依赖关系：Vitest、AI draft mapping、领域 normalizer
 * 注意事项：不得通过类型断言绕过 nullable progress 与 1–5 Activity 约束
 */
import { describe, expect, it } from 'vitest';
import type { AiGoalDraft } from '../../modules/ai/goalDraftSchema';
import { createEditableAiGoalDraft, mapEditableAiGoalDraft } from './aiDraftMapping';

const draft = (): AiGoalDraft => ({
  schemaVersion: 'goal-draft-v1', title: '阅读计划', description: '逐步建立习惯',
  feedbackModel: { type: 'cumulative', unit: 'minutes' }, importanceSuggestion: 3,
  desiredCadenceDays: 1, minimumRestHours: 0, defaultEnergyCost: 2,
  suggestedActivities: [{
    title: '读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 30,
    energyCost: 2, contexts: ['home'], minimumRestHours: null, suggestedCadenceDays: 1,
  }],
  clarificationNeeded: false, clarificationQuestions: [],
});

describe('AI GoalDraft editable mapping', () => {
  it('creates an independent editable copy and maps all local fields', () => {
    const source = draft();
    const editable = createEditableAiGoalDraft(source);
    editable.title = '更新标题';
    editable.suggestedActivities[0]!.title = '更新活动';

    expect(source.title).toBe('阅读计划');
    expect(source.suggestedActivities[0]!.title).toBe('读十分钟');
    expect(mapEditableAiGoalDraft(editable)).toEqual({
      goal: {
        title: '更新标题', description: '逐步建立习惯', importance: 3,
        feedback: { type: 'cumulative', unit: 'minutes' }, desiredCadenceDays: 1,
        minimumRestHours: 0, defaultEnergyCost: 2,
      },
      activities: [{
        title: '更新活动', description: '', minimumMinutes: 10, maximumMinutes: 30,
        energyCost: 2, contexts: ['home'], minimumRestHours: null,
        suggestedCadenceDays: 1, rewardWeight: 1,
      }],
    });
  });

  it('requires explicit clarification resolution and complete progress fields', () => {
    const editable = createEditableAiGoalDraft({
      ...draft(),
      feedbackModel: { type: 'progress', baseline: null, target: null, unit: null },
      clarificationNeeded: true,
      clarificationQuestions: ['当前值、目标值和单位是什么？'],
    });
    expect(() => mapEditableAiGoalDraft(editable)).toThrow(/澄清/);
    editable.clarificationResolved = true;
    expect(() => mapEditableAiGoalDraft(editable)).toThrow(/进度/);
    editable.feedbackModel = { type: 'progress', baseline: 10, target: 100, unit: '页' };
    expect(mapEditableAiGoalDraft(editable).goal.feedback).toEqual({
      type: 'progress', baseline: 10, target: 100, unit: '页',
    });
  });

  it('rejects zero or more than five activities and reruns local activity validation', () => {
    const editable = createEditableAiGoalDraft(draft());
    editable.suggestedActivities = [];
    expect(() => mapEditableAiGoalDraft(editable)).toThrow(/1–5/);
    editable.suggestedActivities = Array.from({ length: 6 }, () => structuredClone(draft().suggestedActivities[0]!));
    expect(() => mapEditableAiGoalDraft(editable)).toThrow(/1–5/);
    editable.suggestedActivities = [{
      ...draft().suggestedActivities[0]!, minimumMinutes: 40, maximumMinutes: 20,
    }];
    expect(() => mapEditableAiGoalDraft(editable)).toThrow();
  });
});
