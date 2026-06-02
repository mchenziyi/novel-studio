import { getDatabase } from './database';

// ==================== 事实总账 ====================

export interface StoryFact {
  id: string;
  novel_id: string;
  chapter: number;
  category: string;
  subject: string;
  content: string;
  sources?: string;
  created_at: string;
}

export function getStoryFacts(novelId: string, chapter?: number): StoryFact[] {
  const db = getDatabase();
  if (chapter) {
    return db.prepare('SELECT * FROM story_facts WHERE novel_id = ? AND chapter = ? ORDER BY id').all(novelId, chapter) as StoryFact[];
  }
  return db.prepare('SELECT * FROM story_facts WHERE novel_id = ? ORDER BY id').all(novelId) as StoryFact[];
}

export function addStoryFact(novelId: string, fact: Omit<StoryFact, 'novel_id' | 'created_at'>): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO story_facts (id, novel_id, chapter, category, subject, content, sources)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(fact.id, novelId, fact.chapter, fact.category, fact.subject, fact.content, fact.sources || null);
}

export function getLastFactId(novelId: string, chapter: number): string | null {
  const db = getDatabase();
  const row = db.prepare('SELECT id FROM story_facts WHERE novel_id = ? AND chapter = ? ORDER BY id DESC LIMIT 1').get(novelId, chapter) as any;
  return row?.id || null;
}

// ==================== 伏笔池 ====================

export interface StoryHook {
  id: string;
  novel_id: string;
  chapter?: number;
  type: string;
  content: string;
  fact_ids?: string;
  status: string;
  updated_at: string;
}

export function getStoryHooks(novelId: string, status?: string): StoryHook[] {
  const db = getDatabase();
  if (status) {
    return db.prepare('SELECT * FROM story_hooks WHERE novel_id = ? AND status = ? ORDER BY chapter').all(novelId, status) as StoryHook[];
  }
  return db.prepare('SELECT * FROM story_hooks WHERE novel_id = ? ORDER BY chapter').all(novelId) as StoryHook[];
}

