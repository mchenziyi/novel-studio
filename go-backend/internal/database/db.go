package database

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(dbPath string) error {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var err error
	DB, err = sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=ON")
	if err != nil {
		return err
	}
	DB.SetMaxOpenConns(1)

	if err := migrate(); err != nil {
		return err
	}
	log.Println("[DB] initialized:", dbPath)
	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}

func migrate() error {
	_, err := DB.Exec(migrationSQL)
	return err
}

const migrationSQL = `
CREATE TABLE IF NOT EXISTS novels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  cover_image TEXT,
  project_path TEXT,
  status TEXT CHECK(status IN ('active','archived','draft')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  file TEXT NOT NULL,
  status TEXT CHECK(status IN ('synced','pending','audit')) DEFAULT 'pending',
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
  source TEXT CHECK(source IN ('manual','agent','rollback')) NOT NULL,
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
  role TEXT CHECK(role IN ('protagonist','antagonist','supporting')) NOT NULL,
  status TEXT CHECK(status IN ('alive','dead','unknown')) DEFAULT 'unknown',
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
  type TEXT CHECK(type IN ('family','friend','enemy','lover','colleague','mentor','rival')) NOT NULL,
  strength REAL CHECK(strength>=0 AND strength<=1) DEFAULT 0.5,
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
  status TEXT CHECK(status IN ('planted','progressing','resolved')) DEFAULT 'planted',
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
  context TEXT CHECK(context IN ('write','edit','brainstorm','analyze')) DEFAULT 'brainstorm',
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
  role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL DEFAULT 'default',
  category TEXT CHECK(category IN ('character','world_rule','writing_style','plot_rule','user_preference','correction','fact')) NOT NULL,
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  importance INTEGER CHECK(importance>=1 AND importance<=5) DEFAULT 3,
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

-- 预设默认小说
INSERT OR IGNORE INTO novels (id, title, description, status, created_at, updated_at)
VALUES ('default', '开局屠村现场-他们说我疯了', '网络小说', 'active', datetime('now'), datetime('now'));
`
