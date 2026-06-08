import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.data', 'novel-studio.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  // 迁移：为现有表添加 novel_id 列（如果不存在）
  try {
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

    // 为现有表添加 novel_id 列
    if (tableNames.includes('chapters')) {
      const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all() as any[];
      if (!chaptersColumns.some(c => c.name === 'novel_id')) {
        db.exec("ALTER TABLE chapters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
      }
    }

    if (tableNames.includes('characters')) {
      const charactersColumns = db.prepare("PRAGMA table_info(characters)").all() as any[];
      if (!charactersColumns.some(c => c.name === 'novel_id')) {
        db.exec("ALTER TABLE characters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
      }
    }

    if (tableNames.includes('foreshadowing')) {
      const foreshadowingColumns = db.prepare("PRAGMA table_info(foreshadowing)").all() as any[];
      if (!foreshadowingColumns.some(c => c.name === 'novel_id')) {
        db.exec("ALTER TABLE foreshadowing ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
      }
    }

    if (tableNames.includes('outline')) {
      const outlineColumns = db.prepare("PRAGMA table_info(outline)").all() as any[];
      if (!outlineColumns.some(c => c.name === 'novel_id')) {
        db.exec("ALTER TABLE outline ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
      }
    }

    if (tableNames.includes('chat_sessions')) {
      const chatSessionsColumns = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
      if (!chatSessionsColumns.some(c => c.name === 'novel_id')) {
        db.exec("ALTER TABLE chat_sessions ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
      }
      if (!chatSessionsColumns.some(c => c.name === 'deleted_at')) {
        db.exec("ALTER TABLE chat_sessions ADD COLUMN deleted_at TEXT");
      }
    }
  } catch (error) {
    // 忽略迁移错误
    console.log('Migration note:', error);
  }

  // 创建表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      file TEXT NOT NULL,
      status TEXT CHECK(status IN ('synced', 'pending', 'audit')) DEFAULT 'pending',
      last_modified TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      source TEXT CHECK(source IN ('manual', 'agent', 'rollback')) NOT NULL,
      agent_name TEXT,
      description TEXT,
      git_commit_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('protagonist', 'antagonist', 'supporting')) NOT NULL,
      status TEXT CHECK(status IN ('alive', 'dead', 'unknown')) DEFAULT 'unknown',
      description TEXT,
      first_appearance INTEGER,
      last_appearance INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS character_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('family', 'friend', 'enemy', 'lover', 'colleague', 'mentor', 'rival')) NOT NULL,
      strength REAL CHECK(strength >= 0 AND strength <= 1) DEFAULT 0.5,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS foreshadowing (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      description TEXT,
      status TEXT CHECK(status IN ('planted', 'progressing', 'resolved')) DEFAULT 'planted',
      planted_chapter INTEGER,
      resolved_chapter INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS foreshadowing_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      foreshadowing_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      FOREIGN KEY (foreshadowing_id) REFERENCES foreshadowing(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outline (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      settings TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      chapter_id TEXT,
      context TEXT CHECK(context IN ('write', 'edit', 'brainstorm', 'analyze')) DEFAULT 'brainstorm',
      model TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      category TEXT CHECK(category IN ('character', 'world_rule', 'writing_style', 'plot_rule', 'user_preference', 'correction', 'fact')) NOT NULL,
      key TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      importance INTEGER CHECK(importance >= 1 AND importance <= 5) DEFAULT 3,
      use_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_facts (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      chapter INTEGER NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_hooks (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      chapter INTEGER,
      type TEXT DEFAULT 'planted',
      content TEXT NOT NULL,
      fact_ids TEXT,
      status TEXT DEFAULT 'open',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id TEXT NOT NULL DEFAULT 'default',
      chapter INTEGER NOT NULL,
      title TEXT,
      summary TEXT,
      key_events TEXT,
      fact_range TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      UNIQUE(novel_id, chapter)
    );

    CREATE TABLE IF NOT EXISTS story_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id TEXT NOT NULL DEFAULT 'default',
      category TEXT,
      key TEXT NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      UNIQUE(novel_id, category, key)
    );

    CREATE TABLE IF NOT EXISTS story_characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      role TEXT,
      status TEXT,
      personality TEXT,
      speaking_style TEXT,
      current_state TEXT,
      relations TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      UNIQUE(novel_id, name)
    );

    CREATE TABLE IF NOT EXISTS story_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id TEXT NOT NULL DEFAULT 'default',
      chapter INTEGER,
      resource_name TEXT NOT NULL,
      change_type TEXT,
      amount TEXT,
      description TEXT,
      fact_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_plotlines (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      start_chapter INTEGER,
      end_chapter INTEGER,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_sync (
      novel_id TEXT PRIMARY KEY,
      synced_chapter INTEGER DEFAULT 0,
      total_facts INTEGER DEFAULT 0,
      latest_chapter INTEGER DEFAULT 0,
      can_continue INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);
    CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_last_modified ON chapters(last_modified);
    CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_id ON chapter_versions(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_chapter_versions_timestamp ON chapter_versions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);
    CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_foreshadowing_status ON foreshadowing(status);
    CREATE INDEX IF NOT EXISTS idx_foreshadowing_novel_id ON foreshadowing(novel_id);
    CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_chapter_id ON chat_sessions(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_novel_id ON chat_sessions(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_novel_id ON memories(novel_id);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
    CREATE TABLE IF NOT EXISTS novel_configs (
      novel_id TEXT NOT NULL,
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (novel_id, config_key),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS style_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      llm_guide TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    -- 审计结果表
    CREATE TABLE IF NOT EXISTS audit_results (
      id TEXT PRIMARY KEY,
      chapter_id INTEGER NOT NULL,
      pipeline_id TEXT NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      total_issues INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      info_count INTEGER DEFAULT 0,
      overall_score INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 审计维度详情表
    CREATE TABLE IF NOT EXISTS audit_dimension_results (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      dimension_name TEXT NOT NULL,
      dimension_label TEXT NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      score INTEGER DEFAULT 0,
      issues_json TEXT DEFAULT '[]',
      FOREIGN KEY (audit_id) REFERENCES audit_results(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_results_chapter_id ON audit_results(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_audit_results_pipeline_id ON audit_results(pipeline_id);
    CREATE INDEX IF NOT EXISTS idx_audit_dimension_results_audit_id ON audit_dimension_results(audit_id);

    -- 输入治理控制面表
    CREATE TABLE IF NOT EXISTS novel_governance (
      novel_id TEXT NOT NULL,
      doc_type TEXT NOT NULL CHECK(doc_type IN ('author_intent', 'current_focus')),
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (novel_id, doc_type),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    -- 运行时产物表
    CREATE TABLE IF NOT EXISTS runtime_artifacts (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id INTEGER NOT NULL,
      artifact_type TEXT NOT NULL CHECK(artifact_type IN ('intent', 'context', 'rule_stack', 'trace')),
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_runtime_artifacts_novel_chapter ON runtime_artifacts(novel_id, chapter_id);

    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    CREATE INDEX IF NOT EXISTS idx_story_facts_novel_id ON story_facts(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_facts_chapter ON story_facts(chapter);
    CREATE INDEX IF NOT EXISTS idx_story_hooks_novel_id ON story_hooks(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_hooks_status ON story_hooks(status);
    CREATE INDEX IF NOT EXISTS idx_story_summaries_novel_id ON story_summaries(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_state_novel_id ON story_state(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_characters_novel_id ON story_characters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_resources_novel_id ON story_resources(novel_id);
    CREATE INDEX IF NOT EXISTS idx_story_plotlines_novel_id ON story_plotlines(novel_id);
  `);

  // 迁移：为现有表添加 novel_id 列（如果不存在）
  try {
    const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all() as any[];
    if (!chaptersColumns.some(c => c.name === 'novel_id')) {
      db.exec("ALTER TABLE chapters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    }

    const charactersColumns = db.prepare("PRAGMA table_info(characters)").all() as any[];
    if (!charactersColumns.some(c => c.name === 'novel_id')) {
      db.exec("ALTER TABLE characters ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    }

    const foreshadowingColumns = db.prepare("PRAGMA table_info(foreshadowing)").all() as any[];
    if (!foreshadowingColumns.some(c => c.name === 'novel_id')) {
      db.exec("ALTER TABLE foreshadowing ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    }

    const outlineColumns = db.prepare("PRAGMA table_info(outline)").all() as any[];
    if (!outlineColumns.some(c => c.name === 'novel_id')) {
      db.exec("ALTER TABLE outline ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    }

    const chatSessionsColumns = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
    if (!chatSessionsColumns.some(c => c.name === 'novel_id')) {
      db.exec("ALTER TABLE chat_sessions ADD COLUMN novel_id TEXT NOT NULL DEFAULT 'default'");
    }
    if (!chatSessionsColumns.some(c => c.name === 'deleted_at')) {
      db.exec("ALTER TABLE chat_sessions ADD COLUMN deleted_at TEXT");
    }
  } catch (error) {
    // 忽略迁移错误（可能列已存在）
    console.log('Migration note:', error);
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
