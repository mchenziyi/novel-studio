import fs from 'fs/promises';
import path from 'path';
import { GlobalSettings, DEFAULT_SETTINGS } from '@/types/settings';

const CONFIG_DIR = path.join(process.cwd(), '.config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // 目录已存在
  }
}

export async function getSettings(): Promise<GlobalSettings> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
