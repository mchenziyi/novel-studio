import { getDatabase } from './database';

export function migrateDatabase() {
  const db = getDatabase();

  // 检查并添加 novels 表
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('novels')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS novels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        author TEXT,
        cover_image TEXT,
        project_path TEXT,
        status TEXT CHECK(status IN ('active', 'archived', 'draft')) DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    
    // 插入默认小说
    db.prepare(`
      INSERT OR IGNORE INTO novels (id, title, description, status, created_at, updated_at)
      VALUES ('default', '开局屠村现场-他们说我疯了', '网络小说', 'active', datetime('now'), datetime('now'))
    `).run();
  }

  // 检查并添加 novel_id 列到 chapters 表
  const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all() as any[];
  if (!chaptersColumns.some(c => c.name === 'novel_id')) {
    db.exec("ALTER TABLE chapters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id)");
  }

  // 检查并添加 novel_id 列到 characters 表
  const charactersColumns = db.prepare("PRAGMA table_info(characters)").all() as any[];
  if (!charactersColumns.some(c => c.name === 'novel_id')) {
    db.exec("ALTER TABLE characters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id)");
  }

  // 检查并添加 novel_id 列到 foreshadowing 表
  const foreshadowingColumns = db.prepare("PRAGMA table_info(foreshadowing)").all() as any[];
  if (!foreshadowingColumns.some(c => c.name === 'novel_id')) {
    db.exec("ALTER TABLE foreshadowing ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_foreshadowing_novel_id ON foreshadowing(novel_id)");
  }

  // 检查并添加 novel_id 列到 outline 表
  const outlineColumns = db.prepare("PRAGMA table_info(outline)").all() as any[];
  if (!outlineColumns.some(c => c.name === 'novel_id')) {
    db.exec("ALTER TABLE outline ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
  }

  // 检查并添加 novel_id 和 deleted_at 列到 chat_sessions 表
  const chatSessionsColumns = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
  if (!chatSessionsColumns.some(c => c.name === 'novel_id')) {
    db.exec("ALTER TABLE chat_sessions ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_chat_sessions_novel_id ON chat_sessions(novel_id)");
  }
  if (!chatSessionsColumns.some(c => c.name === 'deleted_at')) {
    db.exec("ALTER TABLE chat_sessions ADD COLUMN deleted_at TEXT");
  }

  console.log('Database migration completed');
}
