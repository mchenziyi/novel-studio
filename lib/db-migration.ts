import fs from 'fs/promises';
import path from 'path';
import { getDatabase } from './database';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

export async function migrateFromFileSystem() {
  const db = getDatabase();
  console.log('Starting migration from file system to database...');

  // Migrate chapters
  await migrateChapters(db);

  // Migrate characters
  await migrateCharacters(db);

  // Migrate foreshadowing
  await migrateForeshadowing(db);

  // Migrate outline
  await migrateOutline(db);

  console.log('Migration completed successfully!');
}

async function migrateChapters(db: any) {
  const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
  try {
    const files = await fs.readdir(chaptersDir);
    const chapterFiles = files.filter(f => f.endsWith('.md') && /^\d+_/.test(f));

    console.log(`Found ${chapterFiles.length} chapter files to migrate`);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO chapters (id, title, content, word_count, file, status, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((chapters: any[]) => {
      for (const ch of chapters) {
        insert.run(ch.id, ch.title, ch.content, ch.wordCount, ch.file, ch.status, ch.lastModified);
      }
    });

    const chapters = [];
    for (const file of chapterFiles) {
      const match = file.match(/^(\d+)_(.+)\.md$/);
      if (match) {
        const content = await fs.readFile(path.join(chaptersDir, file), 'utf-8');
        const stat = await fs.stat(path.join(chaptersDir, file));
        chapters.push({
          id: match[1],
          title: match[2],
          content,
          wordCount: content.length,
          file,
          status: 'pending',
          lastModified: stat.mtime.toISOString(),
        });
      }
    }

    insertMany(chapters);
    console.log(`Migrated ${chapters.length} chapters`);
  } catch (error) {
    console.error('Error migrating chapters:', error);
  }
}

async function migrateCharacters(db: any) {
  const filePath = path.join(PROJECT_ROOT, '故事', '角色矩阵.md');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const characters = parseCharactersFromMarkdown(content);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO characters (id, name, role, status, description, first_appearance, last_appearance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRelation = db.prepare(`
      INSERT INTO character_relations (source_id, target_id, type, strength, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((chars: any[]) => {
      for (const char of chars) {
        insert.run(char.id, char.name, char.role, char.status, char.description, char.firstAppearance, char.lastAppearance);
        for (const rel of char.relations || []) {
          insertRelation.run(char.id, rel.target, rel.type, rel.strength, rel.description);
        }
      }
    });

    insertMany(characters);
    console.log(`Migrated ${characters.length} characters`);
  } catch (error) {
    console.error('Error migrating characters:', error);
  }
}

function parseCharactersFromMarkdown(content: string): any[] {
  const characters: any[] = [];
  const lines = content.split('\n');
  let currentChar: any = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (currentChar) {
        characters.push(currentChar);
      }
      currentChar = {
        id: headingMatch[1].toLowerCase().replace(/\s+/g, '-'),
        name: headingMatch[1],
        role: 'supporting',
        status: 'unknown',
        description: '',
        firstAppearance: 1,
        relations: [],
      };
    } else if (currentChar) {
      if (line.includes('主角')) currentChar.role = 'protagonist';
      if (line.includes('反派') || line.includes('对手')) currentChar.role = 'antagonist';
      if (line.includes('死亡')) currentChar.status = 'dead';
      if (line.includes('存活')) currentChar.status = 'alive';
      if (line.trim() && !currentChar.description) {
        currentChar.description = line.trim();
      }
    }
  }

  if (currentChar) {
    characters.push(currentChar);
  }

  return characters;
}

async function migrateForeshadowing(db: any) {
  const filePath = path.join(PROJECT_ROOT, '故事', '伏笔池.md');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const items = parseForeshadowingFromMarkdown(content);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO foreshadowing (id, name, description, status, planted_chapter, resolved_chapter)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        insert.run(item.id, item.name, item.description, item.status, item.plantedChapter, item.resolvedChapter);
      }
    });

    insertMany(items);
    console.log(`Migrated ${items.length} foreshadowing items`);
  } catch (error) {
    console.error('Error migrating foreshadowing:', error);
  }
}

function parseForeshadowingFromMarkdown(content: string): any[] {
  const items: any[] = [];
  const lines = content.split('\n');
  let currentItem: any = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = {
        id: headingMatch[1].toLowerCase().replace(/\s+/g, '-'),
        name: headingMatch[1],
        description: '',
        status: 'planted',
        plantedChapter: null,
        resolvedChapter: null,
      };
    } else if (currentItem) {
      if (line.includes('已回收')) currentItem.status = 'resolved';
      if (line.includes('推进中')) currentItem.status = 'progressing';
      const chapterMatch = line.match(/第(\d+)章/);
      if (chapterMatch) {
        if (!currentItem.plantedChapter) {
          currentItem.plantedChapter = parseInt(chapterMatch[1]);
        }
        currentItem.resolvedChapter = parseInt(chapterMatch[1]);
      }
      if (line.trim() && !currentItem.description) {
        currentItem.description = line.trim();
      }
    }
  }

  if (currentItem) {
    items.push(currentItem);
  }

  return items;
}

async function migrateOutline(db: any) {
  const filePath = path.join(PROJECT_ROOT, '00-大纲.md');
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const insert = db.prepare(`
      INSERT OR REPLACE INTO outline (id, content, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    insert.run('main', content);
    console.log('Migrated outline');
  } catch (error) {
    console.error('Error migrating outline:', error);
  }
}
