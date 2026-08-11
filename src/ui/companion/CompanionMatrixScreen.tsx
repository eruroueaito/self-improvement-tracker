/**
 * 模块名称：伙伴占位 production 验收矩阵
 * 职责描述：在无导航 query 入口同时渲染真实 3×4 占位组件供逻辑与可访问性检查
 * 输入/输出：接收既有 motion 设置，输出只读状态矩阵
 * 依赖关系：CompanionAvatar、伙伴类型、共享展示映射
 * 注意事项：不初始化应用、不访问 Store、不提供正式导航入口或持久写入
 */
import type { CompanionMood, CompanionStage } from '../../modules/companion/types';
import type { AppSettings } from '../../modules/settings/settings';
import { companionMoodLabel, companionStageLabel } from '../shared/presentation';
import { CompanionAvatar } from './CompanionAvatar';

const STAGES: CompanionStage[] = ['seed', 'sprout', 'companion'];
const MOODS: CompanionMood[] = ['idle', 'working', 'celebrating', 'sleeping'];

export function CompanionMatrixScreen(props: { motion: AppSettings['motion'] }) {
  return (
    <main className="companion-matrix-page" data-motion={props.motion}>
      <p className="eyebrow">PLACEHOLDER CONTRACT ACCEPTANCE</p>
      <h1>伙伴占位状态矩阵</h1>
      <p>3 个成长阶段 × 4 个正向状态；只验证逻辑与可访问语义，不展示实际美术，也不读写本地数据。</p>
      <div className="companion-matrix-grid" aria-label="伙伴十二状态验收矩阵">
        {STAGES.flatMap((stage) => MOODS.map((mood) => (
          <section className="companion-matrix-card" data-stage={stage} data-mood={mood} key={`${stage}-${mood}`}>
            <CompanionAvatar stage={stage} mood={mood} size="expanded" motion={props.motion} />
            <strong>{companionStageLabel(stage)}</strong>
            <span>{companionMoodLabel(mood)}</span>
          </section>
        )))}
      </div>
    </main>
  );
}
