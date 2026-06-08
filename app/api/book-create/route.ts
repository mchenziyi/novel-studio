import { NextRequest } from 'next/server';
import { createNovel } from '@/lib/novels';
import { callModel } from '@/lib/models';
import { updateGovernanceDoc } from '@/lib/governance';
import { getDatabase } from '@/lib/database';

// POST /api/book-create — 对话式建书：自然语言描述 → 创建书籍 + 生成设定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, model = 'mimo' } = body;

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'description 必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SSE 流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          emit({ type: 'step', step: 'analyze', message: '正在分析你的创作构想…' });

          // 1. 用 LLM 分析描述，提取书名/题材/设定
          const analysisPrompt = `
你是一个小说策划专家。用户描述了一个小说构想，请从中提取关键信息。

用户描述：
${description}

请以 JSON 格式输出：
{
  "title": "小说标题（从描述中提取或生成一个吸引人的标题）",
  "description": "一句话简介（30字以内）",
  "genre": "题材（如玄幻/都市/科幻/仙侠/言情/历史）",
  "protagonist": {
    "name": "主角名",
    "role": "主角定位",
    "personality": "性格特征",
    "speaking_style": "说话风格"
  },
  "worldSetting": "世界观设定（100字以内）",
  "coreConflict": "核心冲突（50字以内）",
  "authorIntent": "作者意图（这本书长期想成为什么，100字以内）",
  "currentFocus": "近期焦点（前3-5章应该写什么，50字以内）"
}

只输出 JSON，不要附加说明。
`;

          const analysisResult = await callModel(model, analysisPrompt);
          let bookInfo: any;
          try {
            const cleaned = analysisResult.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            bookInfo = JSON.parse(cleaned);
          } catch {
            bookInfo = {
              title: description.substring(0, 20),
              description: description.substring(0, 50),
              genre: '未分类',
            };
          }

          emit({ type: 'step', step: 'create', message: `正在创建《${bookInfo.title}》…` });

          // 2. 创建小说
          const novel = createNovel(bookInfo.title, {
            description: bookInfo.description,
            author: '',
          });

          emit({ type: 'step', step: 'setup', message: '正在生成世界观和角色设定…' });

          // 3. 写入作者意图
          if (bookInfo.authorIntent) {
            updateGovernanceDoc(novel.id, 'author_intent', bookInfo.authorIntent);
          }
          if (bookInfo.currentFocus) {
            updateGovernanceDoc(novel.id, 'current_focus', bookInfo.currentFocus);
          }

          // 4. 写入主角到 story_characters
          if (bookInfo.protagonist?.name) {
            const db = getDatabase();
            db.prepare(`
              INSERT OR REPLACE INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
              VALUES (?, ?, 'protagonist', ?, ?, '', ?)
            `).run(
              novel.id,
              bookInfo.protagonist.name,
              bookInfo.protagonist.personality || '',
              bookInfo.protagonist.speaking_style || '',
              new Date().toISOString(),
            );
          }

          // 5. 写入世界观到 story_state
          if (bookInfo.worldSetting) {
            const db = getDatabase();
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'world', 'world_setting', ?, ?)
            `).run(novel.id, bookInfo.worldSetting, new Date().toISOString());
          }

          // 6. 写入核心冲突
          if (bookInfo.coreConflict) {
            const db = getDatabase();
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'plot', 'core_conflict', ?, ?)
            `).run(novel.id, bookInfo.coreConflict, new Date().toISOString());
          }

          emit({
            type: 'done',
            novel: {
              id: novel.id,
              title: bookInfo.title,
              description: bookInfo.description,
              genre: bookInfo.genre,
            },
            protagonist: bookInfo.protagonist,
            worldSetting: bookInfo.worldSetting,
            message: `《${bookInfo.title}》已创建完成！`,
          });

        } catch (err) {
          emit({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Book creation failed:', error);
    return new Response(
      JSON.stringify({ error: '建书失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
