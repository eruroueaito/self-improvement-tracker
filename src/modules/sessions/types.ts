/**
 * 模块名称：专注与结算领域类型
 * 职责描述：定义计时 Session、结束类型和人工 Settlement 数据结构
 * 输入/输出：供状态机、奖励、存储和 UI 共享稳定类型
 * 依赖关系：无外部依赖
 * 注意事项：持久时间统一使用 Unix epoch 毫秒
 */
export type TimerMode = 'flowtime' | 'countdown';
export type SessionStatus = 'running' | 'paused' | 'ended' | 'settled' | 'voided';
export type SessionEndType = 'completed' | 'interrupted' | 'abandoned';

export interface Settlement {
  actualMinutes: number;
  completionRatio: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  effort: 1 | 2 | 3 | 4 | 5 | null;
  quantity: number | null;
  quantityUnit: string | null;
  userNote: string;
}

export interface Session {
  id: string;
  goalId: string;
  activityTemplateId: string;
  recommendationRunId: string | null;
  timerMode: TimerMode;
  status: SessionStatus;
  plannedMinutes: number | null;
  startedAt: number;
  runningSince: number | null;
  accumulatedMs: number;
  targetDurationMs: number | null;
  lastHeartbeatAt: number;
  endedAt: number | null;
  endType: SessionEndType | null;
  settlement: Settlement | null;
  createdAt: number;
  settledAt: number | null;
}

export type SessionEndAction = 'finish' | 'interrupt' | 'abandon';

export interface SettlementInput {
  actualMinutes: number;
  completionRatio: number;
  difficulty?: 1 | 2 | 3 | 4 | 5 | null;
  effort?: 1 | 2 | 3 | 4 | 5 | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  userNote?: string;
}
