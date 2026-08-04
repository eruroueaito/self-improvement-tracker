/**
 * 模块名称：测试环境初始化
 * 职责描述：为 Vitest DOM 测试安装通用清理逻辑
 * 输入/输出：每个测试后清理已挂载的 React 组件
 * 依赖关系：Testing Library、Vitest
 * 注意事项：不得写入产品运行时状态
 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node 25 会暴露一个没有 backing file 的不完整 localStorage；测试需模拟浏览器的同步 Storage 合约。
if (typeof globalThis.localStorage?.clear !== 'function') {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    },
  });
}

afterEach(() => cleanup());
