/**
 * 模块名称：MVP 应用集成测试
 * 职责描述：验证 Goals → Roll → Session → Settlement → Reward → Undo → Export/Import 的离线闭环
 * 输入/输出：以可控时间和内存端口执行真实应用用例并断言原子快照
 * 依赖关系：Vitest、MvpApplication、MemoryStore、应用端口
 * 注意事项：该测试覆盖跨模块幂等性，不绕过应用门面写事实
 */
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../adapters/memory/memoryStore';
import type { Clock, ExportFilePort, IdGenerator, NotificationPort } from './ports';
import { MvpApplication } from './mvpApplication';

class FakeClock implements Clock {
  value = 1_000_000;
  now(): number { return this.value; }
}

class FakeIds implements IdGenerator {
  private value = 0;
  next(): string { this.value += 1; return `id-${this.value}`; }
}

const notifications: NotificationPort = {
  async scheduleCountdown() {},
  async cancelCountdown() {},
};
const exportFiles: ExportFilePort = { async save() {} };

describe('MvpApplication offline loop', () => {
  it('persists a full idempotent loop and restores it through export/import', async () => {
    const clock = new FakeClock();
    const app = new MvpApplication(new MemoryStore(), clock, new FakeIds(), notifications, exportFiles);
    await app.initialize();
    await app.createGoal(
      { title: '阅读', importance: 4, feedback: { type: 'cumulative', unit: 'times' }, defaultEnergyCost: 2 },
      { title: '读十页', minimumMinutes: 10, maximumMinutes: 30, energyCost: 2 },
    );
    const createdSnapshot = app.getSnapshot();
    await app.updateGoal(
      createdSnapshot.goals[0]!.id,
      { title: '阅读计划', importance: 4, feedback: { type: 'cumulative', unit: 'times' }, defaultEnergyCost: 2 },
      createdSnapshot.activities[0]!.id,
      { title: '读十页', minimumMinutes: 10, maximumMinutes: 30, energyCost: 2 },
    );
    const rolled = await app.roll({ availableMinutes: 25, energy: 2, contexts: [] });
    const activityId = rolled.run.candidates[0]!.activityTemplateId;
    const started = await app.startSession({ runId: rolled.run.id, activityId, timerMode: 'flowtime', plannedMinutes: null });
    clock.value += 25 * 60_000;
    await app.end(started.id, 'finish');
    const firstReward = await app.settle(started.id, { actualMinutes: 25, completionRatio: 1, effort: 3, difficulty: 3 });
    const duplicateReward = await app.settle(started.id, { actualMinutes: 25, completionRatio: 1 });
    expect(duplicateReward.id).toBe(firstReward.id);
    expect(app.getSnapshot().companionProjection.globalXp).toBe(21);

    await app.undoSettlement(started.id);
    const duplicateUndo = await app.undoSettlement(started.id);
    expect(duplicateUndo.entryType).toBe('reversal');
    expect(app.getSnapshot().rewardEntries).toHaveLength(2);
    expect(app.getSnapshot().companionProjection.globalXp).toBe(0);

    const exported = app.exportData();
    const invalid = JSON.parse(exported);
    invalid.data.activities[0].goalId = 'missing-goal';
    expect(() => app.previewImport(JSON.stringify(invalid))).toThrow(/不存在的目标/);
    expect(app.getSnapshot().goals[0]?.title).toBe('阅读计划');
    await app.clearAllData();
    expect(app.getSnapshot().goals).toHaveLength(0);
    const preview = app.previewImport(exported);
    expect(preview).toMatchObject({ sourceVersion: 2, goalCount: 1, activityCount: 1, sessionCount: 1, rewardCount: 2 });
    expect(app.getSnapshot().goals).toHaveLength(0);
    await app.confirmImport(exported);
    expect(app.getSnapshot().goals[0]?.title).toBe('阅读计划');
    expect(app.getSnapshot().sessions[0]?.status).toBe('voided');
    expect(app.getSnapshot().companionProjection.globalXp).toBe(0);
  });
});
