/**
 * 模块名称：AI 领域类型
 * 职责描述：定义不含秘密的 Provider 配置和闭合交互结果类型
 * 输入/输出：供设置、Provider、历史和应用服务共享稳定类型
 * 依赖关系：无外部依赖
 * 注意事项：API key 与自定义 header 值不属于任何持久化设置类型
 */
export type AiProtocol = 'openai-chat-completions';
export type StructuredOutputMode = 'json-schema' | 'json-object';

export interface AiProviderSettings {
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  requestTimeoutMs: number;
  structuredOutputMode: StructuredOutputMode;
}

export type AiInteractionResult =
  | 'success'
  | 'auth'
  | 'rate-limited'
  | 'timeout'
  | 'unavailable'
  | 'server'
  | 'response-too-large'
  | 'invalid-response';
