/**
 * 模块名称：推荐领域类型
 * 职责描述：定义 Roll 输入、候选、运行记录与无候选原因
 * 输入/输出：供 RollEngine、应用层、存储和 UI 共享类型
 * 依赖关系：无外部依赖
 * 注意事项：候选顺序必须可由持久字段完全重放
 */
export interface RollContext {
  availableMinutes: number;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  contexts: string[];
}

export interface RecommendationCandidate {
  activityTemplateId: string;
  goalId: string;
  suggestedMinutes: number;
  score: number;
  scoreParts: Record<string, number>;
  reasonCodes: string[];
}

export interface RecommendationRun {
  id: string;
  requestedAt: number;
  context: RollContext;
  candidates: RecommendationCandidate[];
  chosenActivityTemplateId: string | null;
  dismissedActivityTemplateIds: string[];
}

export type EmptyRollReason = 'no-active-goals' | 'time-too-short' | 'context-mismatch' | 'resting';

export interface RollResult {
  run: RecommendationRun;
  emptyReason: EmptyRollReason | null;
}
