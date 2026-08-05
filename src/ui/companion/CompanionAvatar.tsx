/**
 * 模块名称：原创 CSS 像素伙伴
 * 职责描述：以单一语义 DOM 骨架渲染三阶段、四状态的本地伙伴
 * 输入/输出：接收 stage/mood/size/motion，输出无远程资产的可访问图形
 * 依赖关系：伙伴运行时类型、AppSettings、共享中文展示映射
 * 注意事项：所有状态都有静态形态和文字，不能只依赖颜色或动画表达
 */
import type { CompanionMood, CompanionStage } from '../../modules/companion/types';
import type { AppSettings } from '../../modules/settings/settings';
import { companionMoodLabel, companionStageLabel } from '../shared/presentation';

export function CompanionAvatar(props: {
  stage: CompanionStage;
  mood: CompanionMood;
  size: 'compact' | 'expanded';
  motion: AppSettings['motion'];
}) {
  const stageLabel = companionStageLabel(props.stage);
  const moodLabel = companionMoodLabel(props.mood);

  return (
    <div
      className={`companion-avatar companion-stage-${props.stage} companion-mood-${props.mood} companion-size-${props.size} motion-${props.motion}`}
      data-stage={props.stage}
      data-mood={props.mood}
      role="img"
      aria-label={`${stageLabel}，${moodLabel}`}
    >
      <span className="companion-shadow" data-part="shadow" aria-hidden="true" />
      <span className="companion-body" data-part="body" aria-hidden="true" />
      <span className="companion-leaf leaf-left" data-part="leaf-left" aria-hidden="true" />
      <span className="companion-leaf leaf-right" data-part="leaf-right" aria-hidden="true" />
      <span className="companion-leaf leaf-center" data-part="leaf-center" aria-hidden="true" />
      <span className="companion-eyes" data-part="eyes" aria-hidden="true"><i /><i /></span>
      <span className="companion-mouth" data-part="mouth" aria-hidden="true" />
      <span className="companion-arms" data-part="arms" aria-hidden="true"><i /><i /></span>
      <span className="companion-legs" data-part="legs" aria-hidden="true"><i /><i /></span>
      <span className="companion-stars" data-part="stars" aria-hidden="true"><i>✦</i><i>✦</i></span>
      <span className="companion-sleep-z" data-part="sleep-z" aria-hidden="true">Z</span>
      <span className="companion-blush" data-part="blush" aria-hidden="true"><i /><i /></span>
      <span className="companion-glow" data-part="glow" aria-hidden="true" />
      <span className="sr-only">{moodLabel}</span>
    </div>
  );
}
