import { z } from 'zod';
import { 
  createMemory, 
  getMemories, 
  searchMemories, 
  getRelevantMemories,
  updateMemory, 
  deleteMemory,
  formatMemoriesForContext,
  MemoryCategory 
} from './memory';
import { ToolContext } from './chat-tools';

// 创建记忆
export function createSaveMemoryTool(ctx: ToolContext) {
  return {
    description: '保存一条记忆/知识。当用户纠正你、告诉你重要信息、或你从对话中学到东西时使用。这是AI学习的核心机制。',
    inputSchema: z.object({
      category: z.enum(['character', 'world_rule', 'writing_style', 'plot_rule', 'user_preference', 'correction', 'fact'])
        .describe('记忆分类：character=角色设定, world_rule=世界规则, writing_style=写作风格, plot_rule=剧情规则, user_preference=用户偏好, correction=纠正记录, fact=事实'),
      key: z.string().describe('关键词/主题，如"阿渠的性别"、"文风要求"'),
      content: z.string().describe('记忆的详细内容'),
      importance: z.number().min(1).max(5).optional().describe('重要性 1-5，默认3'),
    }),
    execute: async ({ category, key, content, importance }: { 
      category: MemoryCategory; 
      key: string; 
      content: string; 
      importance?: number 
    }) => {
      const memory = createMemory(
        ctx.novelId,
        category,
        key,
        content,
        'chat_conversation',
        importance || 3
      );

      return {
        success: true,
        memory,
        message: `已记住：${key}`,
      };
    },
  };
}

// 查询记忆
export function createSearchMemoryTool(ctx: ToolContext) {
  return {
    description: '搜索已保存的记忆/知识。当你需要查找之前学过的东西时使用。',
    inputSchema: z.object({
      query: z.string().describe('搜索关键词'),
    }),
    execute: async ({ query }: { query: string }) => {
      const memories = searchMemories(ctx.novelId, query);

      return {
        count: memories.length,
        memories: memories.map(m => ({
          category: m.category,
          key: m.key,
          content: m.content,
          importance: m.importance,
        })),
      };
    },
  };
}

// 列出所有记忆
export function createListMemoriesTool(ctx: ToolContext) {
  return {
    description: '列出所有已保存的记忆/知识。可按分类筛选。',
    inputSchema: z.object({
      category: z.enum(['character', 'world_rule', 'writing_style', 'plot_rule', 'user_preference', 'correction', 'fact', 'all'])
        .optional()
        .describe('按分类筛选，不传则返回全部'),
    }),
    execute: async ({ category }: { category?: string }) => {
      const memories = getMemories(
        ctx.novelId, 
        category === 'all' ? undefined : category as MemoryCategory
      );

      return {
        count: memories.length,
        memories: memories.map(m => ({
          id: m.id,
          category: m.category,
          key: m.key,
          content: m.content,
          importance: m.importance,
          useCount: m.useCount,
        })),
      };
    },
  };
}

// 更新记忆
export function createUpdateMemoryTool(ctx: ToolContext) {
  return {
    description: '更新一条已保存的记忆。当信息需要修正时使用。',
    inputSchema: z.object({
      id: z.string().describe('记忆 ID'),
      content: z.string().optional().describe('新的内容'),
      importance: z.number().min(1).max(5).optional().describe('新的重要性'),
    }),
    execute: async ({ id, content, importance }: { id: string; content?: string; importance?: number }) => {
      updateMemory(id, { content, importance });

      return {
        success: true,
        message: '记忆已更新',
      };
    },
  };
}

// 删除记忆
export function createDeleteMemoryTool(ctx: ToolContext) {
  return {
    description: '删除一条记忆。当信息不再有效时使用。',
    inputSchema: z.object({
      id: z.string().describe('记忆 ID'),
    }),
    execute: async ({ id }: { id: string }) => {
      deleteMemory(id);

      return {
        success: true,
        message: '记忆已删除',
      };
    },
  };
}
