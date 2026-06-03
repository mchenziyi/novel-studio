import { z } from 'zod';
import { ToolContext } from './chat-tools';
import {
  getStoryFacts,
  addStoryFact,
  getLastFactId,
  getStoryHooks,
  addStoryHook,
  updateStoryHookStatus,
  getStorySummaries,
  upsertStorySummary,
  getStoryState,
  upsertStoryState,
  getStoryCharacters,
  upsertStoryCharacter,
  getStoryResources,
  addStoryResource,
  getStoryPlotlines,
  upsertStoryPlotline,
  getStorySync,
  upsertStorySync,
  getStoryContext,
  getStoryStats,
} from './story-data';

// 获取故事上下文
export function createGetStoryContextTool(ctx: ToolContext) {
  return {
    description: '获取小说的完整故事上下文（事实、伏笔、摘要、状态、角色、资源、支线、同步状态）。用于了解小说当前状态。',
    inputSchema: z.object({}),
    execute: async () => {
      const context = getStoryContext(ctx.novelId);
      const stats = getStoryStats(ctx.novelId);
      return {
        stats,
        factsCount: context.facts.length,
        hooksCount: context.hooks.length,
        summariesCount: context.summaries.length,
        charactersCount: context.characters.length,
        plotlinesCount: context.plotlines.length,
        sync: context.sync,
        latestFacts: context.facts.slice(-10),
        openHooks: context.hooks.filter(h => h.status === 'open').slice(0, 10),
      };
    },
  };
}

// 获取事实
export function createGetFactsTool(ctx: ToolContext) {
  return {
    description: '获取事实总账。可按章节筛选。',
    inputSchema: z.object({
      chapter: z.number().optional().describe('章节号，不传则返回全部'),
    }),
    execute: async ({ chapter }: { chapter?: number }) => {
      const facts = getStoryFacts(ctx.novelId, chapter);
      return { facts, count: facts.length };
    },
  };
}

// 添加事实
export function createAddFactTool(ctx: ToolContext) {
  return {
    description: '添加一条事实到总账。fact_id 格式：F-{4位章号}-{2位序号}，如 F-0074-01',
    inputSchema: z.object({
      id: z.string().describe('fact_id，如 F-0074-01'),
      chapter: z.number().describe('章节号'),
      category: z.string().describe('事实分类：角色行为/位置变化/资源变化/关系变化/情绪变化/信息流动/剧情线索/时间推进/身体状态'),
      subject: z.string().describe('主体，如角色名'),
      content: z.string().describe('事实描述'),
      sources: z.string().optional().describe('来源，如"伏笔池,角色矩阵"'),
    }),
    execute: async (params: any) => {
      addStoryFact(ctx.novelId, params);
      return { success: true, id: params.id };
    },
  };
}

// 获取伏笔
export function createGetHooksTool(ctx: ToolContext) {
  return {
    description: '获取伏笔池。可按状态筛选。',
    inputSchema: z.object({
      status: z.enum(['open', 'progressing', 'resolved', 'all']).optional().describe('状态筛选'),
    }),
    execute: async ({ status }: { status?: string }) => {
      const hooks = getStoryHooks(ctx.novelId, status === 'all' ? undefined : status);
      return { hooks, count: hooks.length };
    },
  };
}

// 添加伏笔
export function createAddHookTool(ctx: ToolContext) {
  return {
    description: '添加一条伏笔。hook_id 格式：hook-{章号}-{序号}',
    inputSchema: z.object({
      id: z.string().describe('hook_id，如 hook-74-01'),
      chapter: z.number().optional().describe('埋设章节'),
      content: z.string().describe('伏笔内容'),
      fact_ids: z.string().optional().describe('关联的 fact_id'),
    }),
    execute: async (params: any) => {
      addStoryHook(ctx.novelId, { ...params, type: 'planted', status: 'open' });
      return { success: true, id: params.id };
    },
  };
}

// 更新伏笔状态
export function createUpdateHookTool(ctx: ToolContext) {
  return {
    description: '更新伏笔状态（open/progressing/resolved）。',
    inputSchema: z.object({
      id: z.string().describe('hook_id'),
      status: z.enum(['open', 'progressing', 'resolved']).describe('新状态'),
    }),
    execute: async ({ id, status }: { id: string; status: string }) => {
      updateStoryHookStatus(ctx.novelId, id, status);
      return { success: true };
    },
  };
}

// 获取/更新同步状态
export function createGetSyncTool(ctx: ToolContext) {
  return {
    description: '获取同步状态（门禁文件）。',
    inputSchema: z.object({}),
    execute: async () => {
      const sync = getStorySync(ctx.novelId);
      return sync || { synced_chapter: 0, total_facts: 0, latest_chapter: 0, can_continue: 1 };
    },
  };
}

