import { getDatabase } from './database';

// ==================== 运行时产物 ====================
// 参照 inkos 的 story/runtime/chapter-XXXX.intent.md 等

export interface RuntimeArtifact {
  id: string;            // `${novelId}-${chapterId}-${type}`
  novel_id: string;
  chapter_id: number;
  artifact_type: 'intent' | 'context' | 'rule_stack' | 'trace';
  content: string;       // JSON 或 Markdown
  created_at: string;
}

// 保存运行时产物
export function saveRuntimeArtifact(
  novelId: string,
  chapterId: number,
  type: RuntimeArtifact['artifact_type'],
  content: any,
): void {
  const db = getDatabase();
  const id = `${novelId}-${String(chapterId).padStart(4, '0')}-${type}`;
  const now = new Date().toISOString();
  const serialized = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  db.prepare(`
    INSERT OR REPLACE INTO runtime_artifacts (id, novel_id, chapter_id, artifact_type, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, novelId, chapterId, type, serialized, now);
}

// 获取运行时产物
export function getRuntimeArtifact(
  novelId: string,
  chapterId: number,
  type: RuntimeArtifact['artifact_type'],
): RuntimeArtifact | null {
  const db = getDatabase();
  const id = `${novelId}-${String(chapterId).padStart(4, '0')}-${type}`;
  return db.prepare('SELECT * FROM runtime_artifacts WHERE id = ?').get(id) as RuntimeArtifact | null;
}

// 获取章节的所有运行时产物
export function getChapterArtifacts(novelId: string, chapterId: number): RuntimeArtifact[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM runtime_artifacts WHERE novel_id = ? AND chapter_id = ? ORDER BY artifact_type'
  ).all(novelId, chapterId) as RuntimeArtifact[];
}

// 获取小说的所有运行时产物
export function getNovelArtifacts(novelId: string): RuntimeArtifact[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM runtime_artifacts WHERE novel_id = ? ORDER BY chapter_id, artifact_type'
  ).all(novelId) as RuntimeArtifact[];
}
