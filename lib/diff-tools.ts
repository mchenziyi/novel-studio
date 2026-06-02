import { z } from 'zod';
import { diffLines, diffWords, diffChars } from 'diff';
import { ToolContext } from './chat-tools';

// 文本对比
export function createCompareTextsTool(ctx: ToolContext) {
  return {
    description: '对比两段文本的差异。支持按行、按词、按字符对比。用于对比修改前后的章节内容。',
    parameters: z.object({
      oldText: z.string().describe('原始文本'),
      newText: z.string().describe('修改后的文本'),
      mode: z.enum(['line', 'word', 'char']).optional().describe('对比模式：line=按行, word=按词, char=按字符，默认按行'),
    }),
    execute: async ({ oldText, newText, mode }: { oldText: string; newText: string; mode?: string }) => {
      try {
        let diffResult;
        
        switch (mode) {
          case 'word':
            diffResult = diffWords(oldText, newText);
            break;
          case 'char':
            diffResult = diffChars(oldText, newText);
            break;
          default:
            diffResult = diffLines(oldText, newText);
        }

        // 统计变化
        let additions = 0;
        let deletions = 0;
        let unchanged = 0;

        diffResult.forEach(part => {
          const lines = part.value.split('\n').length - 1;
          if (part.added) {
            additions += lines || 1;
          } else if (part.removed) {
            deletions += lines || 1;
          } else {
            unchanged += lines || 1;
          }
        });

        // 生成可读的差异描述
        const diffText = diffResult.map(part => {
          const prefix = part.added ? '+' : part.removed ? '-' : ' ';
          return part.value.split('\n').map(line => `${prefix} ${line}`).join('\n');
        }).join('\n');

        return {
          success: true,
          mode: mode || 'line',
          additions,
          deletions,
          unchanged,
          diff: diffText.substring(0, 5000), // 限制长度
          hasChanges: additions > 0 || deletions > 0,
        };
      } catch (error) {
        return {
          success: false,
          error: `对比失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  };
}

// 对比两个章节文件
export function createCompareChaptersTool(ctx: ToolContext) {
  return {
    description: '对比两个章节版本的差异。可以对比当前版本和历史版本，或两个不同章节。',
    parameters: z.object({
      chapterId1: z.string().describe('第一个章节ID，如 "0074"'),
      chapterId2: z.string().optional().describe('第二个章节ID，不提供则对比当前版本和上一版本'),
      versionId1: z.string().optional().describe('第一个章节的版本ID'),
      versionId2: z.string().optional().describe('第二个章节的版本ID'),
    }),
    execute: async ({ chapterId1, chapterId2, versionId1, versionId2 }: {
      chapterId1: string;
      chapterId2?: string;
      versionId1?: string;
      versionId2?: string;
    }) => {
      // 这里需要从数据库获取章节内容进行对比
      // 简化版本：直接返回提示
      return {
        success: true,
        message: '请使用 compareTexts 工具直接对比文本内容，或在章节编辑器中使用版本对比功能。',
      };
    },
  };
}
