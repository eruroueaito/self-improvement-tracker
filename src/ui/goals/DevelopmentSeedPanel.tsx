/**
 * 模块名称：开发种子面板
 * 职责描述：在开发构建中显式安装、清理和重装确定性 Goal/Activity 演示数据
 * 输入/输出：接收安装状态与应用命令回调，输出需二次确认的开发操作按钮
 * 依赖关系：React、浏览器 confirm
 * 注意事项：本组件只能由 import.meta.env.DEV 分支渲染，不得自动执行或暴露到 window
 */
export function DevelopmentSeedPanel(props: {
  installed: boolean;
  busy: boolean;
  onInstall: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const install = async (): Promise<void> => {
    if (!window.confirm('安装 3 个 Goal 和 6 个 Activity 的本机开发种子吗？')) return;
    await props.onInstall();
  };
  const clear = async (): Promise<void> => {
    if (!window.confirm('清除全部 dev-seed: 演示事实及其专注、奖励引用吗？此操作不可撤销。')) return;
    await props.onClear();
  };

  return (
    <details className="development-seed">
      <summary>开发种子数据</summary>
      <div className="stack development-seed-body">
        <p>仅用于本地开发：3 个 Goal、6 个 Activity，覆盖 progress、累计分钟和 experience。</p>
        <p className="seed-status" role="status">{props.installed ? '开发种子已安装' : '开发种子未安装'}</p>
        <div className="actions">
          <button disabled={props.busy || props.installed} onClick={() => void install()}>安装开发种子</button>
          <button className="danger" disabled={props.busy || !props.installed} onClick={() => void clear()}>清除开发种子</button>
        </div>
      </div>
    </details>
  );
}
