import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// POST /api/rename — 全书实体改名（章节内容 + 真相文件）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'oldName 和 newName 必填' }, { status: 400 });
    }

    if (oldName === newName) {
      return NextResponse.json({ error: '新旧名称不能相同' }, { status: 400 });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const results: Record<string, number> = {};

    // 1. 替换章节内容
    const chapters = db.prepare('SELECT id, content FROM chapters WHERE novel_id = ?').all(novelId) as any[];
    let chaptersModified = 0;
    for (const ch of chapters) {
      if (ch.content.includes(oldName)) {
        const newContent = ch.content.replaceAll(oldName, newName);
        db.prepare('UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?')
          .run(newContent, now, ch.id);
        chaptersModified++;
      }
    }
    results.chapters = chaptersModified;

    // 2. 替换 story_characters
    const charResult = db.prepare(
      "UPDATE story_characters SET name = ?, updated_at = ? WHERE name = ? AND novel_id = ?"
    ).run(newName, now, oldName, novelId);
    results.story_characters = charResult.changes;

    // 3. 替换 story_characters 中的 relations 字段
    const charWithRelations = db.prepare(
      "SELECT id, relations FROM story_characters WHERE novel_id = ? AND relations LIKE ?"
    ).all(novelId, `%${oldName}%`) as any[];
    let relationsUpdated = 0;
    for (const c of charWithRelations) {
      const newRelations = c.relations.replaceAll(oldName, newName);
      db.prepare('UPDATE story_characters SET relations = ?, updated_at = ? WHERE id = ?')
        .run(newRelations, now, c.id);
      relationsUpdated++;
    }
    results.relations = relationsUpdated;

    // 4. 替换 story_state 中的 value
    const stateResult = db.prepare(
      "UPDATE story_state SET value = REPLACE(value, ?, ?), updated_at = ? WHERE novel_id = ? AND value LIKE ?"
    ).run(oldName, newName, now, novelId, `%${oldName}%`);
    results.story_state = stateResult.changes;

    // 5. 替换 story_facts 中的 subject 和 content
    const factsResult = db.prepare(
      "UPDATE story_facts SET subject = REPLACE(subject, ?, ?), content = REPLACE(content, ?, ?), created_at = created_at WHERE novel_id = ? AND (subject LIKE ? OR content LIKE ?)"
    ).run(oldName, newName, oldName, newName, novelId, `%${oldName}%`, `%${oldName}%`);
    results.story_facts = factsResult.changes;

    // 6. 替换 story_hooks 中的 content
    const hooksResult = db.prepare(
      "UPDATE story_hooks SET content = REPLACE(content, ?, ?), updated_at = ? WHERE novel_id = ? AND content LIKE ?"
    ).run(oldName, newName, now, novelId, `%${oldName}%`);
    results.story_hooks = hooksResult.changes;

    // 7. 替换 outline
    const outlineResult = db.prepare(
      "UPDATE outline SET content = REPLACE(content, ?, ?), updated_at = ? WHERE (novel_id = ? OR id = ?) AND content LIKE ?"
    ).run(oldName, newName, now, novelId, 'main', `%${oldName}%`);
    results.outline = outlineResult.changes;

    // 8. 替换 characters 表
    const charTableResult = db.prepare(
      "UPDATE characters SET name = ?, updated_at = ? WHERE name = ? AND novel_id = ?"
    ).run(newName, now, oldName, novelId);
    results.characters = charTableResult.changes;

    // 9. 替换 memories
    const memResult = db.prepare(
      "UPDATE memories SET content = REPLACE(content, ?, ?), key = REPLACE(key, ?, ?), updated_at = ? WHERE novel_id = ? AND (content LIKE ? OR key LIKE ?)"
    ).run(oldName, newName, oldName, newName, now, novelId, `%${oldName}%`, `%${oldName}%`);
    results.memories = memResult.changes;

    // 10. 替换 novel_governance
    const govResult = db.prepare(
      "UPDATE novel_governance SET content = REPLACE(content, ?, ?), updated_at = ? WHERE novel_id = ? AND content LIKE ?"
    ).run(oldName, newName, now, novelId, `%${oldName}%`);
    results.governance = govResult.changes;

    const totalChanges = Object.values(results).reduce((sum, n) => sum + n, 0);

    return NextResponse.json({
      success: true,
      oldName,
      newName,
      totalChanges,
      details: results,
      message: `已将「${oldName}」替换为「${newName}」，共修改 ${totalChanges} 处`,
    });
  } catch (error) {
    console.error('Rename failed:', error);
    return NextResponse.json({ error: '改名失败' }, { status: 500 });
  }
}
