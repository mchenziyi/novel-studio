import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';
import { getDatabase } from '@/lib/database';

// POST /api/detect — AIGC 检测（检测章节 AI 生成痕迹）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, novelId = 'default', model = 'mimo' } = body;

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId 必填' }, { status: 400 });
    }

    const db = getDatabase();
    const id = String(chapterId).padStart(4, '0');
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND novel_id = ?').get(id, novelId) as any;

    if (!chapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }

    const prompt = `
你是一个 AI 生成内容检测专家。请分析以下文本，判断其 AI 生成的可能性。

章节标题：${chapter.title}
章节内容：
${chapter.content.substring(0, 5000)}

请从以下维度分析并打分（0-100，越高越可能是 AI 生成）：

1. **词汇疲劳**：是否有 AI 常用高频词（仿佛/似乎/不禁/竟然/居然/目光/嘴角等）
2. **句式单调**：是否大量使用简单主谓宾结构，缺乏修辞变化
3. **模板化表达**：是否有"心中一凛"、"不禁莞尔"、"眼中闪过一丝XX"等模板句
4. **过度总结**：是否有"经过一番XX"、"在XX的帮助下"等跳过细节的总结
5. **情感标签化**：是否直接用形容词标签化情感而非具体描写
6. **节奏机械化**：段落长度是否过于均匀，缺乏节奏变化
7. **比喻雷同**：比喻是否新颖，还是常见 AI 比喻套路
8. **对话公式化**：对话是否遵循"XX说道"的固定模式

请以 JSON 格式输出：
{
  "overallScore": 0-100（AI 生成可能性）,
  "verdict": "human/mixed/ai"（判断结论）,
  "dimensions": [
    {"name": "维度名", "score": 0-100, "detail": "具体发现"}
  ],
  "summary": "总结（50字以内）"
}

只输出 JSON。
`;

    const result = await callModel(model, prompt);
    let detection: any;
    try {
      const cleaned = result.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      detection = JSON.parse(cleaned);
    } catch {
      detection = { overallScore: 50, verdict: 'mixed', summary: '检测结果解析失败', dimensions: [] };
    }

    return NextResponse.json({
      success: true,
      chapterId: id,
      title: chapter.title,
      detection,
    });
  } catch (error) {
    console.error('AIGC detection failed:', error);
    return NextResponse.json({ error: '检测失败' }, { status: 500 });
  }
}
