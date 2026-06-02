import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { ToolContext } from './chat-tools';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

// 读取文件
export function createReadFileTool(ctx: ToolContext) {
  return {
    description: `读取小说项目中的文件。可以读取章节、故事文件、技能文档等。项目根目录：${PROJECT_ROOT}`,
    parameters: z.object({
      filePath: z.string().describe('相对于项目根目录的文件路径，如 "chapters/0074_灰香.md" 或 "故事/伏笔池.md"'),
    }),
    execute: async ({ filePath }: { filePath: string }) => {
      try {
        const fullPath = path.join(PROJECT_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return {
          success: true,
          path: filePath,
          content,
          length: content.length,
        };
      } catch (error) {
        return {
          success: false,
          error: `文件不存在或无法读取: ${filePath}`,
        };
      }
    },
  };
}

// 列出目录
export function createListDirectoryTool(ctx: ToolContext) {
  return {
    description: `列出小说项目目录中的文件和子目录。项目根目录：${PROJECT_ROOT}`,
    parameters: z.object({
      dirPath: z.string().optional().describe('相对于项目根目录的目录路径，默认为根目录'),
    }),
    execute: async ({ dirPath }: { dirPath?: string }) => {
      try {
        const fullPath = path.join(PROJECT_ROOT, dirPath || '');
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        
        const files = entries
          .filter(e => !e.name.startsWith('.'))
          .map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file',
          }))
          .sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
          });

        return {
          success: true,
          path: dirPath || '/',
          entries: files,
        };
      } catch (error) {
        return {
          success: false,
          error: `目录不存在或无法读取: ${dirPath}`,
        };
      }
    },
  };
}

// 搜索文件内容
export function createSearchFilesTool(ctx: ToolContext) {
  return {
    description: `在小说项目中搜索文件内容。可以搜索章节、故事文件等。项目根目录：${PROJECT_ROOT}`,
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      dirPath: z.string().optional().describe('搜索目录，默认为整个项目'),
      filePattern: z.string().optional().describe('文件名模式，如 "*.md"'),
    }),
    execute: async ({ query, dirPath, filePattern }: { query: string; dirPath?: string; filePattern?: string }) => {
      try {
        const searchDir = path.join(PROJECT_ROOT, dirPath || '');
        const results: Array<{ file: string; line: number; content: string }> = [];

        async function searchDirRecursive(dir: string) {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            
            if (entry.isDirectory()) {
              await searchDirRecursive(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                const lines = content.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes(query)) {
                    results.push({
                      file: relativePath,
                      line: i + 1,
                      content: lines[i].substring(0, 200),
                    });
                    
                    if (results.length >= 20) return;
                  }
                }
              } catch (e) {
                // 忽略无法读取的文件
              }
            }
          }
        }

        await searchDirRecursive(searchDir);

        return {
          success: true,
          query,
          count: results.length,
          results,
        };
      } catch (error) {
        return {
          success: false,
          error: `搜索失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  };
}
