/**
 * 模块名称：Web 应用入口
 * 职责描述：挂载 React 根组件并加载本地样式
 * 输入/输出：读取 DOM 根节点，输出完整应用界面
 * 依赖关系：React、ReactDOM、App
 * 注意事项：所有资源均为本地资源，不注册远程请求
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppSettings } from './modules/settings/settings';
import { App } from './ui/app/App';
import { CompanionMatrixScreen } from './ui/companion/CompanionMatrixScreen';
import './ui/styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('缺少应用根节点 #root');
}

const query = new URLSearchParams(window.location.search);
const motionQuery = query.get('motion');
const matrixMotion: AppSettings['motion'] = motionQuery === 'reduced' || motionQuery === 'none' ? motionQuery : 'system';
const content = query.get('companion-matrix') === '1'
  ? <CompanionMatrixScreen motion={matrixMotion} />
  : <App />;

createRoot(root).render(
  <StrictMode>
    {content}
  </StrictMode>,
);
