/**
 * 模块名称：AI 交互历史测试
 * 职责描述：验证脱敏摘要、strict log、结果一致性、唯一 ID 与确定性裁剪
 * 输入/输出：构造 history 候选，断言规范记录、裁剪或严格拒绝
 * 依赖关系：Vitest、AI 交互历史模块、GoalDraft Schema
 * 注意事项：inputSummary 只能保存字符数，不能保存输入原文或摘要片段
 */
import { describe, expect, it } from 'vitest';
import type { AiGoalDraft } from './goalDraftSchema';
import {
  appendAiInteraction,
  buildGoalDraftInputSummary,
  normalizeAiInteractionHistory,
  type AiInteractionLog,
} from './interactionLog';

const output = (): AiGoalDraft => ({
  schemaVersion: 'goal-draft-v1',
  title: '阅读',
  description: '',
  feedbackModel: { type: 'experience' },
  importanceSuggestion: 3,
  desiredCadenceDays: null,
  minimumRestHours: 0,
  defaultEnergyCost: 2,
  suggestedActivities: [{
    title: '读十分钟',
    description: '',
    minimumMinutes: 10,
    maximumMinutes: 20,
    energyCost: 2,
    contexts: [],
    minimumRestHours: null,
    suggestedCadenceDays: null,
  }],
  clarificationNeeded: false,
  clarificationQuestions: [],
});

const log = (id: string, startedAt: number, result: AiInteractionLog['result'] = 'success'): AiInteractionLog => ({
  id,
  requestType: 'goal-draft',
  providerModel: 'model-1',
  schemaVersion: 'goal-draft-v1',
  inputSummary: 'GoalDraft request (12 characters)',
  validatedOutput: result === 'success' ? output() : null,
  startedAt,
  durationMs: 500,
  result,
});

const unsafeHistories: unknown[] = [
  [{ ...log('extra', 1), rawInput: 'secret' }],
  [{ ...log('bad-summary', 1), inputSummary: 'secret preview' }],
  [{ ...log('failed-output', 1, 'timeout'), validatedOutput: output() }],
  [{ ...log('missing-output', 1), validatedOutput: null }],
  [log('same', 1), log('same', 2)],
];

describe('AI interaction history', () => {
  it('builds a content-free input summary from Unicode character count', () => {
    expect(buildGoalDraftInputSummary('目标🙂')).toBe('GoalDraft request (3 characters)');
  });

  it('accepts strict success and failure records', () => {
    expect(normalizeAiInteractionHistory([log('success', 1), log('timeout', 2, 'timeout')])).toHaveLength(2);
  });

  it.each(unsafeHistories)('rejects unsafe history %o', (history) => {
    expect(() => normalizeAiInteractionHistory(history)).toThrow();
  });

  it('deterministically removes the oldest by startedAt then id at 51 entries', () => {
    const existing = Array.from({ length: 50 }, (_, index) => log(`id-${String(index).padStart(2, '0')}`, 100 + index));
    const result = appendAiInteraction(existing, log('new', 999));

    expect(result.appended).toBe(true);
    expect(result.history).toHaveLength(50);
    expect(result.history.some((entry) => entry.id === 'id-00')).toBe(false);
    expect(result.history.some((entry) => entry.id === 'new')).toBe(true);
  });

  it('does not retain a late-finishing candidate that is oldest when history is full', () => {
    const existing = Array.from({ length: 50 }, (_, index) => log(`current-${index}`, 100 + index));

    expect(appendAiInteraction(existing, log('late-oldest', 1))).toEqual({
      history: existing,
      appended: false,
      warning: 'history-limit',
    });
  });

  it('removes oldest records until the UTF-8 history fits one MiB', () => {
    const largeOutput = (): AiGoalDraft => {
      const base = output();
      const baseActivity = base.suggestedActivities[0]!;
      return {
        ...base,
        description: '🙂'.repeat(1_000),
        suggestedActivities: Array.from({ length: 5 }, (_, index) => ({
          ...baseActivity,
          title: `活动 ${index}`,
          description: '🙂'.repeat(1_000),
          contexts: Array.from({ length: 10 }, (__, contextIndex) => `${contextIndex}${'🙂'.repeat(19)}`),
        })),
      };
    };
    const existing = Array.from({ length: 35 }, (_, index) => ({
      ...log(`large-${String(index).padStart(2, '0')}`, index),
      validatedOutput: largeOutput(),
    }));
    const result = appendAiInteraction(existing, { ...log('new', 999), validatedOutput: largeOutput() });

    expect(result.appended).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(result.history)).byteLength).toBeLessThanOrEqual(1_048_576);
    expect(result.history.length).toBeLessThan(existing.length + 1);
    expect(result.history.at(-1)?.id).toBe('new');
  });
});
