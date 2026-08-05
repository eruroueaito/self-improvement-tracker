/**
 * 模块名称：原创 CSS 伙伴组件测试
 * 职责描述：验证 3×4 状态矩阵、可访问文本、静态标记与 motion class
 * 输入/输出：渲染 CompanionAvatar，断言稳定 DOM 契约
 * 依赖关系：Testing Library、Vitest、CompanionAvatar、展示映射
 * 注意事项：实际 computed style 由 production Playwright 验收，本测试不以 class 冒充视觉证据
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CompanionMood, CompanionStage } from '../../modules/companion/types';
import { companionUnlockLabel } from '../shared/presentation';
import { CompanionAvatar } from './CompanionAvatar';

const stages: CompanionStage[] = ['seed', 'sprout', 'companion'];
const moods: CompanionMood[] = ['idle', 'working', 'celebrating', 'sleeping'];
const stageLabels: Record<CompanionStage, string> = { seed: '种子伙伴', sprout: '新芽伙伴', companion: '成长伙伴' };
const moodLabels: Record<CompanionMood, string> = { idle: '安静陪伴', working: '正在专注', celebrating: '刚刚完成', sleeping: '安静休息' };

describe('CompanionAvatar', () => {
  it.each(stages.flatMap((stage) => moods.map((mood) => [stage, mood] as const)))(
    'renders accessible static state %s/%s',
    (stage, mood) => {
      const { container } = render(<CompanionAvatar stage={stage} mood={mood} size="expanded" motion="system" />);
      const avatar = screen.getByRole('img', { name: `${stageLabels[stage]}，${moodLabels[mood]}` });
      expect([...avatar.classList]).toEqual(expect.arrayContaining(['companion-avatar', `companion-stage-${stage}`, `companion-mood-${mood}`, 'companion-size-expanded', 'motion-system']));
      expect(screen.getByText(moodLabels[mood])).not.toBeNull();
      expect(container.querySelector('[data-part="eyes"]')).not.toBeNull();
      expect(container.querySelector('[data-part="arms"]')).not.toBeNull();
      expect(container.querySelector('[data-part="stars"]')).not.toBeNull();
      expect(container.querySelector('[data-part="sleep-z"]')).not.toBeNull();
    },
  );

  it('uses one shared skeleton and unique class pairs for all 12 combinations', () => {
    const classes = new Set<string>();
    for (const stage of stages) {
      for (const mood of moods) {
        const { unmount } = render(<CompanionAvatar stage={stage} mood={mood} size="compact" motion="none" />);
        const avatar = screen.getByRole('img', { name: `${stageLabels[stage]}，${moodLabels[mood]}` });
        classes.add(`${avatar.getAttribute('data-stage')}/${avatar.getAttribute('data-mood')}`);
        expect(avatar.querySelectorAll('[data-part]').length).toBe(13);
        unmount();
      }
    }
    expect(classes.size).toBe(12);
  });

  it.each(['system', 'reduced', 'none'] as const)('uses the existing %s motion setting', (motion) => {
    render(<CompanionAvatar stage="seed" mood="idle" size="compact" motion={motion} />);
    expect(screen.getByRole('img').classList.contains(`motion-${motion}`)).toBe(true);
    expect(screen.getByRole('img').className).not.toContain('motion-full');
  });

  it('falls back to an unknown stable unlock ID', () => {
    expect(companionUnlockLabel('desk-book')).toBe('桌边小书');
    expect(companionUnlockLabel('future-local-item')).toBe('future-local-item');
  });
});
