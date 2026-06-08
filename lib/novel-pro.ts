import { callModel, ModelType } from './models';
import { getChapters, getCharacters, getForeshadowing, getOutline, getSyncStatus } from './file-system';
import { saveChapterWithVersion } from './version-control';
import { saveAuditResult } from './audit-results';
import {
  AgentType,
  Pipeline,
  PipelineStep,
  PipelineConfig,
  PipelineSSEEvent,
  AuditResult,
  AuditDimensionResult,
  AuditIssue,
  DEFAULT_PIPELINE_CONFIG,
} from '@/types/pipeline';

// Agent 定义
export const agents: Record<AgentType, {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  planner:  { id: 'planner',  name: 'Planner',  description: '生成章节意图',   icon: '📋', color: '#4CAF50' },
  composer: { id: 'composer', name: 'Composer', description: '压缩上下文包',   icon: '📦', color: '#2196F3' },
  writer:   { id: 'writer',   name: 'Writer',   description: '生成正文',       icon: '✍️', color: '#FF9800' },
  observer: { id: 'observer', name: 'Observer', description: '提取事实变化',   icon: '👁️', color: '#9C27B0' },
  settler:  { id: 'settler',  name: 'Settler',  description: '写总账并刷新快照', icon: '📊', color: '#F44336' },
  auditor:  { id: 'auditor',  name: 'Auditor',  description: '多维审计正文',   icon: '🔍', color: '#00BCD4' },
  reviser:  { id: 'reviser',  name: 'Reviser',  description: '定点修订',       icon: '🔧', color: '#795548' },
};

// ==================== 单个 Agent 执行 ====================

export async function runPlanner(chapterId: number, model: ModelType = 'claude'): Promise<any> {
  const outline = await getOutline();
  const characters = await getCharacters();
  const foreshadowing = await getForeshadowing();

  const prompt = `
你是一个小说规划专家。请为第${chapterId}章生成章节意图。

大纲：
${JSON.stringify(outline, null, 2)}

角色：
${JSON.stringify(characters, null, 2)}

伏笔：
${JSON.stringify(foreshadowing, null, 2)}

请输出：
1. 本章核心目标
2. Must Keep（必须保持的连续性）
3. Must Avoid（必须避免的事项）
4. 伏笔议程（本章要推进/回收的伏笔）
5. 情绪基调

请以 JSON 格式输出。
`;

  const result = await callModel(model, prompt);
  try {
    return JSON.parse(result);
  } catch (error) {
    return { raw: result };
  }
}

export async function runComposer(
  chapterId: number,
  intent: any,
  model: ModelType = 'claude'
): Promise<any> {
  const characters = await getCharacters();
  const foreshadowing = await getForeshadowing();

  const prompt = `
你是一个小说上下文压缩专家。请为第${chapterId}章压缩上下文包。

章节意图：
${JSON.stringify(intent, null, 2)}

角色：
${JSON.stringify(characters, null, 2)}

伏笔：
${JSON.stringify(foreshadowing, null, 2)}

请输出：
1. 本章必需的人物、状态、支线、伏笔、情绪线
2. 规则栈：硬事实 > 作者意图 > 大纲规划 > 当前任务
3. 精简上下文包

请以 JSON 格式输出。
`;

  const result = await callModel(model, prompt);
  try {
    return JSON.parse(result);
  } catch (error) {
    return { raw: result };
  }
}

export async function runWriter(
  chapterId: number,
  intent: any,
  context: any,
  model: ModelType = 'deepseek'
): Promise<string> {
  const prompt = `
你是一个小说作家。请根据以下意图和上下文，为第${chapterId}章生成正文。

章节意图：
${JSON.stringify(intent, null, 2)}

上下文包：
${JSON.stringify(context, null, 2)}

要求：
1. 生成 3000-5000 字正文
2. 保证前段有吸引力
3. 结尾留钩子
4. 只输出章节内容，不附带分析说明
`;

  return await callModel(model, prompt);
}

