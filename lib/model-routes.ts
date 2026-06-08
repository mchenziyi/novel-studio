import { getDatabase } from './database';
import { AgentType } from '@/types/pipeline';

// ==================== 多模型路由 ====================

export interface ModelRoute {
  agentId: AgentType;
  modelId: string;
}

// 获取小说的模型路由配置
export function getModelRoutes(novelId: string): ModelRoute[] {
  const db = getDatabase();
  const row = db.prepare(
    "SELECT config_value FROM novel_configs WHERE novel_id = ? AND config_key = 'model_routes'"
  ).get(novelId) as any;

  if (!row) return [];
  try {
    return JSON.parse(row.config_value);
  } catch {
    return [];
  }
}

// 获取指定 agent 的模型 ID（回退到默认模型）
export function getAgentModel(novelId: string, agentId: AgentType, defaultModel: string): string {
  const routes = getModelRoutes(novelId);
  const route = routes.find(r => r.agentId === agentId);
  return route?.modelId || defaultModel;
}

// 保存模型路由配置
export function saveModelRoutes(novelId: string, routes: ModelRoute[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO novel_configs (novel_id, config_key, config_value, updated_at)
    VALUES (?, 'model_routes', ?, ?)
    ON CONFLICT(novel_id, config_key) DO UPDATE SET config_value = ?, updated_at = ?
  `).run(novelId, JSON.stringify(routes), now, JSON.stringify(routes), now);
}

// 更新单个 agent 的模型路由
export function setAgentModel(novelId: string, agentId: AgentType, modelId: string): void {
  const routes = getModelRoutes(novelId);
  const existing = routes.findIndex(r => r.agentId === agentId);
  if (existing >= 0) {
    routes[existing].modelId = modelId;
  } else {
    routes.push({ agentId, modelId });
  }
  saveModelRoutes(novelId, routes);
}

// 移除单个 agent 的模型路由（回退默认）
export function removeAgentModel(novelId: string, agentId: AgentType): void {
  const routes = getModelRoutes(novelId).filter(r => r.agentId !== agentId);
  saveModelRoutes(novelId, routes);
}
