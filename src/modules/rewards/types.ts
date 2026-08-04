/**
 * 模块名称：奖励领域类型
 * 职责描述：定义奖励账本事实与可重建宠物投影
 * 输入/输出：供 RewardEngine、应用层、存储与 UI 共享类型
 * 依赖关系：无外部依赖
 * 注意事项：RewardLedgerEntry 是事实来源，投影不得被独立信任
 */
export interface RewardLedgerEntry {
  id: string;
  sessionId: string;
  goalId: string;
  entryType: 'settlement' | 'reversal';
  globalXpDelta: number;
  goalXpDelta: number;
  ruleVersion: 1;
  idempotencyKey: string;
  reversalOfEntryId: string | null;
  createdAt: number;
}

export interface CompanionProjection {
  globalXp: number;
  level: number;
  evolutionStage: 'seed' | 'sprout' | 'companion';
  mood: 'idle' | 'working' | 'celebrating' | 'sleeping';
  lastUpdatedAt: number;
}