export function createUpdateSyncTool(ctx: ToolContext) {
  return {
    description: '更新同步状态。续写完成后调用。',
    inputSchema: z.object({
      synced_chapter: z.number().describe('已同步到的章节'),
      total_facts: z.number().optional().describe('累计事实数'),
      latest_chapter: z.number().optional().describe('最新章节'),
      can_continue: z.number().optional().describe('是否允许续写，1=允许，0=禁止'),
    }),
    execute: async (params: any) => {
      const current = getStorySync(ctx.novelId);
      upsertStorySync(ctx.novelId, {
        synced_chapter: params.synced_chapter,
        total_facts: params.total_facts ?? current?.total_facts ?? 0,
        latest_chapter: params.latest_chapter ?? params.synced_chapter,
        can_continue: params.can_continue ?? 1,
      });
      return { success: true };
    },
  };
}

// 获取角色矩阵
export function createGetStoryCharactersTool(ctx: ToolContext) {
  return {
    description: '获取故事角色矩阵（角色设定、状态、关系）。',
    inputSchema: z.object({}),
    execute: async () => {
      const characters = getStoryCharacters(ctx.novelId);
      return { characters, count: characters.length };
    },
  };
}

// 更新角色
export function createUpdateStoryCharacterTool(ctx: ToolContext) {
  return {
    description: '更新角色信息。',
    inputSchema: z.object({
      name: z.string().describe('角色名'),
      role: z.string().optional().describe('角色定位'),
      status: z.string().optional().describe('状态'),
      personality: z.string().optional().describe('性格'),
      speaking_style: z.string().optional().describe('说话风格'),
      current_state: z.string().optional().describe('当前状态'),
      relations: z.string().optional().describe('关系JSON'),
    }),
    execute: async (params: any) => {
      upsertStoryCharacter(ctx.novelId, params);
      return { success: true };
    },
  };
}

// 获取章节摘要
export function createGetSummariesTool(ctx: ToolContext) {
  return {
    description: '获取章节摘要列表。',
    inputSchema: z.object({}),
    execute: async () => {
      const summaries = getStorySummaries(ctx.novelId);
      return { summaries, count: summaries.length };
    },
  };
}

// 更新章节摘要
export function createUpdateSummaryTool(ctx: ToolContext) {
  return {
    description: '更新章节摘要。',
    inputSchema: z.object({
      chapter: z.number().describe('章节号'),
      title: z.string().optional().describe('章节标题'),
      summary: z.string().optional().describe('摘要'),
      key_events: z.string().optional().describe('关键事件'),
      fact_range: z.string().optional().describe('事实范围，如 F-0074-01~F-0074-09'),
    }),
    execute: async (params: any) => {
      upsertStorySummary(ctx.novelId, params);
      return { success: true };
    },
  };
}

// 获取当前状态
export function createGetStateTool(ctx: ToolContext) {
  return {
    description: '获取当前状态。',
    inputSchema: z.object({
      category: z.string().optional().describe('分类筛选'),
    }),
    execute: async ({ category }: { category?: string }) => {
      const state = getStoryState(ctx.novelId, category);
      return { state, count: state.length };
    },
  };
}

// 更新当前状态
export function createUpdateStateTool(ctx: ToolContext) {
  return {
    description: '更新当前状态。',
    inputSchema: z.object({
      key: z.string().describe('状态键'),
      value: z.string().describe('状态值'),
      category: z.string().optional().describe('分类'),
    }),
    execute: async (params: any) => {
      upsertStoryState(ctx.novelId, params.key, params.value, params.category);
      return { success: true };
    },
  };
}

// 获取支线进度
export function createGetPlotlinesTool(ctx: ToolContext) {
  return {
    description: '获取支线进度。',
    inputSchema: z.object({}),
    execute: async () => {
      const plotlines = getStoryPlotlines(ctx.novelId);
      return { plotlines, count: plotlines.length };
    },
  };
}

// 更新支线
export function createUpdatePlotlineTool(ctx: ToolContext) {
  return {
    description: '更新支线进度。',
    inputSchema: z.object({
      id: z.string().describe('支线ID'),
      name: z.string().describe('支线名称'),
      status: z.string().optional().describe('状态：active/dormant/resolved'),
      start_chapter: z.number().optional().describe('开始章节'),
      end_chapter: z.number().optional().describe('结束章节'),
      description: z.string().optional().describe('描述'),
    }),
    execute: async (params: any) => {
      upsertStoryPlotline(ctx.novelId, { ...params, status: params.status || 'active' });
      return { success: true };
    },
  };
}

// 获取资源账本
export function createGetResourcesTool(ctx: ToolContext) {
  return {
    description: '获取资源账本。',
    inputSchema: z.object({}),
    execute: async () => {
      const resources = getStoryResources(ctx.novelId);
      return { resources, count: resources.length };
    },
  };
}

// 添加资源记录
export function createAddResourceTool(ctx: ToolContext) {
  return {
    description: '添加资源变动记录。',
    inputSchema: z.object({
      chapter: z.number().optional().describe('章节'),
      resource_name: z.string().describe('资源名称'),
      change_type: z.string().optional().describe('变动类型：gain/loss/update'),
      amount: z.string().optional().describe('数量'),
      description: z.string().optional().describe('描述'),
      fact_id: z.string().optional().describe('关联fact_id'),
    }),
    execute: async (params: any) => {
      addStoryResource(ctx.novelId, params);
      return { success: true };
    },
  };
}
