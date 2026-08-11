/**
 * 模块名称：本地数据恢复页
 * 职责描述：在初始化失败时提供错误摘要、重试和可用时的白名单恢复导出
 * 输入/输出：接收恢复状态与命令回调，输出不会清除或改写数据库的最小错误界面
 * 依赖关系：RecoveryExport 的非秘密状态类型
 * 注意事项：页面不得提供自动清库；恢复文件内容只由应用层安全构造器生成
 */
import type { RecoveryExport } from '../../app/importExport';

export function RecoveryScreen(props: {
  error: string;
  recovery: Pick<RecoveryExport, 'sourceVersion' | 'settingsRecovered'> | null;
  busy: boolean;
  onRetry: () => Promise<void>;
  onExportRecovery: () => Promise<void>;
}) {
  return (
    <main className="recovery-page">
      <section className="card recovery-card">
        <p className="eyebrow">LOCAL DATA RECOVERY</p>
        <h1>无法打开本地数据</h1>
        <p>原始数据仍保留在本机，应用没有自动清库或覆盖它。</p>
        <div className="message error" role="alert">{props.error}</div>
        {props.recovery && (
          <div className="message notice" role="status">
            已从可验证事实准备 v{props.recovery.sourceVersion} 恢复文件。
            {props.recovery.settingsRecovered === false && ' 原设置包含非法字段，恢复文件已改用安全默认设置。'}
          </div>
        )}
        <div className="actions">
          <button className="button primary" disabled={props.busy} onClick={() => void props.onRetry()}>重试打开</button>
          {props.recovery && <button disabled={props.busy} onClick={() => void props.onExportRecovery()}>导出可恢复数据</button>}
        </div>
      </section>
    </main>
  );
}
