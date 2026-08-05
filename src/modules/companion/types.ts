/**
 * 模块名称：伙伴运行时类型
 * 职责描述：定义不持久化的活动状态、心情与解锁标识
 * 输入/输出：供伙伴领域引擎、应用 selector 与 UI 共享只读类型
 * 依赖关系：奖励投影类型
 * 注意事项：这些类型不是 schema v2 事实，禁止直接写入 Store 或导出文件
 */
import type { CompanionProjection } from '../rewards/types';

export interface ActivityStateV1 {
  version: 1;
  score: number;
  activeDays7: number;
  distinctGoals14: number;
  recentActivityPoints: number;
  breadthPoints: number;
}

export type CompanionMood = 'idle' | 'working' | 'celebrating' | 'sleeping';
export type CompanionStage = CompanionProjection['evolutionStage'];
export type CompanionUnlockId = 'desk-book' | 'window-plant' | 'photo-string';
