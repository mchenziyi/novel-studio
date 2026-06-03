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

// ==================== 伏笔写入工具 ====================

export function createAddForeshadowingTool(ctx: ToolContext) {
  return {
    description: '添加一条伏笔。当用户提出新的伏笔线索、悬念、未解之谜时使用。',
    parameters: z.object({
      chapter: z.number().describe('埋设章节号'),
      content: z.string().describe('伏笔内容描述'),
      status: z.enum(['open', 'progressing', 'resolved']).optional().describe('状态，默认 open'),
    }),
    execute: async ({ chapter, content, status }: { chapter: number; content: string; status?: string }) => {
      const db = getDatabase();
      const id = `hook-${chapter}-auto-${Date.now().toString(36)}`;
      db.prepare(`
        INSERT INTO story_hooks (id, novel_id, chapter, type, content, status, updated_at)
        VALUES (?, ?, ?, 'planted', ?, ?, ?)
      `).run(id, ctx.novelId, chapter, content, status || 'open', new Date().toISOString());
      return { success: true, id, message: `已添加伏笔：${content.substring(0, 50)}` };
    },
  };
}

export function createUpdateForeshadowingTool(ctx: ToolContext) {
  return {
    description: '更新伏笔状态或内容。当伏笔推进、回收、或需要修改描述时使用。',
    parameters: z.object({
      id: z.string().describe('伏笔 ID（hook-xx-xx 格式）'),
      status: z.enum(['open', 'progressing', 'resolved']).optional().describe('新状态'),
      content: z.string().optional().describe('新的内容描述'),
    }),
    execute: async ({ id, status, content }: { id: string; status?: string; content?: string }) => {
      const db = getDatabase();
      const fields: string[] = [];
      const values: any[] = [];
      if (status) { fields.push('status = ?'); values.push(status); }
      if (content) { fields.push('content = ?'); values.push(content); }
      fields.push('updated_at = ?'); values.push(new Date().toISOString());
      values.push(id); values.push(ctx.novelId);
      const result = db.prepare(`UPDATE story_hooks SET ${fields.join(', ')} WHERE id = ? AND novel_id = ?`).run(...values);
      if (result.changes === 0) return { error: `伏笔 ${id} 不存在` };
      return { success: true, message: `伏笔 ${id} 已更新` };
    },
  };
}

// ==================== 大纲写入工具 ====================

export function createUpdateOutlineTool(ctx: ToolContext) {
  return {
    description: '更新小说大纲。当用户讨论并确认大纲调整时使用。',
    parameters: z.object({
      content: z.string().describe('完整的大纲 markdown 内容'),
    }),
    execute: async ({ content }: { content: string }) => {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO outline (id, novel_id, content, updated_at)
        VALUES ('main', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET content = ?, updated_at = ?
      `).run(ctx.novelId, content, now, content, now);
      return { success: true, message: '大纲已更新', length: content.length };
    },
  };
}

// ==================== 角色写入工具 ====================

export function createAddCharacterTool(ctx: ToolContext) {
  return {
    description: '添加一个新角色。当用户介绍新角色时使用。',
    parameters: z.object({
      name: z.string().describe('角色名'),
      role: z.enum(['protagonist', 'antagonist', 'supporting']).describe('角色定位'),
      personality: z.string().optional().describe('性格特征'),
      speakingStyle: z.string().optional().describe('说话风格'),
      currentState: z.string().optional().describe('当前状态'),
    }),
    execute: async (params: any) => {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(novel_id, name) DO UPDATE SET role = ?, personality = ?, speaking_style = ?, current_state = ?, updated_at = ?
      `).run(
        ctx.novelId, params.name, params.role, params.personality || '', params.speakingStyle || '', params.currentState || '', new Date().toISOString(),
        params.role, params.personality || '', params.speakingStyle || '', params.currentState || '', new Date().toISOString()
      );
      return { success: true, message: `角色「${params.name}」已添加/更新` };
    },
  };
}

