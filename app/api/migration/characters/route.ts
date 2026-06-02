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

    const characters = parseCharacters(content);
    let inserted = 0;

    for (const char of characters) {
      const existing = db.prepare('SELECT name FROM story_characters WHERE name = ? AND novel_id = ?')
        .get(char.name, 'default');
      
      if (existing) {
        // 更新已有记录
        db.prepare(`
          UPDATE story_characters SET role = ?, personality = ?, speaking_style = ?, current_state = ?, relations = ?, updated_at = ?
          WHERE name = ? AND novel_id = ?
        `).run(char.role, char.personality, char.speakingStyle, char.currentState, char.relations, new Date().toISOString(), char.name, 'default');
      } else {
        db.prepare(`
          INSERT INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, relations, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('default', char.name, char.role, char.personality, char.speakingStyle, char.currentState, char.relations, new Date().toISOString());
      }
      inserted++;
    }

    return NextResponse.json({ success: true, total: characters.length, inserted });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

interface ParsedCharacter {
  name: string;
  role: string;
  personality: string;
  speakingStyle: string;
  currentState: string;
  relations: string;
}

function parseCharacters(content: string): ParsedCharacter[] {
  const characters: ParsedCharacter[] = [];
  const sections = content.split(/^## /m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const name = lines[0]?.trim();
    if (!name) continue;

    const char: ParsedCharacter = {
      name: cleanName(name),
      role: '',
      personality: '',
      speakingStyle: '',
      currentState: '',
      relations: '',
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- **定位**:') || trimmed.startsWith('- **定位**:')) {
        char.role = trimmed.replace(/^- \*\*定位\*\*:\s*/, '').trim();
      } else if (trimmed.startsWith('- **性格**:') || trimmed.startsWith('- **性格**:')) {
        char.personality = trimmed.replace(/^- \*\*性格\*\*:\s*/, '').trim();
      } else if (trimmed.startsWith('- **说话**:') || trimmed.startsWith('- **说话**:')) {
        char.speakingStyle = trimmed.replace(/^- \*\*说话\*\*:\s*/, '').trim();
      } else if (trimmed.startsWith('- **当前**:') || trimmed.startsWith('- **当前**:')) {
        char.currentState = trimmed.replace(/^- \*\*当前\*\*:\s*/, '').trim();
      } else if (trimmed.startsWith('- **关系**:') || trimmed.startsWith('- **关系**:')) {
        char.relations = trimmed.replace(/^- \*\*关系\*\*:\s*/, '').trim();
      }
    }

    // 只添加有名字的角色
    if (char.name && char.name.length < 30) {
      characters.push(char);
    }
  }

  return characters;
}

function cleanName(name: string): string {
  // 移除括号里的章节备注，如 "铁屠户（64章收服，67章首次主动援助）" → "铁屠户"
  return name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
}
