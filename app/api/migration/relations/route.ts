import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

export async function POST(request: NextRequest) {
  try {
    const filePath = path.join(PROJECT_ROOT, '故事', '角色矩阵.md');
    const content = await fs.readFile(filePath, 'utf-8');
    const db = getDatabase();

    // 清除旧的 character_relations
    db.prepare('DELETE FROM character_relations').run();

    const sections = content.split(/^## /m).filter(s => s.trim());
    let relationsInserted = 0;

    for (const section of sections) {
      const lines = section.split('\n');
      const charName = cleanName(lines[0]?.trim());
      if (!charName || charName.length >= 30) continue;

      // 找到关系行
      const relationLine = lines.find(l => l.trim().startsWith('- **关系**:') || l.trim().startsWith('- **关系**:'));
      if (!relationLine) continue;

      const relationText = relationLine.replace(/^- \*\*关系\*\*:\s*/, '').trim();
      const parts = relationText.split('|').map(p => p.trim()).filter(p => p);

      for (const part of parts) {
        // 格式: 角色名（关系描述）
        const match = part.match(/^([^（]+)（(.+)）$/);
        if (!match) continue;

        const targetName = match[1].trim();
        const desc = match[2].trim();

        // 排除非角色（如"巡道衙"）
        if (targetName.length >= 10) continue;

        const relationType = inferRelationType(desc);
        const strength = inferStrength(desc);

        // 检查目标角色是否存在
        const targetExists = db.prepare('SELECT name FROM story_characters WHERE name = ? AND novel_id = ?')
          .get(targetName, 'default');
        if (!targetExists) continue;

        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM character_relations WHERE source_id = ? AND target_id = ?')
          .get(charName, targetName);
        if (existing) continue;

        db.prepare(`
          INSERT INTO character_relations (source_id, target_id, type, strength, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(charName, targetName, relationType, strength, desc, new Date().toISOString());
        relationsInserted++;
      }
    }

    // 从旧 characters 表恢复角色类型到 story_characters
    const oldChars = db.prepare('SELECT id, name, role FROM characters WHERE novel_id = ?').all('default') as any[];
    let rolesUpdated = 0;

    for (const old of oldChars) {
      const cleanName_ = cleanName(old.name);
      const existing = db.prepare('SELECT name FROM story_characters WHERE name = ? AND novel_id = ?')
        .get(cleanName_, 'default');
      if (existing && old.role) {
        db.prepare('UPDATE story_characters SET role = ? WHERE name = ? AND novel_id = ?')
          .run(old.role, cleanName_, 'default');
        rolesUpdated++;
      }
    }

    return NextResponse.json({ success: true, relationsInserted, rolesUpdated });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function cleanName(name: string): string {
  return name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
}

function inferRelationType(desc: string): string {
  if (desc.includes('共生') || desc.includes('保护')) return 'friend';
  if (desc.includes('救命') || desc.includes('恩人')) return 'mentor';
  if (desc.includes('审视') || desc.includes('敌')) return 'rival';
  if (desc.includes('照护') || desc.includes('药师')) return 'friend';
  if (desc.includes('刻印') || desc.includes('赠')) return 'friend';
  if (desc.includes('姐姐') || desc.includes('家人')) return 'family';
  return 'colleague';
}

function inferStrength(desc: string): number {
  if (desc.includes('共生') || desc.includes('保护')) return 0.9;
  if (desc.includes('救命') || desc.includes('恩人')) return 0.8;
  if (desc.includes('审视')) return 0.5;
  if (desc.includes('照护')) return 0.6;
  return 0.5;
}
