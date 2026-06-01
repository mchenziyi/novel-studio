import fs from 'fs/promises';
import path from 'path';
import { Chapter, Character, Outline } from '@/types';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

// 读取章节列表
export async function getChapters(): Promise<Chapter[]> {
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);
  const chapters: Chapter[] = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await fs.readFile(path.join(chaptersDir, file), 'utf-8');
      const match = file.match(/^(\d+)_(.+)\.md$/);
      if (match) {
        chapters.push({
          id: match[1],
          title: match[2],
          content,
          wordCount: content.length,
          file,
        });
      }
    }
  }

  return chapters.sort((a, b) => parseInt(a.id) - parseInt(b.id));
}

// 读取单个章节
export async function getChapter(id: string): Promise<Chapter | null> {
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);

  for (const file of files) {
    if (file.startsWith(`${id}_`) && file.endsWith('.md')) {
      const content = await fs.readFile(path.join(chaptersDir, file), 'utf-8');
      const match = file.match(/^(\d+)_(.+)\.md$/);
      if (match) {
        return {
          id: match[1],
          title: match[2],
          content,
          wordCount: content.length,
          file,
        };
      }
    }
  }

  return null;
}

// 更新章节
export async function updateChapter(id: string, content: string): Promise<void> {
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);

  for (const file of files) {
    if (file.startsWith(`${id}_`) && file.endsWith('.md')) {
      const filePath = path.join(chaptersDir, file);
      await fs.writeFile(filePath, content, 'utf-8');
      return;
    }
  }

  throw new Error(`Chapter ${id} not found`);
}

// 读取角色矩阵
export async function getCharacters(): Promise<Character[]> {
  const filePath = path.join(PROJECT_ROOT, '故事/角色矩阵.md');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCharacters(content);
}

// 解析角色矩阵
function parseCharacters(content: string): Character[] {
  const characters: Character[] = [];
  const lines = content.split('\n');
  let currentCharacter: Partial<Character> | null = null;

  for (const line of lines) {
    // 检测角色标题（以 ## 开头）
    if (line.startsWith('## ')) {
      if (currentCharacter) {
        characters.push(currentCharacter as Character);
      }
      currentCharacter = {
        id: line.substring(3).trim(),
        name: line.substring(3).trim(),
        role: 'supporting',
        status: 'alive',
        description: '',
        relations: [],
        firstAppearance: 1,
      };
    } else if (currentCharacter && line.startsWith('- ')) {
      // 解析角色属性
      const [key, value] = line.substring(2).split(':').map(s => s.trim());
      if (key && value) {
        switch (key) {
          case '角色':
            currentCharacter.role = value as any;
            break;
          case '状态':
            currentCharacter.status = value as any;
            break;
          case '描述':
            currentCharacter.description = value;
            break;
          case '首次出场':
            currentCharacter.firstAppearance = parseInt(value);
            break;
        }
      }
    }
  }

  if (currentCharacter) {
    characters.push(currentCharacter as Character);
  }

  return characters;
}

// 读取伏笔池
export async function getForeshadowing(): Promise<any[]> {
  const filePath = path.join(PROJECT_ROOT, '故事/伏笔池.md');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseForeshadowing(content);
}

