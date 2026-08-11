/**
 * 模块名称：应用 mutation queue
 * 职责描述：按进入顺序串行执行快照 mutation，并在单个任务失败后恢复内部 tail
 * 输入/输出：接收返回 Promise 的窄 action；向各调用方返回其自身成功值或原始错误
 * 依赖关系：无外部依赖
 * 注意事项：队列不读取或复制快照；action 必须在真正开始执行后再读取最新状态
 */
export class MutationQueue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(action: () => Promise<T>): Promise<T> {
    const current = this.tail.then(action);
    this.tail = current.then(
      () => undefined,
      () => undefined,
    );
    return current;
  }
}
