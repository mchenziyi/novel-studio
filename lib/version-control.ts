import { diffLines } from 'diff';
import { ChapterVersion } from '@/types';
import { getDatabase } from './database';
import { getChapter, updateChapter } from './file-system';

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
  const db = getDatabase();
  const versionId = Date.now().toString();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO chapter_versions (id, chapter_id, content, timestamp, source, agent_name, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(versionId, chapterId, content, now, source, options?.agentName || null, options?.description || null, now);

  return {
    id: versionId,
    chapterId,
    content,
    timestamp: new Date(now),
    source,
    agentName: options?.agentName,
    description: options?.description,
  };
}

// 获取章节版本历史
export async function getVersionHistory(chapterId: string): Promise<ChapterVersion[]> {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY timestamp DESC').all(chapterId) as any[];

  return rows.map(row => ({
    id: row.id,
    chapterId: row.chapter_id,
    content: row.content,
    timestamp: new Date(row.timestamp),
    source: row.source,
    agentName: row.agent_name,
    description: row.description,
    gitCommitHash: row.git_commit_hash,
  }));
}

// 获取指定版本
export async function getVersion(chapterId: string, versionId: string): Promise<ChapterVersion | null> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM chapter_versions WHERE id = ? AND chapter_id = ?').get(versionId, chapterId) as any;

  if (!row) return null;

  return {
    id: row.id,
    chapterId: row.chapter_id,
    content: row.content,
    timestamp: new Date(row.timestamp),
    source: row.source,
    agentName: row.agent_name,
    description: row.description,
    gitCommitHash: row.git_commit_hash,
  };
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

  // 更新章节内容
  await updateChapter(chapterId, version.content);

  // 创建回滚版本记录
  await createVersion(chapterId, version.content, 'rollback', {
    description: `Rollback to version ${versionId}`,
  });
}

// 清理旧版本（保留最近 50 个版本）
export async function cleanupOldVersions(chapterId: string, keepCount: number = 50): Promise<void> {
  const db = getDatabase();
  const count = (db.prepare('SELECT COUNT(*) as count FROM chapter_versions WHERE chapter_id = ?').get(chapterId) as any).count;

  if (count <= keepCount) {
    return;
  }

  // 删除多余的版本
  db.prepare(`
    DELETE FROM chapter_versions
    WHERE chapter_id = ? AND id NOT IN (
      SELECT id FROM chapter_versions
      WHERE chapter_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    )
  `).run(chapterId, chapterId, keepCount);
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
  // 更新章节内容
  await updateChapter(chapterId, content);

  // 创建版本记录
  return await createVersion(chapterId, content, source, options);
}
