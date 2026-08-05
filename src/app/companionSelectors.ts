/**
 * 模块名称：伙伴运行时视图 selector
 * 职责描述：从 schema v2 事实与显式时间派生伙伴投影、活动状态、解锁和心情
 * 输入/输出：接收 AppSnapshot/now/localHour，输出不持久化的 CompanionView
 * 依赖关系：ActivityStateEngine、RewardEngine、ValidationError 与应用快照
 * 注意事项：忽略持久 CompanionProjection.mood，且任何派生值都不得成为 Roll 输入
 */
import { calculateActivityState } from '../modules/companion/activityStateEngine';
import type { CompanionMood, CompanionUnlockId, CompanionView } from '../modules/companion/types';
import { ValidationError } from '../modules/goals/validation';
import { compareRewardLedgerEntries, replayRewardLedger } from '../modules/rewards/rewardEngine';
import type { AppSnapshot } from './ports';

const CELEBRATION_MS = 2_000;
const UNLOCKS: ReadonlyArray<{ id: CompanionUnlockId; threshold: number }> = [
  { id: 'desk-book', threshold: 50 },
  { id: 'window-plant', threshold: 150 },
  { id: 'photo-string', threshold: 300 },
];

const validateTime = (now: number, localHour: number): void => {
  if (!Number.isFinite(now)) throw new ValidationError('CompanionView now 必须是有限数字');
  if (!Number.isInteger(localHour) || localHour < 0 || localHour > 23) {
    throw new ValidationError('CompanionView localHour 必须是 0–23 的整数');
  }
};

export const selectCompanionRefreshDelay = (celebratingUntil: number | null, now: number): number | null =>
  celebratingUntil !== null && celebratingUntil > now ? celebratingUntil - now : null;

export const selectCompanionView = (
  snapshot: AppSnapshot,
  time: { now: number; localHour: number },
): CompanionView => {
  validateTime(time.now, time.localHour);
  const projection = replayRewardLedger(snapshot.rewardEntries);
  const activityState = calculateActivityState({ sessions: snapshot.sessions, now: time.now });
  const unlocks = UNLOCKS.filter((unlock) => projection.highestXp >= unlock.threshold).map((unlock) => unlock.id);

  const working = snapshot.sessions.some((session) => session.status === 'running' || session.status === 'paused');
  const latestSettlement = snapshot.rewardEntries
    .filter((entry) =>
      entry.entryType === 'settlement' &&
      entry.createdAt > time.now - CELEBRATION_MS &&
      entry.createdAt <= time.now)
    .sort(compareRewardLedgerEntries)
    .at(-1);
  const latestWasReversed = latestSettlement
    ? snapshot.rewardEntries.some((entry) =>
      entry.entryType === 'reversal' &&
      entry.reversalOfEntryId === latestSettlement.id &&
      entry.createdAt <= time.now)
    : false;
  const celebrating = Boolean(latestSettlement && !latestWasReversed);

  let mood: CompanionMood = 'idle';
  if (working) mood = 'working';
  else if (celebrating) mood = 'celebrating';
  else if (time.localHour >= 22 || time.localHour < 7) mood = 'sleeping';

  return {
    projection,
    activityState,
    unlocks,
    mood,
    celebratingUntil: mood === 'celebrating' ? latestSettlement!.createdAt + CELEBRATION_MS : null,
  };
};
