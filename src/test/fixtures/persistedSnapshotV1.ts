/**
 * 模块名称：v1 持久化快照测试夹具
 * 职责描述：保留 998d494 时期的独立旧数据形状供迁移与适配器测试复用
 * 输入/输出：每次返回全新的空或典型 PersistedSnapshotV1
 * 依赖关系：v1 快照类型与奖励投影工厂
 * 注意事项：不得通过创建 v2 后删除 settings 来伪造旧数据
 */
import { emptyCompanionProjection } from '../../modules/rewards/rewardEngine';
import type { PersistedSnapshotV1 } from '../../app/snapshots';

export const createEmptyPersistedSnapshotV1 = (): PersistedSnapshotV1 => ({
  schemaVersion: 1,
  goals: [],
  activities: [],
  recommendationRuns: [],
  sessions: [],
  rewardEntries: [],
  companionProjection: emptyCompanionProjection(123),
});

export const createTypicalPersistedSnapshotV1 = (): PersistedSnapshotV1 => ({
  schemaVersion: 1,
  goals: [{
    id: 'goal-v1',
    title: '阅读计划',
    description: '保留旧数据的全部事实',
    status: 'active',
    importance: 5,
    feedback: { type: 'progress', baseline: 0, target: 100, unit: '页' },
    desiredCadenceDays: 1,
    minimumRestHours: 0,
    defaultEnergyCost: 1,
    createdAt: 1,
    updatedAt: Number.MAX_SAFE_INTEGER,
  }],
  activities: [{
    id: 'activity-v1',
    goalId: 'goal-v1',
    title: '读一页',
    description: '',
    minimumMinutes: 1,
    maximumMinutes: 480,
    energyCost: 1,
    contexts: ['家', '通勤'],
    minimumRestHours: null,
    suggestedCadenceDays: null,
    rewardWeight: 0.25,
    createdAt: 1,
    archivedAt: null,
  }],
  recommendationRuns: [],
  sessions: [],
  rewardEntries: [],
  companionProjection: emptyCompanionProjection(123),
});
