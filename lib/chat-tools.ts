import { z } from 'zod';
import { getChapters, getChapter, getCharacters, getCharacter, getForeshadowing, getOutline, searchChapters, getStats, updateChapter } from './file-system';
import { saveChapterWithVersion, getVersionHistory, getVersionDiff, rollbackToVersion } from './version-control';
import { getGitStatus, getGitLog, getGitDiff, gitCommit, gitAddAll } from './git';
import { getDatabase } from './database';
import { createReadFileTool, createListDirectoryTool, createSearchFilesTool } from './file-tools';
import { createCompareTextsTool } from './diff-tools';
import {
  createSaveMemoryTool,
  createSearchMemoryTool,
  createListMemoriesTool,
  createUpdateMemoryTool,
  createDeleteMemoryTool,
} from './memory-tools';
import { getRelevantMemories, formatMemoriesForContext } from './memory';

// 工具上下文（包含当前小说 ID）
export interface ToolContext {
  novelId: string;
}

// ==================== 章节工具 ====================

export function createGetChapterTool(ctx: ToolContext) {
  return {
    description: '获取指定章节的完整内容。当用户询问某章内容、想看某章、或需要基于某章进行修改时使用。',
    parameters: z.object({
      chapterId: z.number().describe('章节编号，如 74'),
    }),
    execute: async ({ chapterId }: { chapterId: number }) => {
      const id = String(chapterId).padStart(4, '0');
      const chapter = await getChapter(id);
      if (!chapter) {
        return { error: `第${chapterId}章不存在` };
      }
      return {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        status: chapter.status,
      };
    },
  };
}

export function createListChaptersTool(ctx: ToolContext) {
  return {
    description: '获取所有章节的列表（标题、字数、状态）。当用户想知道有哪些章节、最新章节、总章数时使用。',
    parameters: z.object({}),
    execute: async () => {
      const chapters = await getChapters(ctx.novelId);
      return {
        total: chapters.length,
        chapters: chapters.map(ch => ({
          id: ch.id,
          title: ch.title,
          wordCount: ch.wordCount,
          status: ch.status,
        })),
      };
    },
  };
}

export function createSearchChaptersTool(ctx: ToolContext) {
  return {
    description: '搜索章节内容。当用户想查找包含某个关键词、某个人物出现的章节、某个情节在哪章时使用。',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
    }),
    execute: async ({ query }: { query: string }) => {
      const results = await searchChapters(query);
      return {
        total: results.length,
        results: results.slice(0, 10).map(ch => ({
          id: ch.id,
          title: ch.title,
          wordCount: ch.wordCount,
          excerpt: ch.content.substring(0, 200) + (ch.content.length > 200 ? '...' : ''),
        })),
      };
    },
  };
}

export function createSaveChapterTool(ctx: ToolContext) {
  return {
    description: '保存/更新章节内容。当用户同意使用 AI 生成或修改的内容替换章节时使用。这是写入操作，会创建版本记录。',
    parameters: z.object({
      chapterId: z.number().describe('章节编号'),
      content: z.string().describe('新的章节内容'),
      description: z.string().optional().describe('保存说明，如"AI 重写了开头"'),
    }),
    execute: async ({ chapterId, content, description }: { chapterId: number; content: string; description?: string }) => {
      const id = String(chapterId).padStart(4, '0');
      const version = await saveChapterWithVersion(id, content, 'agent', {
        agentName: 'ChatAgent',
        description: description || '通过 ChatAgent 保存',
      });
      // 保存后标记为 audit 状态
      const db = getDatabase();
      db.prepare("UPDATE chapters SET status = 'audit' WHERE id = ?").run(id);
      return {
        success: true,
        chapterId: id,
        wordCount: content.length,
        versionId: version.id,
        message: `已保存第${chapterId}章，共 ${content.length} 字，状态已更新为 audit`,
      };
    },
  };
}

// ==================== 章节状态工具 ====================

