/**
 * 模块名称：Goal 反馈卡
 * 职责描述：以可访问方式展示 progress、cumulative 或 experience 派生反馈
 * 输入/输出：接收 GoalFeedbackView，输出文本或带 aria 数值的进度条
 * 依赖关系：React、应用选择器视图类型
 * 注意事项：只有 progress 展示比例；累计与经验不得伪造百分比
 */
import type { CSSProperties } from 'react';
import type { GoalFeedbackView } from '../../app/selectors';

export function GoalFeedbackCard(props: { feedback: GoalFeedbackView }) {
  const label = props.feedback.type === 'progress'
    ? '数值进度'
    : props.feedback.type === 'experience'
      ? '经验反馈'
      : props.feedback.unit === 'times' ? '累计次数' : '累计分钟';

  return (
    <section className="card feedback-card" aria-labelledby="goal-feedback-title">
      <p className="eyebrow">{label}</p>
      <h2 id="goal-feedback-title">{props.feedback.primary}</h2>
      {props.feedback.ratio !== null && (
        <div
          className="feedback-progress"
          role="progressbar"
          aria-label="目标进度"
          aria-valuemin={props.feedback.baseline ?? 0}
          aria-valuenow={props.feedback.value}
          aria-valuemax={props.feedback.target ?? props.feedback.value}
        >
          <span style={{ '--feedback-ratio': `${props.feedback.ratio * 100}%` } as CSSProperties} />
        </div>
      )}
    </section>
  );
}
