import { NextRequest } from 'next/server';
import { callModel } from '@/lib/models';
import { createNovel } from '@/lib/novels';
import { getDatabase } from '@/lib/database';
import { updateGovernanceDoc } from '@/lib/governance';

// POST /api/short — 短篇写作全流程
// { direction, chapters=12, charsPerChapter=1000, model }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { direction, chapters = 12, charsPerChapter = 1000, model = 'mimo' } = body;

    if (!direction) {
      return new Response(
        JSON.stringify({ error: 'direction（创作方向）必填' }),
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
          // Step 1: 生成故事大纲
          emit({ type: 'step', step: 'outline', message: '正在构思故事大纲…' });

          const outlinePrompt = `
你是一个短篇小说策划专家。请根据以下方向，为一篇 ${chapters} 章的短篇小说生成完整大纲。

创作方向：${direction}

要求：
1. 生成一个吸引人的标题
2. 一句话简介（30字以内）
3. 详细大纲：每章标题 + 关键事件 + 字数约 ${charsPerChapter} 字
4. 主要角色列表（2-4 个）
5. 核心冲突和结局走向

请以 JSON 格式输出：
{
  "title": "小说标题",
  "description": "一句话简介",
  "protagonist": "主角名",
  "characters": ["角色1", "角色2"],
  "outline": [
    {"chapter": 1, "title": "章节标题", "summary": "关键事件"},
    ...
  ],
  "ending": "结局走向"
}

只输出 JSON。
`;

          const outlineResult = await callModel(model, outlinePrompt);
          let storyPlan: any;
          try {
            const cleaned = outlineResult.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            storyPlan = JSON.parse(cleaned);
          } catch {
            storyPlan = { title: direction.substring(0, 20), description: direction, outline: [] };
          }

          // Step 2: 创建小说
          emit({ type: 'step', step: 'create', message: `正在创建《${storyPlan.title}》…` });

          const novel = createNovel(storyPlan.title, {
            description: storyPlan.description,
          });

          // 保存作者意图
          updateGovernanceDoc(novel.id, 'author_intent',
            `短篇创作方向：${direction}\n结局走向：${storyPlan.ending || '待定'}`
          );

          // 保存角色
          const db = getDatabase();
          const now = new Date().toISOString();
          if (storyPlan.protagonist) {
            db.prepare(`
              INSERT OR REPLACE INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
              VALUES (?, ?, 'protagonist', '', '', '', ?)
            `).run(novel.id, storyPlan.protagonist, now);
          }
          if (Array.isArray(storyPlan.characters)) {
            for (const charName of storyPlan.characters) {
              if (charName !== storyPlan.protagonist) {
                db.prepare(`
                  INSERT OR IGNORE INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
                  VALUES (?, ?, 'supporting', '', '', '', ?)
                `).run(novel.id, charName, now);
              }
            }
          }

          // Step 3: 逐章写作
          const writtenChapters: any[] = [];
          const totalChapters = Math.min(storyPlan.outline?.length || chapters, chapters);

          for (let i = 0; i < totalChapters; i++) {
            const chPlan = storyPlan.outline?.[i] || { chapter: i + 1, title: `第${i + 1}章`, summary: '' };
            emit({ type: 'step', step: 'write', chapter: i + 1, total: totalChapters, message: `正在写第${i + 1}/${totalChapters}章「${chPlan.title}」…` });

            // 收集前文摘要
            const prevSummaries = writtenChapters.slice(-3).map((c: any, idx: number) =>
              `第${writtenChapters.length - 2 + idx}章 ${c.title}: ${c.content.substring(0, 100)}…`
            ).join('\n');

            const writePrompt = `
你是一个短篇小说作家。请根据以下大纲，写第${i + 1}章正文。

故事标题：${storyPlan.title}
故事简介：${storyPlan.description}
${prevSummaries ? `\n前文摘要：\n${prevSummaries}\n` : ''}
本章大纲：
- 章节：第${i + 1}章 ${chPlan.title}
- 关键事件：${chPlan.summary}

要求：
1. 目标字数：约 ${charsPerChapter} 字
2. 只输出正文内容，不输出标题、分析、说明
3. 章节开头留空一行
4. 保证情节紧凑，有吸引力
`;

            const content = await callModel(model, writePrompt);

            // 保存章节
            const chapterId = String(i + 1).padStart(4, '0');
            db.prepare(`
              INSERT OR REPLACE INTO chapters (id, novel_id, title, content, word_count, file, status, last_modified, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'review', ?, ?, ?)
            `).run(
              chapterId, novel.id, chPlan.title || `第${i + 1}章`,
              content, content.length, `short-${novel.id}/${chapterId}.md`,
              now, now, now
            );

            writtenChapters.push({ chapter: i + 1, title: chPlan.title, content, wordCount: content.length });
          }

          // Step 4: 生成简介卖点
          emit({ type: 'step', step: 'sales', message: '正在生成简介和卖点…' });

          const salesPrompt = `
请为以下短篇小说生成一个吸引读者的简介（用于平台发布）。

标题：${storyPlan.title}
方向：${direction}
章节数：${totalChapters}
前3章内容摘要：
${writtenChapters.slice(0, 3).map((c: any) => `第${c.chapter}章: ${c.content.substring(0, 150)}`).join('\n')}

请输出：
1. **简介**（100-200字，有钩子，有悬念）
2. **卖点标签**（3-5个，如"反转"、"爽文"、"虐心"等）
3. **推荐语**（一句话，30字以内）

以 JSON 格式输出：
{"synopsis": "...", "tags": ["...", "..."], "hook": "..."}

只输出 JSON。
`;

          const salesResult = await callModel(model, salesPrompt);
          let sales: any;
          try {
            const cleaned = salesResult.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            sales = JSON.parse(cleaned);
          } catch {
            sales = { synopsis: storyPlan.description, tags: [], hook: '' };
          }

          // 总字数
          const totalWords = writtenChapters.reduce((sum: number, c: any) => sum + c.wordCount, 0);

          emit({
            type: 'done',
            novel: { id: novel.id, title: storyPlan.title },
            chapters: totalChapters,
            totalWords,
            sales,
            message: `短篇《${storyPlan.title}》已完成！共 ${totalChapters} 章，${totalWords} 字。`,
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
    console.error('Short story creation failed:', error);
    return new Response(
      JSON.stringify({ error: '短篇创作失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
