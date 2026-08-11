/**
 * 模块名称：伙伴中性占位
 * 职责描述：保留三阶段、四状态的语义契约，暂不渲染实际伙伴美术
 * 输入/输出：接收 stage/mood/size/motion，输出无装饰动画的可访问占位
 * 依赖关系：伙伴运行时类型、AppSettings、共享中文展示映射
 * 注意事项：占位表现不得暗示最终造型；状态始终以文字和稳定属性表达
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
      <span className="companion-placeholder" data-part="placeholder">
        <span className="companion-placeholder-title">伙伴占位</span>
        <span className="companion-placeholder-stage">{stageLabel}</span>
        <span className="companion-placeholder-mood">{moodLabel}</span>
      </span>
    </div>
  );
}