export function createUpdateCharacterTool(ctx: ToolContext) {
  return {
    description: '更新已有角色信息。当用户纠正或补充角色设定时使用。',
    parameters: z.object({
      name: z.string().describe('角色名（必须已存在）'),
      role: z.enum(['protagonist', 'antagonist', 'supporting']).optional().describe('角色定位'),
      personality: z.string().optional().describe('性格特征'),
      speakingStyle: z.string().optional().describe('说话风格'),
      currentState: z.string().optional().describe('当前状态'),
    }),
    execute: async (params: any) => {
      const db = getDatabase();
      const existing = db.prepare('SELECT name FROM story_characters WHERE name = ? AND novel_id = ?').get(params.name, ctx.novelId);
      if (!existing) return { error: `角色「${params.name}」不存在，请用 addCharacter 添加` };
      const fields: string[] = []; const values: any[] = [];
      if (params.role) { fields.push('role = ?'); values.push(params.role); }
      if (params.personality) { fields.push('personality = ?'); values.push(params.personality); }
      if (params.speakingStyle) { fields.push('speaking_style = ?'); values.push(params.speakingStyle); }
      if (params.currentState) { fields.push('current_state = ?'); values.push(params.currentState); }
      fields.push('updated_at = ?'); values.push(new Date().toISOString());
      values.push(params.name); values.push(ctx.novelId);
      db.prepare(`UPDATE story_characters SET ${fields.join(', ')} WHERE name = ? AND novel_id = ?`).run(...values);
      return { success: true, message: `角色「${params.name}」已更新` };
    },
  };
}

// ==================== 小说配置工具 ====================

export function createUpdateNovelConfigTool(ctx: ToolContext) {
  return {
    description: '更新小说写作配置。当用户讨论并确认写作规范调整时使用（字数要求、文风规则、禁止写法、核心设定等）。',
    parameters: z.object({
      configKey: z.enum(['targetTotalWords', 'minWordsPerChapter', 'maxWordsPerChapter', 'writingStyleRules', 'forbiddenPatterns', 'coreSettings']).describe('配置项'),
      value: z.any().describe('配置值。字数为数字，规则为字符串数组'),
    }),
    execute: async ({ configKey, value }: { configKey: string; value: any }) => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const serialized = JSON.stringify(value);
      db.prepare(`
        INSERT INTO novel_configs (novel_id, config_key, config_value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(novel_id, config_key) DO UPDATE SET config_value = ?, updated_at = ?
      `).run(ctx.novelId, configKey, serialized, now, serialized, now);
      return { success: true, message: `写作配置「${configKey}」已更新` };
    },
  };
}

// ==================== 文风工具 ====================