export function createMarkChapterStatusTool(ctx: ToolContext) {
  return {
    description: '标记章节状态。audit：章节已保存待审计。synced：审计通过且故事数据已入库。',
    parameters: z.object({
      chapterId: z.number().describe('章节编号'),
      status: z.enum(['audit', 'synced']).describe('目标状态'),
    }),
    execute: async ({ chapterId, status }: { chapterId: number; status: 'audit' | 'synced' }) => {
      const id = String(chapterId).padStart(4, '0');
      const db = getDatabase();
      const result = db.prepare('UPDATE chapters SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, new Date().toISOString(), id);
      if (result.changes === 0) {
        return { error: `第${chapterId}章不存在` };
      }
      return {
        success: true,
        chapterId: id,
        status,
        message: `第${chapterId}章状态已更新为 ${status}`,
      };
    },
  };
}

// ==================== 角色工具 ====================

export function createListCharactersTool(ctx: ToolContext) {
  return {
    description: '获取所有角色列表。当用户询问有哪些角色、角色关系、某个角色的信息时使用。',
    parameters: z.object({}),
    execute: async () => {
      const characters = await getCharacters(ctx.novelId);
      return {
        total: characters.length,
        characters: characters.map(ch => ({
          id: ch.id,
          name: ch.name,
          role: ch.role,
          status: ch.status,
          description: ch.description?.substring(0, 100),
          firstAppearance: ch.firstAppearance,
          relations: ch.relations?.map(r => ({
            target: r.target,
            type: r.type,
            strength: r.strength,
          })),
        })),
      };
    },
  };
}

export function createGetCharacterTool(ctx: ToolContext) {
  return {
    description: '获取指定角色的详细信息。当用户想深入了解某个角色时使用。',
    parameters: z.object({
      characterId: z.string().describe('角色 ID'),
    }),
    execute: async ({ characterId }: { characterId: string }) => {
      const character = await getCharacter(characterId);
      if (!character) {
        return { error: `角色 ${characterId} 不存在` };
      }
      return character;
    },
  };
}

// ==================== 伏笔工具 ====================

export function createListForeshadowingTool(ctx: ToolContext) {
  return {
    description: '获取所有伏笔列表。当用户询问有哪些伏笔、伏笔状态、未回收的伏笔时使用。',
    parameters: z.object({
      status: z.enum(['planted', 'progressing', 'resolved', 'all']).optional().describe('按状态筛选'),
    }),
    execute: async ({ status }: { status?: string }) => {
      const foreshadowing = await getForeshadowing();
      let filtered = foreshadowing;
      if (status && status !== 'all') {
        filtered = foreshadowing.filter(f => f.status === status);
      }
      return {
        total: filtered.length,
        foreshadowing: filtered.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description?.substring(0, 150),
          status: f.status,
          plantedChapter: f.plantedChapter,
          resolvedChapter: f.resolvedChapter,
        })),
      };
    },
  };
}

// ==================== 大纲工具 ====================

export function createGetOutlineTool(ctx: ToolContext) {
  return {
    description: '获取小说大纲。当用户询问故事大纲、整体结构、后续走向时使用。',
    parameters: z.object({}),
    execute: async () => {
      const outline = await getOutline();
      return {
        title: outline.title,
        synopsis: outline.synopsis,
        volumes: outline.volumes?.map(v => ({
          id: v.id,
          title: v.title,
          description: v.description,
          chapters: v.chapters?.map(ch => ({
            id: ch.id,
            title: ch.title,
            summary: ch.summary?.substring(0, 100),
            status: ch.status,
          })),
        })),
      };
    },
  };
}

// ==================== 统计工具 ====================

export function createGetStatsTool(ctx: ToolContext) {
  return {
    description: '获取写作统计数据。当用户询问总字数、章节数、写作进度、平均字数等统计信息时使用。',
    parameters: z.object({}),
    execute: async () => {
      const stats = await getStats();
      return stats;
    },
  };
}

// ==================== 版本控制工具 ====================

export function createGetVersionHistoryTool(ctx: ToolContext) {
  return {
    description: '获取某章节的版本历史。当用户想看修改历史、对比版本、回滚时使用。',
    parameters: z.object({
      chapterId: z.number().describe('章节编号'),
      limit: z.number().optional().describe('返回最近几个版本，默认 10'),
    }),
    execute: async ({ chapterId, limit }: { chapterId: number; limit?: number }) => {
      const id = String(chapterId).padStart(4, '0');
      const versions = await getVersionHistory(id);
      return {
        chapterId: id,
        total: versions.length,
        versions: versions.slice(0, limit || 10).map(v => ({
          id: v.id,
          source: v.source,
          agentName: v.agentName,
          description: v.description,
          timestamp: v.timestamp,
        })),
      };
    },
  };
}

// ==================== Git 工具 ====================

export function createGetGitStatusTool(ctx: ToolContext) {
  return {
    description: '获取 Git 仓库状态。当用户询问当前修改、分支状态、是否有未提交的更改时使用。',
    parameters: z.object({}),
    execute: async () => {
      const status = await getGitStatus();
      return {
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean,
        modified: status.modified,
        staged: status.staged,
      };
    },
  };
}

export function createGetGitLogTool(ctx: ToolContext) {
  return {
    description: '获取 Git 提交历史。当用户想看最近的修改记录、提交历史时使用。',
    parameters: z.object({
      limit: z.number().optional().describe('返回最近几条记录，默认 10'),
    }),
    execute: async ({ limit }: { limit?: number }) => {
      const log = await getGitLog(limit || 10);
      return {
        total: log.length,
        commits: log.map(c => ({
          hash: c.hash.substring(0, 7),
          message: c.message,
          date: c.date,
          author: c.author,
        })),
      };
    },
  };
}

export function createGitCommitTool(ctx: ToolContext) {
  return {
    description: '创建 Git 提交。当用户想保存当前修改到 Git 时使用。会自动暂存所有更改并提交。',
    parameters: z.object({
      message: z.string().describe('提交信息'),
    }),
    execute: async ({ message }: { message: string }) => {
      await gitAddAll();
      const hash = await gitCommit(message);
      return {
        success: true,
        commitHash: hash.substring(0, 7),
        message: `已提交: ${message}`,
      };
    },
  };
}

