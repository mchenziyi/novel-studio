import { callModel, ModelType } from './models';
import { getChapters, getCharacters, getForeshadowing, getOutline, getSyncStatus } from './file-system';
import { AgentType, AgentTask, Workflow, WorkflowStep } from '@/types';

// Agent 定义
export const agents: Record<AgentType, {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  planner: {
    id: 'planner',
    name: 'Planner',
    description: '生成章节意图',
    icon: '📋',
    color: '#4CAF50',
  },
  composer: {
    id: 'composer',
    name: 'Composer',
    description: '压缩上下文包',
    icon: '📦',
    color: '#2196F3',
  },
  writer: {
    id: 'writer',
    name: 'Writer',
    description: '生成正文',
    icon: '✍️',
    color: '#FF9800',
  },
  observer: {
    id: 'observer',
    name: 'Observer',
    description: '提取事实变化',
    icon: '👁️',
    color: '#9C27B0',
  },
  settler: {
    id: 'settler',
    name: 'Settler',
    description: '写总账并刷新快照',
    icon: '📊',
    color: '#F44336',
  },
  auditor: {
    id: 'auditor',
    name: 'Auditor',
    description: '审计正文',
    icon: '🔍',
    color: '#00BCD4',
  },
  reviser: {
    id: 'reviser',
    name: 'Reviser',
    description: '定点修订',
    icon: '🔧',
    color: '#795548',
  },
};

// Planner Agent
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

// Composer Agent
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

// Writer Agent
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

// Observer Agent
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

// Settler Agent
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

// Auditor Agent
export async function runAuditor(
  chapterId: number,
  content: string,
  model: ModelType = 'claude'
): Promise<any> {
  const characters = await getCharacters();
  const foreshadowing = await getForeshadowing();

  const prompt = `
你是一个小说审计专家。请审计第${chapterId}章正文。

章节正文：
${content}

角色：
${JSON.stringify(characters, null, 2)}

伏笔：
${JSON.stringify(foreshadowing, null, 2)}

请检查：
1. 连续性
2. 角色一致性
3. 节奏
4. 语言
5. AI 痕迹

请输出：
- passed: true/false
- issues: 问题列表（分 critical/warning/info）
- summary: 审计摘要

请以 JSON 格式输出。
`;

  const result = await callModel(model, prompt);
  try {
    return JSON.parse(result);
  } catch (error) {
    return { raw: result };
  }
}

// Reviser Agent
export async function runReviser(
  chapterId: number,
  content: string,
  issues: any[],
  model: ModelType = 'claude'
): Promise<string> {
  const prompt = `
你是一个小说修订专家。请根据审计问题修订第${chapterId}章正文。

章节正文：
${content}

审计问题：
${JSON.stringify(issues, null, 2)}

要求：
1. 优先处理 critical，再处理必要的 warning
2. 只修改与问题直接相关的段落
3. 优先局部修补，不整章重写
4. 输出修订后的完整正文
`;

  return await callModel(model, prompt);
}

// 执行完整工作流
export async function runWorkflow(
  chapterId: number,
  model: ModelType = 'claude'
): Promise<Workflow> {
  const workflow: Workflow = {
    id: Date.now().toString(),
    name: `第${chapterId}章写作工作流`,
    description: `为第${chapterId}章执行完整的写作流程`,
    steps: [
      { agentId: 'planner', status: 'pending' },
      { agentId: 'composer', status: 'pending' },
      { agentId: 'writer', status: 'pending' },
      { agentId: 'observer', status: 'pending' },
      { agentId: 'settler', status: 'pending' },
      { agentId: 'auditor', status: 'pending' },
    ],
    status: 'running',
    chapterId,
    startTime: new Date(),
  };

  try {
    // Step 1: Planner
    workflow.steps[0].status = 'running';
    const intent = await runPlanner(chapterId, model);
    workflow.steps[0].status = 'completed';
    workflow.steps[0].output = intent;

    // Step 2: Composer
    workflow.steps[1].status = 'running';
    const context = await runComposer(chapterId, intent, model);
    workflow.steps[1].status = 'completed';
    workflow.steps[1].output = context;

    // Step 3: Writer
    workflow.steps[2].status = 'running';
    const content = await runWriter(chapterId, intent, context, 'deepseek');
    workflow.steps[2].status = 'completed';
    workflow.steps[2].output = content;

    // Step 4: Observer
    workflow.steps[3].status = 'running';
    const observations = await runObserver(chapterId, content, model);
    workflow.steps[3].status = 'completed';
    workflow.steps[3].output = observations;

    // Step 5: Settler
    workflow.steps[4].status = 'running';
    const settlement = await runSettler(chapterId, observations, model);
    workflow.steps[4].status = 'completed';
    workflow.steps[4].output = settlement;

    // Step 6: Auditor
    workflow.steps[5].status = 'running';
    const audit = await runAuditor(chapterId, content, model);
    workflow.steps[5].status = 'completed';
    workflow.steps[5].output = audit;

    workflow.status = 'completed';
    workflow.endTime = new Date();
  } catch (error) {
    workflow.status = 'failed';
    workflow.endTime = new Date();

    // 标记失败的步骤
    for (const step of workflow.steps) {
      if (step.status === 'running') {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  return workflow;
}