export function createStyleFromDescriptionTool(ctx: ToolContext) {
  return {
    description: '根据描述创建文风配置。当用户说"参照XX写XX的文风"、"模仿XX风格"等，不需要提供参考文本，直接根据描述生成文风配置。',
    parameters: z.object({
      name: z.string().describe('文风配置名称，如"辰东·遮天风格"、"江南·龙族风格"'),
      description: z.string().describe('文风描述，如"辰东写遮天的文风：大气磅礴，短句密集，战斗场面节奏快"'),
      avgSentenceLength: z.number().describe('你判断该风格的平均句长（中文字符数），如辰东约 15-20，余华约 25-35'),
      shortSentenceRatio: z.number().describe('短句（<15字）占比百分比，如辰东约 60-70%'),
      keyPatterns: z.array(z.string()).describe('该风格的核心句式特征，如 ["短句密集推进", "大场景用长句铺开", "对话简洁有力"]'),
      forbiddenPatterns: z.array(z.string()).describe('该风格不会出现的写法，如 ["不用心理独白", "不用比喻解释比喻"]'),
      llmGuide: z.string().describe('给 AI 的文风指南（50字以内），如"短句为主，场景描写要大气磅礴，战斗节奏快，对话简洁有力"'),
    }),
    execute: async (params: any) => {
      const db = getDatabase();
      const now = new Date().toISOString();

      const fingerprint = {
        sentenceLength: { avg: params.avgSentenceLength, shortPercent: params.shortSentenceRatio },
        keyPatterns: params.keyPatterns,
        forbiddenPatterns: params.forbiddenPatterns,
        source: 'description',
      };

      db.prepare('UPDATE style_profiles SET is_active = 0 WHERE novel_id = ?').run(ctx.novelId);
      db.prepare(`
        INSERT INTO style_profiles (novel_id, name, fingerprint, llm_guide, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(ctx.novelId, params.name, JSON.stringify(fingerprint), params.llmGuide, now, now);

      return {
        success: true,
        name: params.name,
        message: `已创建文风「${params.name}」并激活。平均句长${params.avgSentenceLength}字，短句${params.shortSentenceRatio}%`,
      };
    },
  };
}

export function createImportStyleTool(ctx: ToolContext) {
  return {
    description: '导入文风配置。当用户提供参考文本并要求模仿其风格时使用。分析参考文本的句长、词汇、节奏、句式等特征，生成文风指纹并激活。',
    parameters: z.object({
      name: z.string().describe('文风配置名称，如"金庸风格"、"余华风格"'),
      referenceText: z.string().describe('参考文本（至少 500 字）'),
    }),
    execute: async ({ name, referenceText }: { name: string; referenceText: string }) => {
      const db = getDatabase();

      // 统计分析
      const sentences = referenceText.split(/[。！？.!?]+/).filter(s => s.trim());
      const avgLen = Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length);
      const shortRatio = Math.round(sentences.filter(s => s.length < 15).length / sentences.length * 100);

      // 词频统计（简单版）
      const chars = referenceText.replace(/[^\u4e00-\u9fa5]/g, '');
      const freq: Record<string, number> = {};
      for (let i = 0; i < chars.length - 1; i++) {
        const bigram = chars[i] + chars[i + 1];
        freq[bigram] = (freq[bigram] || 0) + 1;
      }
      const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);

      const fingerprint = {
        sentenceLength: { avg: avgLen, shortPercent: shortRatio },
        topWords,
        textLength: referenceText.length,
        sentenceCount: sentences.length,
      };

      const now = new Date().toISOString();
      db.prepare('UPDATE style_profiles SET is_active = 0 WHERE novel_id = ?').run(ctx.novelId);
      db.prepare(`
        INSERT INTO style_profiles (novel_id, name, fingerprint, llm_guide, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(ctx.novelId, name, JSON.stringify(fingerprint), `模仿${name}：平均句长${avgLen}字，短句${shortRatio}%`, now, now);

      return {
        success: true,
        name,
        fingerprint,
        message: `已导入文风「${name}」并激活。平均句长${avgLen}字，短句占比${shortRatio}%`,
      };
    },
  };
}

export function createGetActiveStyleTool(ctx: ToolContext) {
  return {
    description: '获取当前激活的文风配置。',
    parameters: z.object({}),
    execute: async () => {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM style_profiles WHERE novel_id = ? AND is_active = 1').get(ctx.novelId) as any;
      if (!row) return { active: false, message: '当前没有激活的文风配置' };
      return {
        active: true,
        name: row.name,
        fingerprint: JSON.parse(row.fingerprint),
        llmGuide: row.llm_guide,
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
    addCharacter: createAddCharacterTool(ctx),
    updateCharacter: createUpdateCharacterTool(ctx),
    // 伏笔（数据库）
    listForeshadowing: createListForeshadowingTool(ctx),
    addForeshadowing: createAddForeshadowingTool(ctx),
    updateForeshadowing: createUpdateForeshadowingTool(ctx),
    // 大纲
    getOutline: createGetOutlineTool(ctx),
    updateOutline: createUpdateOutlineTool(ctx),
    // 写作配置
    updateNovelConfig: createUpdateNovelConfigTool(ctx),
    // 文风工具
    importStyle: createImportStyleTool(ctx),
    createStyleFromDescription: createStyleFromDescriptionTool(ctx),
    getActiveStyle: createGetActiveStyleTool(ctx),
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