// ==================== 数据库查询工具 ====================

export function createQueryDatabaseTool(ctx: ToolContext) {
  return {
    description: '执行只读 SQL 查询。当用户需要查询复杂的统计数据、跨表关联查询时使用。只允许 SELECT 查询。',
    parameters: z.object({
      sql: z.string().describe('SQL SELECT 查询语句'),
    }),
    execute: async ({ sql }: { sql: string }) => {
      // 安全检查：只允许 SELECT
      const trimmed = sql.trim().toUpperCase();
      if (!trimmed.startsWith('SELECT')) {
        return { error: '只允许 SELECT 查询' };
      }
      // 禁止危险操作
      if (trimmed.includes('DROP') || trimmed.includes('DELETE') || trimmed.includes('UPDATE') || trimmed.includes('INSERT') || trimmed.includes('ALTER')) {
        return { error: '不允许修改操作' };
      }

      try {
        const db = getDatabase();
        const results = db.prepare(sql).all();
        return {
          success: true,
          rowCount: results.length,
          data: results.slice(0, 100),
        };
      } catch (error) {
        return { error: `SQL 错误: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    },
  };
}

// ==================== 工具集合 ====================

import {
  createGetStoryContextTool,
  createGetFactsTool,
  createAddFactTool,
  createGetHooksTool,
  createAddHookTool,
  createUpdateHookTool,
  createGetSyncTool,
  createUpdateSyncTool,
  createGetStoryCharactersTool,
  createUpdateStoryCharacterTool,
  createGetSummariesTool,
  createUpdateSummaryTool,
  createGetStateTool,
  createUpdateStateTool,
  createGetPlotlinesTool,
  createUpdatePlotlineTool,
  createGetResourcesTool,
  createAddResourceTool,
} from './story-tools';

export function createChatAgentTools(novelId: string) {
  const ctx: ToolContext = { novelId };
  
  return {
    // 章节（数据库）
    getChapter: createGetChapterTool(ctx),
    listChapters: createListChaptersTool(ctx),
    searchChapters: createSearchChaptersTool(ctx),
    saveChapter: createSaveChapterTool(ctx),
    markChapterStatus: createMarkChapterStatusTool(ctx),
    // 角色（数据库）
    listCharacters: createListCharactersTool(ctx),
    getCharacter: createGetCharacterTool(ctx),
    // 伏笔（数据库）
    listForeshadowing: createListForeshadowingTool(ctx),
    // 大纲
    getOutline: createGetOutlineTool(ctx),
    // 统计
    getStats: createGetStatsTool(ctx),
    // 版本控制
    getVersionHistory: createGetVersionHistoryTool(ctx),
    // Git
    getGitStatus: createGetGitStatusTool(ctx),
    getGitLog: createGetGitLogTool(ctx),
    gitCommit: createGitCommitTool(ctx),
    // 数据库
    queryDatabase: createQueryDatabaseTool(ctx),
    // 文件系统访问（读取 novel-pro 技能文件）
    readFile: createReadFileTool(ctx),
    listDirectory: createListDirectoryTool(ctx),
    searchFiles: createSearchFilesTool(ctx),
    // 文本对比
    compareTexts: createCompareTextsTool(ctx),
    // 记忆工具
    saveMemory: createSaveMemoryTool(ctx),
    searchMemory: createSearchMemoryTool(ctx),
    listMemories: createListMemoriesTool(ctx),
    updateMemory: createUpdateMemoryTool(ctx),
    deleteMemory: createDeleteMemoryTool(ctx),
    // 故事数据工具
    getStoryContext: createGetStoryContextTool(ctx),
    getFacts: createGetFactsTool(ctx),
    addFact: createAddFactTool(ctx),
    getHooks: createGetHooksTool(ctx),
    addHook: createAddHookTool(ctx),
    updateHook: createUpdateHookTool(ctx),
    getSync: createGetSyncTool(ctx),
    updateSync: createUpdateSyncTool(ctx),
    getStoryCharacters: createGetStoryCharactersTool(ctx),
    updateStoryCharacter: createUpdateStoryCharacterTool(ctx),
    getSummaries: createGetSummariesTool(ctx),
    updateSummary: createUpdateSummaryTool(ctx),
    getState: createGetStateTool(ctx),
    updateState: createUpdateStateTool(ctx),
    getPlotlines: createGetPlotlinesTool(ctx),
    updatePlotline: createUpdatePlotlineTool(ctx),
    getResources: createGetResourcesTool(ctx),
    addResource: createAddResourceTool(ctx),
  };
}

// 获取相关记忆（供 ChatRoute 使用）
export { getRelevantMemories, formatMemoriesForContext };

export type ChatAgentTools = ReturnType<typeof createChatAgentTools>;
export type ChatAgentToolName = keyof ChatAgentTools;
