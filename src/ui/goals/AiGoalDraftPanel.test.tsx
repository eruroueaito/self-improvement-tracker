/**
 * 模块名称：AI GoalDraft 面板测试
 * 职责描述：验证主动生成、取消、临时编辑与确认前本地映射，不回归手动创建入口
 * 输入/输出：模拟用户输入和受控 outcome，断言 AbortSignal、草稿字段和原子确认回调
 * 依赖关系：Testing Library、user-event、Vitest、AiGoalDraftPanel
 * 注意事项：失败/取消保留自然语言输入；模型结果未经确认不得调用 onConfirm
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AiGoalDraft } from '../../modules/ai/goalDraftSchema';
import { AiGoalDraftPanel } from './AiGoalDraftPanel';

const draft = (): AiGoalDraft => ({
  schemaVersion: 'goal-draft-v1', title: '阅读计划', description: '',
  feedbackModel: { type: 'experience' }, importanceSuggestion: 3,
  desiredCadenceDays: 1, minimumRestHours: 0, defaultEnergyCost: 2,
  suggestedActivities: [{
    title: '读十分钟', description: '', minimumMinutes: 10, maximumMinutes: 30,
    energyCost: 2, contexts: ['home'], minimumRestHours: null, suggestedCadenceDays: 1,
  }], clarificationNeeded: false, clarificationQuestions: [],
});

describe('AiGoalDraftPanel', () => {
  it('discloses destination, generates once, edits and confirms 1 Goal with Activities', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn(async () => ({
      ok: true as const, draft: draft(), interactionCandidate: null, historyWarning: null,
    }));
    const onConfirm = vi.fn(async () => true);
    render(<AiGoalDraftPanel
      endpointHost="provider.invalid"
      model="fixture-model"
      busy={false}
      onGenerate={onGenerate}
      onConfirm={onConfirm}
    />);

    expect(screen.getByText(/provider\.invalid/)).not.toBeNull();
    await user.type(screen.getByLabelText('用自然语言描述目标'), '我想多阅读');
    await user.click(screen.getByRole('button', { name: '生成可编辑草稿' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    await user.clear(screen.getByLabelText('草稿目标名称'));
    await user.type(screen.getByLabelText('草稿目标名称'), '更新后的阅读');
    await user.clear(screen.getByLabelText('活动 1 名称'));
    await user.type(screen.getByLabelText('活动 1 名称'), '每天读书');
    await user.click(screen.getByRole('button', { name: '确认并保存到本机' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '更新后的阅读' }),
      [expect.objectContaining({ title: '每天读书' })],
    );
  });

  it('aborts an in-flight request and keeps the original input without confirming', async () => {
    const user = userEvent.setup();
    let capturedSignal: AbortSignal | null = null;
    const onGenerate = vi.fn(async (_input: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    });
    const onConfirm = vi.fn(async () => true);
    render(<AiGoalDraftPanel
      endpointHost="provider.invalid"
      model="fixture-model"
      busy={false}
      onGenerate={onGenerate}
      onConfirm={onConfirm}
    />);
    const input = screen.getByLabelText('用自然语言描述目标') as HTMLTextAreaElement;
    await user.type(input, '保留这段输入');
    await user.click(screen.getByRole('button', { name: '生成可编辑草稿' }));
    await user.click(screen.getByRole('button', { name: '取消生成' }));

    expect((capturedSignal as unknown as AbortSignal).aborted).toBe(true);
    expect(input.value).toBe('保留这段输入');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
