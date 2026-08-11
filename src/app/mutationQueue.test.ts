/**
 * 模块名称：应用 mutation queue 测试
 * 职责描述：验证任务严格串行、单个失败向调用方传播且不会毒化后续 tail
 * 输入/输出：排入受控 Promise action，并断言执行顺序与各自结果
 * 依赖关系：Vitest、MutationQueue
 * 注意事项：队列只负责编排，不吞掉当前任务自身错误
 */
import { describe, expect, it } from 'vitest';
import { MutationQueue } from './mutationQueue';

describe('MutationQueue', () => {
  it('runs tasks in insertion order without overlap', async () => {
    const queue = new MutationQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = queue.run(async () => {
      events.push('first:start');
      await gate;
      events.push('first:end');
      return 1;
    });
    const second = queue.run(async () => {
      events.push('second:start');
      events.push('second:end');
      return 2;
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('rejects the failed caller but starts the next task from a recovered tail', async () => {
    const queue = new MutationQueue();
    const failed = queue.run(async () => { throw new Error('replace failed'); });
    const recovered = queue.run(async () => 'next succeeded');

    await expect(failed).rejects.toThrow('replace failed');
    await expect(recovered).resolves.toBe('next succeeded');
  });
});