// 解析伏笔池
function parseForeshadowing(content: string): any[] {
  const foreshadowing: any[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // 检测章节标题
    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine.substring(3).trim();
      headerFound = false;
      continue;
    }

    // 跳过表头行（包含 | 且包含关键词）
    if (trimmedLine.startsWith('|') && !headerFound) {
      const lowerLine = trimmedLine.toLowerCase();
      if (lowerLine.includes('hook_id') || lowerLine.includes('内容') || lowerLine.includes('状态') ||
          lowerLine.includes('章节') || lowerLine.includes('摘要') || lowerLine.includes('类型')) {
        headerFound = true;
        continue;
      }
    }

    // 跳过表头分隔行
    if (trimmedLine.startsWith('|') && trimmedLine.includes('---')) {
      continue;
    }

    // 解析表格数据行
    if (trimmedLine.startsWith('|') && headerFound && currentSection) {
      const cells = trimmedLine.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 3) continue;

      const item: any = {
        id: '',
        name: '',
        status: 'planted',
        plantedChapter: 1,
        relatedChapters: [],
        description: '',
        section: currentSection,
      };

      // 根据section判断表格格式
      if (currentSection.includes('章新增') || currentSection.includes('章伏笔')) {
        // 章节新增格式: hook_id | 内容 | 状态 | src_fact
        item.id = cells[0] || `foreshadow-${foreshadowing.length + 1}`;
        item.name = cells[1] || '';
        item.description = cells[1] || '';

        // 状态映射
        const statusValue = cells[2] || '';
        const statusMap: Record<string, string> = {
          'open': 'progressing',
          '推进中': 'progressing',
          '待推进': 'planted',
          '已回收': 'resolved',
          'dormant': 'planted',
          'foreshadowing': 'progressing',
        };
        item.status = statusMap[statusValue] || 'planted';

        // 从 hook_id 提取章节号
        const hookMatch = item.id.match(/hook-(\d+)-/);
        if (hookMatch) {
          item.plantedChapter = parseInt(hookMatch[1]);
        }

        // 从 src_fact 提取关联事实
        if (cells[3]) {
          const factMatches = cells[3].match(/\d+/g);
          if (factMatches) {
            item.relatedChapters = factMatches.map(Number).filter(n => n > 0 && n < 1000);
          }
        }
      } else if (currentSection.includes('活跃伏笔')) {
        // 活跃伏笔格式: hook_id | 类型 | 章节 | 内容摘要 | 状态 | 关联事实
        item.id = cells[0] || `foreshadow-${foreshadowing.length + 1}`;

        // 章节号
        if (cells[2] && /^\d+$/.test(cells[2])) {
          item.plantedChapter = parseInt(cells[2]);
        }

        // 内容摘要
        item.name = cells[3] || '';
        item.description = cells[3] || '';

        // 状态映射
        const statusValue = cells[4] || '';
        if (statusValue.includes('已回收')) {
          item.status = 'resolved';
        } else if (statusValue.includes('推进中')) {
          item.status = 'progressing';
        } else if (statusValue.includes('待推进')) {
          item.status = 'planted';
        } else {
          item.status = 'planted';
        }

        // 关联事实
        if (cells[5]) {
          const factMatches = cells[5].match(/\d+/g);
          if (factMatches) {
            item.relatedChapters = factMatches.map(Number).filter(n => n > 0 && n < 1000);
          }
        }
      } else if (currentSection.includes('推进/回收')) {
        // 推进/回收记录格式: hook_id | 事件 | 章节 | 变更
        item.id = cells[0] || `foreshadow-${foreshadowing.length + 1}`;
        item.name = cells[1] || '';
        item.description = cells[1] || '';

        // 章节号
        if (cells[2] && /^\d+$/.test(cells[2])) {
          item.plantedChapter = parseInt(cells[2]);
        }

        // 从变更中提取状态
        if (cells[3]) {
          if (cells[3].includes('已回收')) {
            item.status = 'resolved';
          } else if (cells[3].includes('推进')) {
            item.status = 'progressing';
          }
        }
      } else {
        // 默认格式
        item.id = cells[0] || `foreshadow-${foreshadowing.length + 1}`;
        item.name = cells[1] || cells[2] || '';
        item.description = cells[1] || cells[2] || '';
      }

      // 如果没有 name，使用 description
      if (!item.name && item.description) {
        item.name = item.description.substring(0, 50);
      }

      if (item.name || item.description) {
        foreshadowing.push(item);
      }
    }
  }

  return foreshadowing;
}

// 读取大纲
export async function getOutline(): Promise<Outline> {
  const filePath = path.join(PROJECT_ROOT, '00-大纲.md');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseOutline(content);
}

// 解析大纲
function parseOutline(content: string): Outline {
  const lines = content.split('\n');
  let title = '';
  let synopsis = '';
  const volumes: any[] = [];
  let currentVolume: any = null;
  let currentChapter: any = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
    } else if (line.startsWith('## ') && !line.startsWith('### ')) {
      if (currentVolume) {
        volumes.push(currentVolume);
      }
      currentVolume = {
        id: line.substring(3).trim(),
        title: line.substring(3).trim(),
        description: '',
        chapters: [],
      };
    } else if (line.startsWith('### ') && currentVolume) {
      if (currentChapter) {
        currentVolume.chapters.push(currentChapter);
      }
      currentChapter = {
        id: line.substring(4).trim(),
        title: line.substring(4).trim(),
        summary: '',
        keyEvents: [],
        status: 'planned',
      };
    } else if (currentChapter && line.startsWith('- ')) {
      currentChapter.keyEvents.push(line.substring(2).trim());
    } else if (currentVolume && !currentChapter && line.trim()) {
      currentVolume.description += line + '\n';
    } else if (!currentVolume && line.trim() && !title) {
      synopsis += line + '\n';
    }
  }

  if (currentChapter && currentVolume) {
    currentVolume.chapters.push(currentChapter);
  }
  if (currentVolume) {
    volumes.push(currentVolume);
  }

  return {
    title,
    synopsis: synopsis.trim(),
    volumes,
  };
}

// 读取同步状态
export async function getSyncStatus(): Promise<any> {
  const filePath = path.join(PROJECT_ROOT, '故事/同步状态.md');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseSyncStatus(content);
}

// 解析同步状态
function parseSyncStatus(content: string): any {
  const lines = content.split('\n');
  const status: any = {
    mode: '',
    syncedTo: '',
    totalFacts: 0,
    latestChapter: 0,
    canContinue: false,
    pendingChapters: [],
  };

  for (const line of lines) {
    if (line.startsWith('- 模式：')) {
      status.mode = line.substring(5).trim();
    } else if (line.startsWith('- 已同步至：')) {
      status.syncedTo = line.substring(7).trim();
      const match = status.syncedTo.match(/第(\d+)章/);
      if (match) {
        status.syncedTo = parseInt(match[1]);
      }
    } else if (line.startsWith('- 累计')) {
      const match = line.match(/(\d+) 条事实/);
      if (match) {
        status.totalFacts = parseInt(match[1]);
      }
    } else if (line.startsWith('- 最新已创作章节：')) {
      const match = line.match(/第(\d+)章/);
      if (match) {
        status.latestChapter = parseInt(match[1]);
      }
    } else if (line.startsWith('- 是否允许继续写新章：')) {
      status.canContinue = line.includes('是');
    } else if (line.startsWith('- [ ] 第')) {
      const match = line.match(/第(\d+)章/);
      if (match) {
        status.pendingChapters.push(parseInt(match[1]));
      }
    }
  }

  return status;
}
