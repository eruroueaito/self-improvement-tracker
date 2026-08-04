/**
 * 模块名称：目标校验单元测试
 * 职责描述：验证目标、活动与场景标准化的边界行为
 * 输入/输出：构造领域草稿并断言标准化结果或 ValidationError
 * 依赖关系：Vitest、目标校验模块
 * 注意事项：覆盖会影响持久数据合法性的关键边界
 */
import { describe, expect, it } from 'vitest';
import { normalizeActivityDraft, normalizeContexts, normalizeGoalDraft } from './validation';

describe('goal validation', () => {
  it('normalizes text, contexts and defaults', () => {
    const goal = normalizeGoalDraft({
      title: '  阅读  ',
      importance: 3,
      feedback: { type: 'cumulative', unit: 'times' },
      defaultEnergyCost: 2,
    });
    const activity = normalizeActivityDraft({
      title: '  读十页 ',
      minimumMinutes: 10,
      maximumMinutes: 30,
      energyCost: 2,
      contexts: [' 家 ', '家', 'QUIET'],
    });

    expect(goal.title).toBe('阅读');
    expect(goal.minimumRestHours).toBe(0);
    expect(activity.contexts).toEqual(['quiet', '家']);
    expect(activity.rewardWeight).toBe(1);
    expect(normalizeContexts([' B ', 'a', 'A'])).toEqual(['a', 'b']);
  });

  it('rejects impossible minute ranges and progress bounds', () => {
    expect(() => normalizeActivityDraft({ title: 'x', minimumMinutes: 31, maximumMinutes: 30, energyCost: 3 })).toThrow(/最长时长/);
    expect(() => normalizeGoalDraft({
      title: 'x', importance: 3, defaultEnergyCost: 3,
      feedback: { type: 'progress', baseline: 11, target: 10, unit: '页' },
    })).toThrow(/当前起点/);
  });
});
