import { NextRequest, NextResponse } from 'next/server';
import { callModel, ModelType } from '@/lib/models';
import { getChapter, getChapters } from '@/lib/file-system';
import { saveChapterWithVersion } from '@/lib/version-control';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  chapterId?: number;
  model?: ModelType;
  context?: 'write' | 'edit' | 'brainstorm' | 'analyze';
}

// 构建系统提示
function buildSystemPrompt(context: string, chapterContent?: string, allChapters?: any[]): string {
  const basePrompt = `你是一个专业的网络小说写作助手，专注于中国网络小说创作。
你的风格特点：
- 文笔简洁有力，避免冗长描写
- 善于制造悬念和钩子
- 注重情节节奏，张弛有度
- 人物对话鲜活，符合角色性格
- 善于运用伏笔和回收`;

  const contextPrompts: Record<string, string> = {
    write: `${basePrompt}

你正在帮助写作下一章。请根据用户的指示生成章节内容。
要求：
1. 生成 3000-5000 字正文
2. 保证前段有吸引力
3. 结尾留钩子
4. 只输出章节内容，不附带分析说明
5. 保持与前文的连贯性`,

    edit: `${basePrompt}

你正在帮助编辑和改进现有章节内容。
请根据用户的指示修改内容，可以是：
- 润色文字
- 调整情节
- 增加细节
- 删除冗余
- 修改对话

请直接输出修改后的内容，不要解释修改原因。`,

    brainstorm: `${basePrompt}

你正在帮助头脑风暴，讨论情节、角色、世界观等问题。
可以讨论：
- 情节发展方向
- 角色塑造
- 伏笔设计
- 世界观设定
- 写作技巧

请给出具体、可执行的建议。`,

    analyze: `${basePrompt}

你正在帮助分析现有章节内容。
可以分析：
- 情节逻辑
- 角色行为合理性
- 伏笔埋设
- 节奏把控
- 文字质量

请给出具体的分析和改进建议。`,
  };

  let prompt = contextPrompts[context] || contextPrompts.brainstorm;

  if (chapterContent) {
    prompt += `\n\n当前章节内容：\n${chapterContent}`;
  }

  if (allChapters && allChapters.length > 0) {
    const recentChapters = allChapters.slice(-5);
    prompt += `\n\n最近章节概览：`;
    for (const ch of recentChapters) {
      prompt += `\n- 第${ch.id}章 ${ch.title}`;
    }
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, chapterId, model = 'mimo', context = 'brainstorm' } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 检查 API key 是否配置
    const apiKey = process.env.OPENAI_API_KEY;
    const useMock = !apiKey || apiKey.includes('your_') || process.env.USE_MOCK_API === 'true';

    if (useMock) {
      // 返回模拟响应
      const userMessage = messages[messages.length - 1].content;
      const mockResponse = generateMockResponse(userMessage, context);

      return NextResponse.json({
        success: true,
        message: mockResponse,
        diff: null,
        context: {
          chapterId,
          model,
          contextType: context,
        },
        notice: 'API key 未配置或不可用，返回模拟响应。请在 .env.local 中配置真实的 API key。',
      });
    }

    // 获取章节内容（如果指定）
    let chapterContent: string | undefined;
    let allChapters: any[] | undefined;

    if (chapterId) {
      const chapter = await getChapter(String(chapterId).padStart(4, '0'));
      if (chapter) {
        chapterContent = chapter.content;
      }
    }

    // 获取所有章节用于上下文
    try {
      allChapters = await getChapters();
    } catch (e) {
      // 忽略错误
    }

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(context, chapterContent, allChapters);

    // 调用模型
    const modelMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const result = await callModel(model, modelMessages);

    // 如果是写入/编辑模式且有章节ID，检查是否需要保存
    let diff = null;
    if ((context === 'write' || context === 'edit') && chapterId && chapterContent) {
      // 简单检测：如果返回内容与原内容不同，生成 diff
      if (result !== chapterContent) {
        diff = {
          oldContent: chapterContent,
          newContent: result,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: result,
      diff,
      context: {
        chapterId,
        model,
        contextType: context,
      },
    });
  } catch (error) {
    console.error('Chat agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 生成模拟响应
function generateMockResponse(userMessage: string, context: string): string {
  const responses: Record<string, string[]> = {
    brainstorm: [
      `很好的问题！关于"${userMessage.substring(0, 30)}..."，我有以下想法：\n\n1. 可以从角色的内心冲突入手\n2. 考虑增加一个意外的转折\n3. 伏笔的回收要自然流畅`,
      `这是一个有趣的方向。让我分析一下：\n\n首先，我们需要考虑这个情节对主线的影响...\n其次，角色的动机需要更加清晰...\n最后，节奏的把控很重要。`,
    ],
    write: [
      `根据你的描述，我来写一段内容：\n\n---\n\n周醒站在原地，手中的白页簿微微发烫。\n\n他感觉到周围的空气在变化，一种说不清的压迫感从四面八方涌来。\n\n"这是什么？"他低声问道。\n\n没有人回答。\n\n---\n\n这只是开头，需要我继续扩展吗？`,
    ],
    edit: [
      `我来帮你改进这段内容。主要修改：\n\n1. 增强了场景的氛围描写\n2. 让对话更加自然\n3. 调整了节奏\n\n修改后的内容：\n\n---\n\n周醒停下脚步。白页簿在怀中发烫，像一块烧红的铁。\n\n空气凝固了。\n\n"什么东西？"他的声音压得很低。\n\n沉默。只有风声。\n\n---`,
    ],
    analyze: [
      `让我分析一下这段内容：\n\n**优点：**\n- 节奏紧凑\n- 悬念设置得当\n\n**可改进：**\n- 可以增加更多感官描写\n- 角色的心理活动可以更丰富\n- 伏笔的暗示可以更微妙`,
    ],
  };

  const contextResponses = responses[context] || responses.brainstorm;
  return contextResponses[Math.floor(Math.random() * contextResponses.length)];
}

// 保存章节内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, content, source = 'manual', description } = body;

    if (!chapterId || !content) {
      return NextResponse.json(
        { error: 'Chapter ID and content are required' },
        { status: 400 }
      );
    }

    const chapterIdStr = String(chapterId).padStart(4, '0');
    const version = await saveChapterWithVersion(chapterIdStr, content, source, {
      description: description || 'Updated via ChatAgent',
    });

    return NextResponse.json({
      success: true,
      version,
    });
  } catch (error) {
    console.error('Failed to save chapter:', error);
    return NextResponse.json(
      { error: 'Failed to save chapter' },
      { status: 500 }
    );
  }
}
