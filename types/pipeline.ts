// ==================== Pipeline 步骤类型 ====================
// Defines the core types for the SSE streaming pipeline engine

export type AgentType = 'planner' | 'composer' | 'writer' | 'observer' | 'settler' | 'auditor' | 'reviser';

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// 步骤状态
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Pipeline 步骤
export interface PipelineStep {
  agentId: AgentType;
  status: StepStatus;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// Pipeline 状态
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

// Pipeline 完整结构
export interface Pipeline {
  id: string;
  name: string;
  chapterId: number;
  model: string;
  steps: PipelineStep[];
  status: PipelineStatus;
  currentStepIndex: number;
  startTime: string;
  endTime?: string;
  retryCount?: number;
  maxRetries: number;
}

// ==================== SSE 事件类型 ====================

export type PipelineEventType =
  | 'pipeline_start'
  | 'step_start'
  | 'step_progress'
  | 'step_complete'
  | 'step_failed'
  | 'pipeline_complete'
  | 'pipeline_error';

export interface PipelineSSEEvent {
  type: PipelineEventType;
  pipelineId: string;
  data: any;
  timestamp: string;
}

// ==================== 审计维度 ====================

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface AuditIssue {
  dimension: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  location?: string;       // 正文中位置参考
  suggestion?: string;     // 修复建议
}

export interface AuditDimensionResult {
  dimensionName: string;
  dimensionLabel: string;
  passed: boolean;
  issues: AuditIssue[];
  score: number;           // 0-100
}

export interface AuditResult {
  chapterId: number;
  pipelineId: string;
  dimensions: AuditDimensionResult[];
  passed: boolean;
  summary: string;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  overallScore: number;
  timestamp: string;
}

// ==================== Pipeline 配置 ====================

export interface PipelineConfig {
  maxRevisionRounds: number;   // 默认 1
  auditDimensions: string[];   // 启用哪些审计维度
  autoSave: boolean;           // 写完自动保存
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxRevisionRounds: 1,
  auditDimensions: [
    // 连续性组
    'continuity', 'character', 'resource', 'timeline', 'geography',
    // 世界观组
    'power_system', 'social_structure', 'world_rules',
    // 叙事质量组
    'foreshadowing', 'pacing', 'emotion', 'suspense', 'twist', 'dialogue', 'outline_deviation', 'subplot',
    // 表达质量组
    'ai_trace', 'sensory', 'environment', 'action', 'perspective', 'word_count',
    // 结构组
    'chapter_opening', 'chapter_ending', 'paragraph_flow', 'scene_transition',
    // 细节组
    'repetition', 'logic', 'consistency',
    // 去AI味组
    'vocabulary', 'sentence_pattern', 'cliche', 'summary',
  ],
  autoSave: true,
};
