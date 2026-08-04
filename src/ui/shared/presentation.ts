/**
 * 模块名称：共享展示映射
 * 职责描述：把宠物阶段和 Roll 理由代码映射为稳定的本地展示文本
 * 输入/输出：接收领域枚举或代码，输出 emoji 或中文标签
 * 依赖关系：应用快照类型
 * 注意事项：只做展示映射，不参与领域评分和奖励计算
 */
import type { AppSnapshot } from '../../app/ports';

export const companionEmoji = (stage: AppSnapshot['companionProjection']['evolutionStage']): string =>
  stage === 'companion' ? '🐣' : stage === 'sprout' ? '🌱' : '🌰';

export const reasonLabel = (code: string): string => ({
  'cadence-due': '到了计划节奏',
  'fits-time': '适合当前时间',
  'fits-energy': '适合当前精力',
  'adds-variety': '平衡近期投入',
  'recently-dismissed': '最近暂不想做',
  'recently-completed': '最近刚完成过',
})[code] ?? code;
