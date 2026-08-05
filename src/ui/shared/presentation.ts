/**
 * 模块名称：共享展示映射
 * 职责描述：把伙伴状态、解锁和 Roll 理由代码映射为稳定的本地展示文本
 * 输入/输出：接收领域枚举或代码，输出中文标签
 * 依赖关系：伙伴运行时类型
 * 注意事项：只做展示映射，不参与领域评分和奖励计算
 */
import type { CompanionMood, CompanionStage } from '../../modules/companion/types';

export const companionStageLabel = (stage: CompanionStage): string => ({
  seed: '种子伙伴',
  sprout: '新芽伙伴',
  companion: '成长伙伴',
})[stage];

export const companionMoodLabel = (mood: CompanionMood): string => ({
  idle: '安静陪伴',
  working: '正在专注',
  celebrating: '刚刚完成',
  sleeping: '安静休息',
})[mood];

export const activityStateLabel = (score: number): string =>
  score === 0 ? '安静陪伴' : score < 50 ? '最近有行动' : '稳步积累';

export const companionUnlockLabel = (id: string): string => ({
  'desk-book': '桌边小书',
  'window-plant': '窗边小植株',
  'photo-string': '照片挂绳',
})[id] ?? id;

export const reasonLabel = (code: string): string => ({
  'cadence-due': '到了计划节奏',
  'fits-time': '适合当前时间',
  'fits-energy': '适合当前精力',
  'adds-variety': '平衡近期投入',
  'recently-dismissed': '最近暂不想做',
  'recently-completed': '最近刚完成过',
})[code] ?? code;