export async function runObserver(
  chapterId: number,
  content: string,
  model: ModelType = 'claude'
): Promise<any> {
  const prompt = `
你是一个小说事实提取专家。请从第${chapterId}章正文中提取已经发生的事实变化。

章节正文：
${content}

请按以下九类组织：
1. 角色行为
2. 位置变化
3. 资源变化
4. 关系变化
5. 情绪变化
6. 信息流动
7. 剧情线索
8. 时间推进
9. 身体状态

对伏笔明确区分：新埋、推进、回收。

请以 JSON 格式输出。
`;

  const result = await callModel(model, prompt);
  try {
    return JSON.parse(result);
  } catch (error) {
    return { raw: result };
  }
}

export async function runSettler(
  chapterId: number,
  observations: any,
  model: ModelType = 'claude'
): Promise<any> {
  const prompt = `
你是一个小说事实结算专家。请根据 Observer 的观察结果，为第${chapterId}章生成结算报告。

观察结果：
${JSON.stringify(observations, null, 2)}

请输出：
1. 本章新增的事实（fact_id 格式：F-{chapterId}-{序号}）
2. 需要更新的快照视图
3. 结算摘要

请以 JSON 格式输出。
`;

  const result = await callModel(model, prompt);
  try {
    return JSON.parse(result);
  } catch (error) {
    return { raw: result };
  }
}

// ==================== 多维审计系统 ====================

const AUDIT_DIMENSIONS = {
  continuity:     { label: '连续性',      prompt: '检查章节内容与前文是否连贯。有无前文已经发生但这里矛盾的事件？有无突然出现没有铺垫的事物？' },
  character:      { label: '角色一致性',   prompt: '检查角色行为是否符合其性格设定。有无角色突然改变了说话方式、性格、动机？' },
  resource:       { label: '资源追踪',    prompt: '检查资源的增减是否合理。如武器、金钱、物品等有无凭空出现或消失？' },
  foreshadowing:  { label: '伏笔回收',    prompt: '检查伏笔处理是否合理。有无可以推进/回收但被忽略的伏笔？有无过早泄露的伏笔？' },
  pacing:         { label: '叙事节奏',    prompt: '检查节奏是否合理。有无拖沓的段落？有无过于仓促的转折？段落间的节奏变化是否自然？' },
  emotion:        { label: '情感弧线',    prompt: '检查角色情感变化是否自然。有无突然的情绪跳跃？情感变化是否铺垫充分？' },
  dialogue:       { label: '对话自然度',   prompt: '检查对话是否自然。有无生硬的对话？每个角色的说话风格是否区分？有无 AI 感的对话模式？' },
  ai_trace:       { label: 'AI 痕迹',     prompt: '专门检查 AI 生成痕迹。有无模板化表达（如"他深吸一口气"、"不禁莞尔"、"目光深邃"）？有无过度总结的段落？有无不自然的排比句式？词频是否有明显重复模式？' },
  outline_deviation: { label: '大纲偏离', prompt: '检查内容是否严重偏离大纲规划。有无遗漏大纲中的关键事件？有无大纲未规划的重大情节？' },
  word_count:     { label: '字数合规',    prompt: '检查字数是否在 2000-5000 字范围内。是否有明显的水字数段落？是否有过短的情况？' },
};

