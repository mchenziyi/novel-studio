import { NextRequest } from 'next/server';
import { callModel } from '@/lib/models';
import { createNovel } from '@/lib/novels';
import { getDatabase } from '@/lib/database';
import { updateGovernanceDoc } from '@/lib/governance';

// POST /api/fanfic — 同人创作：从原作素材创建同人书
// { sourceText, mode='canon', title, description, model }
// mode: canon(正典延续) | au(架空世界) | ooc(性格重塑) | cp(CP向)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceText, mode = 'canon', title, description, model = 'mimo' } = body;

    if (!sourceText) {
      return new Response(
        JSON.stringify({ error: 'sourceText（原作素材）必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validModes = ['canon', 'au', 'ooc', 'cp'];
    if (!validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: `mode 必须是 ${validModes.join('/')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const modeLabels: Record<string, string> = {
      canon: '正典延续（延续原作世界观和人物关系）',
      au: '架空世界（保留角色，改变世界观设定）',
      ooc: '性格重塑（保留角色名，重新设定性格）',
      cp: 'CP 向（聚焦角色之间的感情线）',
    };

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Step 1: 分析原作素材
          emit({ type: 'step', step: 'analyze', message: `正在分析原作素材（${modeLabels[mode]}）…` });

          const analyzePrompt = `
你是一个同人创作专家。请分析以下原作素材，提取可用于同人创作的关键信息。

原作素材（前 3000 字）：
${sourceText.substring(0, 3000)}

创作模式：${modeLabels[mode]}

请提取并输出 JSON：
{
  "originalTitle": "原作标题（如果能判断）",
  "characters": [
    {"name": "角色名", "role": "主角/配角/反派", "personality": "性格特征", "speaking_style": "说话风格"}
  ],
  "worldSetting": "世界观概述",
  "relationships": "主要角色关系",
  "plotHooks": ["可延续的情节点1", "可延续的情节点2"],
  "tone": "原作基调（如热血/暗黑/轻松/虐心）"
}

只输出 JSON。
`;

          const analyzeResult = await callModel(model, analyzePrompt);
          let analysis: any;
          try {
            const cleaned = analyzeResult.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            analysis = JSON.parse(cleaned);
          } catch {
            analysis = { characters: [], worldSetting: '', plotHooks: [], tone: '' };
          }

          // Step 2: 生成同人设定
          emit({ type: 'step', step: 'setup', message: '正在生成同人设定…' });

          const setupPrompt = `
你是一个同人创作专家。基于以下原作分析，请为「${modeLabels[mode]}」模式的同人作品生成设定。

原作分析：
${JSON.stringify(analysis, null, 2)}

${title ? `用户指定标题：${title}` : ''}
${description ? `用户指定简介：${description}` : ''}

模式说明：
- canon：延续原作世界观和人物关系，续写后续故事
- au：保留角色名和性格，但放入完全不同的世界观
- ooc：保留角色名，但重新设计性格和背景
- cp：聚焦特定角色对的感情线，弱化主线剧情

请输出 JSON：
{
  "title": "同人作品标题",
  "description": "一句话简介",
  "worldSetting": "同人世界观设定（如果是 au 模式，需要详细描述新世界观）",
  "authorIntent": "创作意图",
  "characters": [
    {"name": "角色名", "role": "protagonist/antagonist/supporting", "personality": "性格（如果是 ooc 模式，需要重新设计）", "speaking_style": "说话风格"}
  ],
  "keyDifferences": "与原作的主要区别",
  "outline": [
    {"chapter": 1, "title": "章节标题", "summary": "关键事件"}
  ]
}

只输出 JSON。
`;

          const setupResult = await callModel(model, setupPrompt);
          let fanficPlan: any;
          try {
            const cleaned = setupResult.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            fanficPlan = JSON.parse(cleaned);
          } catch {
            fanficPlan = { title: title || '同人作品', description: description || '', characters: [], outline: [] };
          }

          // Step 3: 创建小说
          emit({ type: 'step', step: 'create', message: `正在创建《${fanficPlan.title}》…` });

          const novel = createNovel(fanficPlan.title, {
            description: `[${modeLabels[mode]}] ${fanficPlan.description}`,
          });

          const db = getDatabase();
          const now = new Date().toISOString();

          // 保存设定
          if (fanficPlan.worldSetting) {
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'world', 'world_setting', ?, ?)
            `).run(novel.id, fanficPlan.worldSetting, now);
          }

          // 保存原作信息
          db.prepare(`
            INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
            VALUES (?, 'fanfic', 'source_material', ?, ?)
          `).run(novel.id, sourceText.substring(0, 2000), now);

          db.prepare(`
            INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
            VALUES (?, 'fanfic', 'mode', ?, ?)
          `).run(novel.id, mode, now);

          if (fanficPlan.keyDifferences) {
            db.prepare(`
              INSERT OR REPLACE INTO story_state (novel_id, category, key, value, updated_at)
              VALUES (?, 'fanfic', 'key_differences', ?, ?)
            `).run(novel.id, fanficPlan.keyDifferences, now);
          }

          // 保存作者意图
          const intent = [
            `同人模式：${modeLabels[mode]}`,
            fanficPlan.authorIntent ? `创作意图：${fanficPlan.authorIntent}` : '',
            fanficPlan.keyDifferences ? `与原作区别：${fanficPlan.keyDifferences}` : '',
          ].filter(Boolean).join('\n');
          updateGovernanceDoc(novel.id, 'author_intent', intent);

          // 保存角色
          for (const c of fanficPlan.characters || []) {
            db.prepare(`
              INSERT OR REPLACE INTO story_characters (novel_id, name, role, personality, speaking_style, current_state, updated_at)
              VALUES (?, ?, ?, ?, ?, '', ?)
            `).run(novel.id, c.name, c.role || 'supporting', c.personality || '', c.speaking_style || '', now);
          }

          emit({
            type: 'done',
            novel: { id: novel.id, title: fanficPlan.title, description: fanficPlan.description },
            mode,
            modeLabel: modeLabels[mode],
            characters: (fanficPlan.characters || []).map((c: any) => c.name),
            outline: fanficPlan.outline || [],
            keyDifferences: fanficPlan.keyDifferences,
            message: `同人作品《${fanficPlan.title}》已创建（${modeLabels[mode]}）`,
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
    console.error('Fanfic creation failed:', error);
    return new Response(
      JSON.stringify({ error: '同人创作失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
