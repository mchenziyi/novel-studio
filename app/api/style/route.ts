import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { callModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';

    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM style_profiles WHERE novel_id = ? ORDER BY is_active DESC, updated_at DESC').all(novelId) as any[];

    const profiles = rows.map(row => ({
      id: row.id,
      name: row.name,
      fingerprint: JSON.parse(row.fingerprint),
      llmGuide: row.llm_guide,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to get style profiles:', error);
    return NextResponse.json({ error: '获取文风配置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', name, referenceText } = body;

    if (!name || !referenceText) {
      return NextResponse.json({ error: '缺少名称或参考文本' }, { status: 400 });
    }

    // 用 AI 分析文风
    const analysisPrompt = `分析以下文本的写作风格，输出 JSON 格式的文风指纹。

文本：
${referenceText.substring(0, 3000)}

请输出以下 JSON 格式（不要输出其他内容）：
{
  "sentenceLength": {"avg": 平均句长, "short": 短句比例, "long": 长句比例},
  "vocabulary": {"高频词": ["词1", "词2", ...], "禁用词": ["避免的词1", ...]},
  "rhythm": "节奏描述（如：短句密集、长短交替、叙述缓慢等）",
  "style": "风格描述（如：冷硬克制、诗意抒情、口语化等）",
  "patterns": ["句式模式1", "句式模式2", ...],
  "llmGuide": "给 AI 的文风指南（100字以内）"
}`;

    const result = await callModel('default-mimo', analysisPrompt);

    let fingerprint;
    try {
      // 提取 JSON 部分
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fingerprint = JSON.parse(jsonMatch[0]);
      } else {
        fingerprint = { raw: result };
      }
    } catch {
      fingerprint = { raw: result };
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 如果设为激活，先取消其他激活状态
    db.prepare('UPDATE style_profiles SET is_active = 0 WHERE novel_id = ?').run(novelId);

    db.prepare(`
      INSERT INTO style_profiles (novel_id, name, fingerprint, llm_guide, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(novelId, name, JSON.stringify(fingerprint), fingerprint.llmGuide || '', now, now);

    return NextResponse.json({ success: true, fingerprint });
  } catch (error) {
    console.error('Failed to analyze style:', error);
    return NextResponse.json({ error: '文风分析失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, novelId = 'default', isActive } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少 ID' }, { status: 400 });
    }

    const db = getDatabase();

    if (isActive !== undefined) {
      if (isActive) {
        db.prepare('UPDATE style_profiles SET is_active = 0 WHERE novel_id = ?').run(novelId);
      }
      db.prepare('UPDATE style_profiles SET is_active = ?, updated_at = ? WHERE id = ?')
        .run(isActive ? 1 : 0, new Date().toISOString(), id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update style profile:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