export function addStoryHook(novelId: string, hook: Omit<StoryHook, 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO story_hooks (id, novel_id, chapter, type, content, fact_ids, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(hook.id, novelId, hook.chapter || null, hook.type, hook.content, hook.fact_ids || null, hook.status, now);
}

export function updateStoryHookStatus(novelId: string, hookId: string, status: string): void {
  const db = getDatabase();
  db.prepare('UPDATE story_hooks SET status = ?, updated_at = ? WHERE novel_id = ? AND id = ?').run(status, new Date().toISOString(), novelId, hookId);
}

// ==================== 章节摘要 ====================

export interface StorySummary {
  id: number;
  novel_id: string;
  chapter: number;
  title?: string;
  summary?: string;
  key_events?: string;
  fact_range?: string;
  updated_at: string;
}

export function getStorySummaries(novelId: string): StorySummary[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM story_summaries WHERE novel_id = ? ORDER BY chapter').all(novelId) as StorySummary[];
}

export function upsertStorySummary(novelId: string, summary: Omit<StorySummary, 'id' | 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO story_summaries (novel_id, chapter, title, summary, key_events, fact_range, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(novel_id, chapter) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      key_events = excluded.key_events,
      fact_range = excluded.fact_range,
      updated_at = excluded.updated_at
  `).run(novelId, summary.chapter, summary.title || null, summary.summary || null, summary.key_events || null, summary.fact_range || null, now);
}

// ==================== 当前状态 ====================

export interface StoryState {
  id: number;
  novel_id: string;
  category?: string;
  key: string;
  value?: string;
  updated_at: string;
}

export function getStoryState(novelId: string, category?: string): StoryState[] {
  const db = getDatabase();
  if (category) {
    return db.prepare('SELECT * FROM story_state WHERE novel_id = ? AND category = ? ORDER BY key').all(novelId, category) as StoryState[];
  }
  return db.prepare('SELECT * FROM story_state WHERE novel_id = ? ORDER BY category, key').all(novelId) as StoryState[];
}

export function upsertStoryState(novelId: string, key: string, value: string, category?: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO story_state (novel_id, category, key, value, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(novel_id, category, key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(novelId, category || null, key, value, now);
}

// ==================== 角色矩阵 ====================

export interface StoryCharacter {
  id: number;
  novel_id: string;
  name: string;
  role?: string;
  status?: string;
  personality?: string;
  speaking_style?: string;
  current_state?: string;
  relations?: string;
  updated_at: string;
}

export function getStoryCharacters(novelId: string): StoryCharacter[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM story_characters WHERE novel_id = ? ORDER BY name').all(novelId) as StoryCharacter[];
}

export function upsertStoryCharacter(novelId: string, character: Omit<StoryCharacter, 'id' | 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO story_characters (novel_id, name, role, status, personality, speaking_style, current_state, relations, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(novel_id, name) DO UPDATE SET
      role = excluded.role,
      status = excluded.status,
      personality = excluded.personality,
      speaking_style = excluded.speaking_style,
      current_state = excluded.current_state,
      relations = excluded.relations,
      updated_at = excluded.updated_at
  `).run(novelId, character.name, character.role || null, character.status || null, character.personality || null, character.speaking_style || null, character.current_state || null, character.relations || null, now);
}

// ==================== 资源账本 ====================

export interface StoryResource {
  id: number;
  novel_id: string;
  chapter?: number;
  resource_name: string;
  change_type?: string;
  amount?: string;
  description?: string;
  fact_id?: string;
  updated_at: string;
}

export function getStoryResources(novelId: string): StoryResource[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM story_resources WHERE novel_id = ? ORDER BY chapter, id').all(novelId) as StoryResource[];
}

export function addStoryResource(novelId: string, resource: Omit<StoryResource, 'id' | 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO story_resources (novel_id, chapter, resource_name, change_type, amount, description, fact_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(novelId, resource.chapter || null, resource.resource_name, resource.change_type || null, resource.amount || null, resource.description || null, resource.fact_id || null, now);
}

// ==================== 支线进度 ====================

export interface StoryPlotline {
  id: string;
  novel_id: string;
  name: string;
  status: string;
  start_chapter?: number;
  end_chapter?: number;
  description?: string;
  updated_at: string;
}

export function getStoryPlotlines(novelId: string): StoryPlotline[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM story_plotlines WHERE novel_id = ? ORDER BY start_chapter').all(novelId) as StoryPlotline[];
}

export function upsertStoryPlotline(novelId: string, plotline: Omit<StoryPlotline, 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO story_plotlines (id, novel_id, name, status, start_chapter, end_chapter, description, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(plotline.id, novelId, plotline.name, plotline.status, plotline.start_chapter || null, plotline.end_chapter || null, plotline.description || null, now);
}

// ==================== 同步状态 ====================

export interface StorySync {
  novel_id: string;
  synced_chapter: number;
  total_facts: number;
  latest_chapter: number;
  can_continue: number;
  updated_at: string;
}

export function getStorySync(novelId: string): StorySync | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM story_sync WHERE novel_id = ?').get(novelId) as StorySync | null;
}

export function upsertStorySync(novelId: string, sync: Omit<StorySync, 'novel_id' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO story_sync (novel_id, synced_chapter, total_facts, latest_chapter, can_continue, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(novel_id) DO UPDATE SET
      synced_chapter = excluded.synced_chapter,
      total_facts = excluded.total_facts,
      latest_chapter = excluded.latest_chapter,
      can_continue = excluded.can_continue,
      updated_at = excluded.updated_at
  `).run(novelId, sync.synced_chapter, sync.total_facts, sync.latest_chapter, sync.can_continue, now);
}

// ==================== 获取完整上下文（给 ChatAgent 用）====================

export function getStoryContext(novelId: string): {
  facts: StoryFact[];
  hooks: StoryHook[];
  summaries: StorySummary[];
  state: StoryState[];
  characters: StoryCharacter[];
  resources: StoryResource[];
  plotlines: StoryPlotline[];
  sync: StorySync | null;
} {
  return {
    facts: getStoryFacts(novelId),
    hooks: getStoryHooks(novelId),
    summaries: getStorySummaries(novelId),
    state: getStoryState(novelId),
    characters: getStoryCharacters(novelId),
    resources: getStoryResources(novelId),
    plotlines: getStoryPlotlines(novelId),
    sync: getStorySync(novelId),
  };
}

// ==================== 统计 ====================

export function getStoryStats(novelId: string): {
  totalFacts: number;
  totalHooks: number;
  openHooks: number;
  resolvedHooks: number;
  totalCharacters: number;
  totalPlotlines: number;
  syncedChapter: number;
  latestChapter: number;
} {
  const db = getDatabase();
  
  const factsCount = (db.prepare('SELECT COUNT(*) as count FROM story_facts WHERE novel_id = ?').get(novelId) as any).count;
  const hooksCount = (db.prepare('SELECT COUNT(*) as count FROM story_hooks WHERE novel_id = ?').get(novelId) as any).count;
  const openHooks = (db.prepare("SELECT COUNT(*) as count FROM story_hooks WHERE novel_id = ? AND status = 'open'").get(novelId) as any).count;
  const resolvedHooks = (db.prepare("SELECT COUNT(*) as count FROM story_hooks WHERE novel_id = ? AND status = 'resolved'").get(novelId) as any).count;
  const charactersCount = (db.prepare('SELECT COUNT(*) as count FROM story_characters WHERE novel_id = ?').get(novelId) as any).count;
  const plotlinesCount = (db.prepare('SELECT COUNT(*) as count FROM story_plotlines WHERE novel_id = ?').get(novelId) as any).count;
  
  const sync = getStorySync(novelId);
  
  return {
    totalFacts: factsCount,
    totalHooks: hooksCount,
    openHooks,
    resolvedHooks,
    totalCharacters: charactersCount,
    totalPlotlines: plotlinesCount,
    syncedChapter: sync?.synced_chapter || 0,
    latestChapter: sync?.latest_chapter || 0,
  };
}