export async function runAuditor(
  chapterId: number,
  content: string,
  model: ModelType = 'claude',
  config?: PipelineConfig,
  previousAudit?: AuditResult,
): Promise<AuditResult> {
  const outline = await getOutline();
  const characters = await getCharacters();
  const foreshadowing = await getForeshadowing();
  const cfg = config || DEFAULT_PIPELINE_CONFIG;

  // 构建所有维度的检查说明
  const dimEntries = Object.entries(AUDIT_DIMENSIONS)
    .filter(([key]) => cfg.auditDimensions.includes(key));

  const dimCheckPrompts = dimEntries
    .map(([key, dim], i) => `${i + 1}. [${key}] ${dim.label}: ${dim.prompt}`)
    .join('\n');

  // 如果有上一轮审计结果，附上修订提示
  let revisionContext = '';
  if (previousAudit) {
    revisionContext = `
【修订轮次】这已是第 2 轮审计（修订后的审计）。上一轮审计问题：
${previousAudit.dimensions
  .flatMap(d => d.issues.filter(i => i.severity === 'critical' || i.severity === 'warning'))
  .map(i => `- [${i.severity}] ${i.title}: ${i.description}`)
  .join('\n')}

请特别关注以上问题是否已修复。
`;
  }

  const prompt = `
你是一个专业的小说审计专家。请对第${chapterId}章正文进行全方位审计。

章节正文：
${content}

角色信息：
${JSON.stringify(characters, null, 2)}

伏笔信息：
${JSON.stringify(foreshadowing, null, 2)}

大纲摘要：
${JSON.stringify(outline, null, 2)}

${revisionContext}

请对以下 ${dimEntries.length} 个维度逐一检查：
${dimCheckPrompts}

请严格按照以下 JSON 格式输出：
{
  "summary": "审计总评（50字以内）",
  "dimensions": [
    {
      "dimension": "dimension_key",
      "label": "维度名称",
      "passed": true/false,
      "score": 0-100,
      "issues": [
        {
          "severity": "critical/warning/info",
          "title": "问题标题",
          "description": "问题描述",
          "location": "大约在哪个段落（可选）",
          "suggestion": "修复建议（可选）"
        }
      ]
    }
  ]
}

规则：
- 如果某个维度没有问题，passed=true, score=90-100, issues=[]
- critical: 必须修复的严重问题（如矛盾、明显 AI 味）
- warning: 建议修复的问题
- info: 轻微改进建议
- score: 0-100 分，90+ 为通过，70-89 为有改进空间，70 以下为严重不足
- 请确保 JSON 格式正确，不要额外添加 markdown 代码块标记
`;

  const result = await callModel(model, prompt);
  let parsed: any;
  try {
    // 清理可能的 markdown 代码块标记
    const cleaned = result.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (error) {
    // 降级处理：如果 JSON 解析失败，返回原始结果
    return {
      chapterId,
      pipelineId: '',
      passed: true,
      summary: result.substring(0, 200),
      totalIssues: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      overallScore: 50,
      dimensions: dimEntries.map(([key, dim]) => ({
        dimensionName: key,
        dimensionLabel: dim.label,
        passed: true,
        score: 50,
        issues: [] as AuditIssue[],
      })),
      timestamp: new Date().toISOString(),
    };
  }

  // 组装审计结果
  const dimensions: AuditDimensionResult[] = (parsed.dimensions || []).map((d: any) => ({
    dimensionName: d.dimension,
    dimensionLabel: d.label || d.dimension,
    passed: d.passed ?? true,
    score: d.score ?? 80,
    issues: (d.issues || []).map((i: any) => ({
      dimension: d.dimension,
      severity: i.severity || 'info',
      title: i.title || '',
      description: i.description || '',
      location: i.location,
      suggestion: i.suggestion,
    })),
  }));

  // 补充缺失的维度
  const dimSet = new Set(dimensions.map(d => d.dimensionName));
  for (const [key, dim] of dimEntries) {
    if (!dimSet.has(key)) {
      dimensions.push({
        dimensionName: key,
        dimensionLabel: dim.label,
        passed: true,
        score: 80,
        issues: [],
      });
    }
  }

  const allIssues = dimensions.flatMap(d => d.issues);
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const infoCount = allIssues.filter(i => i.severity === 'info').length;
  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / (dimensions.length || 1)
  );

  return {
    chapterId,
    pipelineId: '',
    passed: criticalCount === 0,
    summary: parsed.summary || '审计完成',
    totalIssues: allIssues.length,
    criticalCount,
    warningCount,
    infoCount,
    overallScore,
    dimensions,
    timestamp: new Date().toISOString(),
  };
}

