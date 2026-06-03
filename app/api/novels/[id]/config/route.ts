import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 小说写作配置的默认值
const DEFAULT_CONFIG: NovelWritingConfig = {
  targetTotalWords: 3600000,  // 约1200章 × 3000字
  minWordsPerChapter: 2000,
  maxWordsPerChapter: 5000,
  writingStyleRules: [
    '短句为主，长短交替',
    '内部修炼用物理比喻',
    '重复物理锚点（黑锈/虎口/影子）',
    '比喻给完就走，不解释',
    '对话简洁，先算账再开口',
  ],
  forbiddenPatterns: [
    '不要用"仿佛"、"似乎"、"好像"开头的比喻',
    '不要解释比喻的含义',
    '不要用"内心OS"式心理描写',
    '不要用"他想到"、"他觉得"等直述心理',
  ],
  coreSettings: [
    '主角气质：清醒疯——外人可以认为周醒疯了，但读者要看到他在记账、抓漏洞、算代价',
    '爽点机制：用对方规则反咬对方，不是单纯打爆敌人',
    '终局保密：主角主动沦落、主动异化、终结异仙时代，只能在终局揭示',
    '风格边界：可以黑暗、恶心、压抑，但不能长期受虐无反击',
  ],
};

export interface NovelWritingConfig {
  targetTotalWords: number;
  minWordsPerChapter: number;
  maxWordsPerChapter: number;
  writingStyleRules: string[];
  forbiddenPatterns: string[];
  coreSettings: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const rows = db.prepare('SELECT config_key, config_value FROM novel_configs WHERE novel_id = ?').all(id) as any[];

    if (rows.length === 0) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    const config: any = { ...DEFAULT_CONFIG };
    for (const row of rows) {
      try {
        config[row.config_key] = JSON.parse(row.config_value);
      } catch {
        config[row.config_key] = row.config_value;
      }
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get novel config:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<NovelWritingConfig> = await request.json();
    const db = getDatabase();
    const now = new Date().toISOString();

    const upsert = db.prepare(`
      INSERT INTO novel_configs (novel_id, config_key, config_value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(novel_id, config_key) DO UPDATE SET config_value = ?, updated_at = ?
    `);

    for (const [key, value] of Object.entries(body)) {
      const serialized = JSON.stringify(value);
      upsert.run(id, key, serialized, now, serialized, now);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save novel config:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}
