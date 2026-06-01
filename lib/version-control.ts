import fs from 'fs/promises';
import path from 'path';
import { diffLines } from 'diff';
import { ChapterVersion } from '@/types';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';
const HISTORY_DIR = path.join(PROJECT_ROOT, 'chapters/.history');

// 创建新版本
export async function createVersion(
  chapterId: string,
  content: string,
  source: 'manual' | 'agent' | 'rollback',
  options?: {
    agentName?: string;
    description?: string;
  }
): Promise<ChapterVersion> {
  const versionId = Date.now().toString();
  const version: ChapterVersion = {
    id: versionId,
    chapterId,
    content,
    timestamp: new Date(),
    source,
    agentName: options?.agentName,
    description: options?.description,
  };

  // 确保目录存在
  const chapterHistoryDir = path.join(HISTORY_DIR, chapterId);
  await fs.mkdir(chapterHistoryDir, { recursive: true });

  // 保存版本
  const filePath = path.join(chapterHistoryDir, `${versionId}.json`);
  await fs.writeFile(filePath, JSON.stringify(version, null, 2), 'utf-8');

  return version;
}

// 获取章节版本历史
export async function getVersionHistory(chapterId: string): Promise<ChapterVersion[]> {
  const chapterHistoryDir = path.join(HISTORY_DIR, chapterId);

  try {
    const files = await fs.readdir(chapterHistoryDir);
    const versions: ChapterVersion[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(chapterHistoryDir, file), 'utf-8');
        const version = JSON.parse(content);
        version.timestamp = new Date(version.timestamp);
        versions.push(version);
      }
    }

    return versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    // 如果目录不存在，返回空数组
    return [];
  }
}

// 获取指定版本
export async function getVersion(chapterId: string, versionId: string): Promise<ChapterVersion | null> {
  const filePath = path.join(HISTORY_DIR, chapterId, `${versionId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const version = JSON.parse(content);
    version.timestamp = new Date(version.timestamp);
    return version;
  } catch (error) {
    return null;
  }
}

// 计算两个版本的差异
export async function getVersionDiff(
  chapterId: string,
  oldVersionId: string,
  newVersionId: string
): Promise<any[]> {
  const oldVersion = await getVersion(chapterId, oldVersionId);
  const newVersion = await getVersion(chapterId, newVersionId);

  if (!oldVersion || !newVersion) {
    throw new Error('Version not found');
  }

  // 计算行级差异
  const lineDiffs = diffLines(oldVersion.content, newVersion.content);

  // 转换为统一格式
  const result: any[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const diff of lineDiffs) {
    const lines = diff.value.split('\n').filter(line => line !== '');

    for (const line of lines) {
      if (diff.added) {
        result.push({
          type: 'added',
          oldLineNum: null,
          newLineNum: newLineNum++,
          content: line,
        });
      } else if (diff.removed) {
        result.push({
          type: 'removed',
          oldLineNum: oldLineNum++,
          newLineNum: null,
          content: line,
        });
      } else {
        result.push({
          type: 'unchanged',
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
          content: line,
        });
      }
    }
  }

  return result;
}

// 回滚到指定版本
export async function rollbackToVersion(
  chapterId: string,
  versionId: string
): Promise<void> {
  const version = await getVersion(chapterId, versionId);

  if (!version) {
    throw new Error('Version not found');
  }

  // 更新当前章节文件
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);

  for (const file of files) {
    if (file.startsWith(`${chapterId}_`) && file.endsWith('.md')) {
      const filePath = path.join(chaptersDir, file);
      await fs.writeFile(filePath, version.content, 'utf-8');
      break;
    }
  }

  // 创建回滚版本记录
  await createVersion(chapterId, version.content, 'rollback', {
    description: `Rollback to version ${versionId}`,
  });
}

// 清理旧版本（保留最近 50 个版本）
export async function cleanupOldVersions(chapterId: string, keepCount: number = 50): Promise<void> {
  const versions = await getVersionHistory(chapterId);

  if (versions.length <= keepCount) {
    return;
  }

  // 删除多余的版本
  const versionsToDelete = versions.slice(keepCount);
  const chapterHistoryDir = path.join(HISTORY_DIR, chapterId);

  for (const version of versionsToDelete) {
    const filePath = path.join(chapterHistoryDir, `${version.id}.json`);
    await fs.unlink(filePath);
  }
}

// 获取当前章节内容
export async function getCurrentChapterContent(chapterId: string): Promise<string | null> {
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);

  for (const file of files) {
    if (file.startsWith(`${chapterId}_`) && file.endsWith('.md')) {
      const filePath = path.join(chaptersDir, file);
      return await fs.readFile(filePath, 'utf-8');
    }
  }

  return null;
}

// 保存章节内容并创建版本
export async function saveChapterWithVersion(
  chapterId: string,
  content: string,
  source: 'manual' | 'agent' = 'manual',
  options?: {
    agentName?: string;
    description?: string;
  }
): Promise<ChapterVersion> {
  // 更新章节文件
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  const files = await fs.readdir(chaptersDir);

  for (const file of files) {
    if (file.startsWith(`${chapterId}_`) && file.endsWith('.md')) {
      const filePath = path.join(chaptersDir, file);
      await fs.writeFile(filePath, content, 'utf-8');
      break;
    }
  }

  // 创建版本记录
  return await createVersion(chapterId, content, source, options);
}