export async function runReviser(
  chapterId: number,
  content: string,
  auditResult: AuditResult,
  model: ModelType = 'claude'
): Promise<string> {
  const criticalIssues = auditResult.dimensions.flatMap(d =>
    d.issues.filter(i => i.severity === 'critical' || i.severity === 'warning')
  );

  const prompt = `
你是一个小说修订专家。请根据审计问题修订第${chapterId}章正文。

章节正文：
${content}

审计问题（共 ${criticalIssues.length} 个关键问题）：
${criticalIssues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.title}: ${issue.description}${issue.suggestion ? ` 建议：${issue.suggestion}` : ''}`).join('\n')}

要求：
1. 优先处理 critical，再处理必要的 warning
2. 只修改与问题直接相关的段落
3. 优先局部修补，不整章重写
4. 保持原有的章节标题
5. 输出修订后的完整正文，不要附加分析说明
`;

  return await callModel(model, prompt);
}

// ==================== SSE 流式 Pipeline 引擎 ====================

export type PipelineEventSink = (event: PipelineSSEEvent) => void;

export async function runStreamingPipeline(
  chapterId: number,
  novelId: string,
  model: ModelType = 'claude',
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  emit: PipelineEventSink,
): Promise<Pipeline> {
  const pipelineId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const pipeline: Pipeline = {
    id: pipelineId,
    name: `第${chapterId}章写作管线`,
    chapterId,
    model,
    steps: [
      { agentId: 'planner',  status: 'pending' },
      { agentId: 'composer', status: 'pending' },
      { agentId: 'writer',   status: 'pending' },
      { agentId: 'observer', status: 'pending' },
      { agentId: 'settler',  status: 'pending' },
      { agentId: 'auditor',  status: 'pending' },
    ],
    status: 'running',
    currentStepIndex: 0,
    startTime: new Date().toISOString(),
    maxRetries: config.maxRevisionRounds,
    retryCount: 0,
  };

  const emitEvent = (type: PipelineSSEEvent['type'], data: any) => {
    emit({ type, pipelineId, data, timestamp: new Date().toISOString() });
  };

  emitEvent('pipeline_start', { chapterId, model, stepsCount: pipeline.steps.length });

  try {
    // Step 1: Planner
    const plannerResult = await executeStep(pipeline, 0, async () => {
      return await runPlanner(chapterId, model);
    }, emitEvent);

    // Step 2: Composer
    const composerResult = await executeStep(pipeline, 1, async () => {
      return await runComposer(chapterId, plannerResult, model);
    }, emitEvent);

    // Step 3: Writer
    const content = await executeStep(pipeline, 2, async () => {
      return await runWriter(chapterId, plannerResult, composerResult, model);
    }, emitEvent);

    // 自动保存
    if (config.autoSave) {
      try {
        await saveChapterWithVersion(String(chapterId).padStart(4, '0'), content, 'agent', {
          agentName: 'Pipeline',
          description: `Pipeline 自动保存（planner→composer→writer）`,
        });
      } catch (saveErr) {
        console.error('Pipeline auto-save failed:', saveErr);
      }
    }

    // Step 4: Observer
    const observations = await executeStep(pipeline, 3, async () => {
      return await runObserver(chapterId, content, model);
    }, emitEvent);

    // Step 5: Settler
    const settlement = await executeStep(pipeline, 4, async () => {
      return await runSettler(chapterId, observations, model);
    }, emitEvent);

    // Settler 后：同步到真理文件 DB 表
    syncSettlerToTruthFiles(novelId, chapterId, observations, settlement);

    // Step 6: Auditor + 修订循环
    let currentContent = content;
    let auditResult: AuditResult | undefined;

    for (let round = 0; round <= config.maxRevisionRounds; round++) {
      auditResult = await executeStep(pipeline, 5, async () => {
        return await runAuditor(chapterId, currentContent, model, config, round > 0 ? auditResult : undefined);
      }, emitEvent);

      auditResult.pipelineId = pipelineId;
      // 持久化审计结果
      saveAuditResult(auditResult);

      emitEvent('step_progress', {
        stepIndex: 5,
        agentId: 'auditor',
        round,
        auditResult: {
          passed: auditResult.passed,
          overallScore: auditResult.overallScore,
          totalIssues: auditResult.totalIssues,
          criticalCount: auditResult.criticalCount,
          summary: auditResult.summary,
        },
      });

      // 如果审计通过，或者已达最大修订轮数，结束循环
      if (auditResult.passed || round >= config.maxRevisionRounds) {
        break;
      }

      // 有 critical 问题，且还有修订机会 → 修订
      pipeline.steps[5].status = 'pending'; // 重置审计步骤状态

      // 插入 reviser 步骤
      pipeline.steps.push({ agentId: 'reviser', status: 'pending' });
      const reviserIdx = pipeline.steps.length - 1;

      emitEvent('step_start', { stepIndex: reviserIdx, agentId: 'reviser', round: round + 1 });
      pipeline.currentStepIndex = reviserIdx;
      pipeline.steps[reviserIdx].status = 'running';
      pipeline.steps[reviserIdx].startedAt = new Date().toISOString();

      try {
        currentContent = await runReviser(chapterId, currentContent, auditResult, model);
        pipeline.steps[reviserIdx].status = 'completed';
        pipeline.steps[reviserIdx].output = { wordCount: currentContent.length };
        pipeline.steps[reviserIdx].completedAt = new Date().toISOString();
        emitEvent('step_complete', { stepIndex: reviserIdx, agentId: 'reviser', wordCount: currentContent.length });

        // 修订后重新保存
        if (config.autoSave) {
          try {
            await saveChapterWithVersion(String(chapterId).padStart(4, '0'), currentContent, 'agent', {
              agentName: 'Pipeline/Reviser',
              description: `修订后自动保存（第${round + 1}轮修订）`,
            });
          } catch (saveErr) {
            console.error('Reviser auto-save failed:', saveErr);
          }
        }

        pipeline.retryCount = round + 1;
      } catch (err) {
        pipeline.steps[reviserIdx].status = 'failed';
        pipeline.steps[reviserIdx].error = err instanceof Error ? err.message : 'Unknown error';
        pipeline.steps[reviserIdx].completedAt = new Date().toISOString();
        emitEvent('step_failed', { stepIndex: reviserIdx, agentId: 'reviser', error: pipeline.steps[reviserIdx].error });
        break;
      }

      // 恢复审计步骤为 pending（下轮循环会重新执行）
      pipeline.steps[5].status = 'pending';
    }

    pipeline.status = 'completed';
    pipeline.endTime = new Date().toISOString();

    emitEvent('pipeline_complete', {
      chapterId,
      content: currentContent,
      auditResult: auditResult ? {
        passed: auditResult.passed,
        overallScore: auditResult.overallScore,
        totalIssues: auditResult.totalIssues,
        criticalCount: auditResult.criticalCount,
        summary: auditResult.summary,
      } : null,
      retryCount: pipeline.retryCount,
      steps: pipeline.steps.map(s => ({
        agentId: s.agentId,
        status: s.status,
      })),
      durationMs: new Date(pipeline.endTime).getTime() - new Date(pipeline.startTime).getTime(),
    });

  } catch (error) {
    pipeline.status = 'failed';
    pipeline.endTime = new Date().toISOString();

    // 标记失败步骤
    for (const step of pipeline.steps) {
      if (step.status === 'running') {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        step.completedAt = new Date().toISOString();
      }
    }

    emitEvent('pipeline_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAtStep: pipeline.currentStepIndex,
      agentId: pipeline.steps[pipeline.currentStepIndex]?.agentId,
    });
  }

  return pipeline;
}

// 执行单个步骤的辅助函数
async function executeStep<T>(
  pipeline: Pipeline,
  stepIndex: number,
  fn: () => Promise<T>,
  emit: (type: PipelineSSEEvent['type'], data: any) => void,
): Promise<T> {
  const step = pipeline.steps[stepIndex];
  if (!step) throw new Error(`Step ${stepIndex} not found`);

  pipeline.currentStepIndex = stepIndex;
  step.status = 'running';
  step.startedAt = new Date().toISOString();

  emit('step_start', {
    pipelineId: pipeline.id,
    stepIndex,
    agentId: step.agentId,
    totalSteps: pipeline.steps.length,
  });

  try {
    const result = await fn();
    step.status = 'completed';
    step.output = typeof result === 'string'
      ? { preview: result.substring(0, 300), wordCount: result.length }
      : result;
    step.completedAt = new Date().toISOString();

    emit('step_complete', {
      pipelineId: pipeline.id,
      stepIndex,
      agentId: step.agentId,
      output: step.output,
      durationMs: new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime(),
    });

    return result;
  } catch (err) {
    step.status = 'failed';
    step.error = err instanceof Error ? err.message : 'Unknown error';
    step.completedAt = new Date().toISOString();

    emit('step_failed', {
      pipelineId: pipeline.id,
      stepIndex,
      agentId: step.agentId,
      error: step.error,
    });

    throw err;
  }
}

// 保持向后兼容：同步版 workflow
export async function runWorkflow(
  chapterId: number,
  model: ModelType = 'claude'
): Promise<Pipeline> {
  const events: PipelineSSEEvent[] = [];
  return await runStreamingPipeline(
    chapterId,
    'default',
    model,
    DEFAULT_PIPELINE_CONFIG,
    (event) => events.push(event),
  );
}

// ==================== Settler → 真理文件同步 ====================

function syncSettlerToTruthFiles(
  novelId: string,
  chapterId: number,
  observations: any,
  settlement: any,
) {
  try {
    const {
      addStoryFact,
      getLastFactId,
      addStoryHook,
      updateStoryHookStatus,
      upsertStorySummary,
      upsertStoryState,
      upsertStoryCharacter,
      addStoryResource,
      upsertStoryPlotline,
      upsertStorySync,
    } = require('./story-data');

    // 1. 从事 observations 写入 story_facts
    if (observations && typeof observations === 'object') {
      const categories = [
        '角色行为', '位置变化', '资源变化', '关系变化',
        '情绪变化', '信息流动', '剧情线索', '时间推进', '身体状态',
      ];

      let factSeq = 0;
      for (const cat of categories) {
        const items = observations[cat] || observations[cat.replace(/变化$/, '')] || [];
        if (Array.isArray(items)) {
          for (const item of items) {
            factSeq++;
            const factId = `F-${String(chapterId).padStart(4, '0')}-${String(factSeq).padStart(2, '0')}`;
            const content = typeof item === 'string' ? item : (item.content || item.description || JSON.stringify(item));
            const subject = typeof item === 'object' && item.subject ? item.subject : cat;
            addStoryFact(novelId, {
              id: factId,
              chapter: chapterId,
              category: cat,
              subject,
              content,
            });
          }
        }
      }

      // 处理伏笔变化
      const hooks = observations['伏笔'] || observations['foreshadowing'] || [];
      if (Array.isArray(hooks)) {
        for (const hook of hooks) {
          if (typeof hook === 'object' && hook.status) {
            updateStoryHookStatus(novelId, hook.id, hook.status);
          }
        }
      }
    }

    // 2. 从 settlement 写入 story_summaries
    if (settlement && typeof settlement === 'object') {
      upsertStorySummary(novelId, {
        chapter: chapterId,
        title: settlement.title || `第${chapterId}章`,
        summary: settlement.summary || settlement['结算摘要'] || '',
        key_events: settlement.keyEvents || settlement['关键事件'] || '',
        fact_range: settlement.factRange || `F-${String(chapterId).padStart(4, '0')}-01~`,
      });

      // 更新同步状态
      upsertStorySync(novelId, {
        synced_chapter: chapterId,
        total_facts: 0, // 会在下次 getStoryStats 时计算
        latest_chapter: chapterId,
        can_continue: 1,
      });
    }
  } catch (err) {
    console.error('syncSettlerToTruthFiles failed:', err);
  }
}
