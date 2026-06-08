import { NextRequest } from 'next/server';
import { callModel } from '@/lib/models';
import { getDatabase } from '@/lib/database';
import { updateGovernanceDoc } from '@/lib/governance';

// POST /api/brief — 传入创作简报→Architect 生成设定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId, brief, model = 'mimo' } = body;

    if (!novelId || !brief) {
      return new Response(
        JSON.stringify({ error: 'novelId 和 brief 必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          emit({ type: 'step', step: 'analyze', message: '正在分析创作简报…' });

          // 1. 用 LLM 从简报中提取设定
          const prompt = `
你是一个小说建筑师（Architect）。请根据用户的创作简报，生成完整的故事设定。

创作简报：
${brief}

请以 JSON 格式输出：
{
  "storyBible": "故事圣经 markdown（世界观、势力、核心设定，200字以内）",
  "bookRules": "书籍规则 markdown（主角人设、数值上限、自定义禁令，100字以内）",
  "authorIntent": "作者意图（这本书长期想成为什么，100字以内）",
  "currentFocus": "近期焦点（前3-5章应该写什么，50字以内）",
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist/antagonist/supporting",
      "personality": "性格",
      "speaking_style": "说话风格"
    }
  ],
  "worldState": [
    {"category": "world", "key": "设定名", "value": "设定内容"}
  ]
}

只输出 JSON，不要附加说明。
`;

          const result = await callModel(model, prompt);
          let settings: any;
          try {
            const cleaned = result.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            settings = JSON.parse(cleaned);
          } catch {
            settings = { storyBible: brief.substring(0, 200), authorIntent: brief.substring(0, 100) };
          }

          emit({ type: 'step', step: 'save', message: '正在保存设定…' });

          const db = getDatabase();
          const now = new Date().toISOString();

          // 2. 保存故事圣经到 story_state
          if (settings.storyBible) {
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'world', 'story_bible', ?, ?)
            `).run(novelId, settings.storyBible, now);
          }

          // 3. 保存书籍规则到 story_state
          if (settings.bookRules) {
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'rules', 'book_rules', ?, ?)
            `).run(novelId, settings.bookRules, now);
          }

          // 4. 保存作者意图和当前焦点
          if (settings.authorIntent) {
            updateGovernanceDoc(novelId, 'author_intent', settings.authorIntent);
          }
          if (settings.currentFocus) {
            updateGovernanceDoc(novelId, 'current_focus', settings.currentFocus);
          }

          // 5. 保存角色
          if (Array.isArray(settings.characters)) {
            for (const c of settings.characters) {
              db.prepare(`
                INSERT OR REPLACE INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
                VALUES (?, ?, ?, ?, ?, '', ?)
              `).run(novelId, c.name, c.role || 'supporting', c.personality || '', c.speaking_style || '', now);
            }
          }

          // 6. 保存世界观状态
          if (Array.isArray(settings.worldState)) {
            for (const s of settings.worldState) {
              db.prepare(`
                INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
                VALUES (?, ?, ?, ?, ?)
              `).run(novelId, s.category || 'world', s.key, s.value, now);
            }
          }

          emit({
            type: 'done',
            message: '创作简报已处理完成',
            settings: {
              storyBible: !!settings.storyBible,
              bookRules: !!settings.bookRules,
              authorIntent: !!settings.authorIntent,
              currentFocus: !!settings.currentFocus,
              characters: settings.characters?.length || 0,
              worldState: settings.worldState?.length || 0,
            },
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
      },
    });
  } catch (error) {
    console.error('Brief processing failed:', error);
    return new Response(
      JSON.stringify({ error: '简报处理失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
