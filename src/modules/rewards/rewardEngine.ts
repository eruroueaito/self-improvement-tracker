/**
 * 模块名称：奖励规则引擎 v1
 * 职责描述：确定性计算结算 XP、创建账本记录并从账本重建宠物投影
 * 输入/输出：接收 Session/活动权重/重复次数，输出 XP 或不可变账本投影
 * 依赖关系：Session 与 Rewards 领域类型
 * 注意事项：所有奖励都受幂等键保护，撤销通过反向账目完成
 */
import type { Session } from '../sessions/types';
import type { CompanionProjection, RewardLedgerEntry, RewardReplayState } from './types';

const baseXp = (minutes: number): number => {
  if (minutes < 5) return 0;
  if (minutes < 15) return 5;
  if (minutes < 25) return 12;
  if (minutes < 45) return 20;
  if (minutes < 60) return 30;
  return 40;
};

const effortMultiplier: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.9,
  2: 0.975,
  3: 1.05,
  4: 1.125,
  5: 1.2,
};

export const calculateXp = (session: Session, rewardWeight: number, repeatIndex: number): number => {
  if (!session.settlement || session.endType === 'abandoned' || session.settlement.completionRatio <= 0) return 0;
  const repeatMultiplier = repeatIndex === 0 ? 1 : repeatIndex === 1 ? 0.5 : 0;
  const effort = session.settlement.effort === null ? 1 : effortMultiplier[session.settlement.effort];
  return Math.min(50, Math.max(0, Math.round(
    baseXp(session.settlement.actualMinutes) *
      session.settlement.completionRatio *
      effort *
      rewardWeight *
      repeatMultiplier,
  )));
};

const stageFor = (xp: number): CompanionProjection['evolutionStage'] =>
  xp >= 300 ? 'companion' : xp >= 100 ? 'sprout' : 'seed';

const entryTypeOrder: Record<RewardLedgerEntry['entryType'], number> = { settlement: 0, reversal: 1 };

export const compareRewardLedgerEntries = (left: RewardLedgerEntry, right: RewardLedgerEntry): number =>
  left.createdAt - right.createdAt ||
  entryTypeOrder[left.entryType] - entryTypeOrder[right.entryType] ||
  left.id.localeCompare(right.id);

export const replayRewardLedger = (entries: RewardLedgerEntry[]): RewardReplayState => {
  let runningXp = 0;
  let highestXp = 0;
  for (const entry of [...entries].sort(compareRewardLedgerEntries)) {
    runningXp += entry.globalXpDelta;
    highestXp = Math.max(highestXp, runningXp);
  }
  const currentXp = Math.max(0, runningXp);
  highestXp = Math.max(0, highestXp);
  return {
    currentXp,
    highestXp,
    level: Math.floor(highestXp / 50) + 1,
    evolutionStage: stageFor(highestXp),
  };
};

export const rebuildCompanionProjection = (entries: RewardLedgerEntry[], now: number): CompanionProjection => {
  const replay = replayRewardLedger(entries);
  return {
    globalXp: replay.currentXp,
    level: replay.level,
    evolutionStage: replay.evolutionStage,
    mood: 'idle',
    lastUpdatedAt: now,
  };
};

export const emptyCompanionProjection = (now: number): CompanionProjection => ({
  globalXp: 0,
  level: 1,
  evolutionStage: 'seed',
  mood: 'idle',
  lastUpdatedAt: now,
});
