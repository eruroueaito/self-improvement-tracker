/**
 * 模块名称：目标领域类型
 * 职责描述：定义 Goal、ActivityTemplate 及反馈配置的稳定数据结构
 * 输入/输出：供应用用例、推荐、结算和存储模块共享类型
 * 依赖关系：无外部依赖
 * 注意事项：本模块只含领域数据，不访问 UI 或平台 API
 */
export type GoalStatus = 'active' | 'paused' | 'archived';

export type FeedbackConfig =
  | { type: 'progress'; baseline: number; target: number; unit: string }
  | { type: 'cumulative'; unit: 'minutes' | 'times' }
  | { type: 'experience' };

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  importance: 1 | 2 | 3 | 4 | 5;
  feedback: FeedbackConfig;
  desiredCadenceDays: number | null;
  minimumRestHours: number;
  defaultEnergyCost: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityTemplate {
  id: string;
  goalId: string;
  title: string;
  description: string;
  minimumMinutes: number;
  maximumMinutes: number;
  energyCost: 1 | 2 | 3 | 4 | 5;
  contexts: string[];
  minimumRestHours: number | null;
  suggestedCadenceDays: number | null;
  rewardWeight: number;
  createdAt: number;
  archivedAt: number | null;
}

export interface GoalDraft {
  title: string;
  description?: string;
  importance: 1 | 2 | 3 | 4 | 5;
  feedback: FeedbackConfig;
  desiredCadenceDays?: number | null;
  minimumRestHours?: number;
  defaultEnergyCost: 1 | 2 | 3 | 4 | 5;
}

export interface ActivityDraft {
  title: string;
  description?: string;
  minimumMinutes: number;
  maximumMinutes: number;
  energyCost: 1 | 2 | 3 | 4 | 5;
  contexts?: string[];
  minimumRestHours?: number | null;
  suggestedCadenceDays?: number | null;
  rewardWeight?: number;
}
