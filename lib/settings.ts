import { GlobalSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { getDatabase } from './database';

export async function getSettings(): Promise<GlobalSettings> {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('global') as any;

  if (row) {
    try {
      const saved = JSON.parse(row.value);
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
    .run('global', JSON.stringify(settings), now);
}
