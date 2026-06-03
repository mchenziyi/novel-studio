import { NextRequest, NextResponse } from 'next/server';
import { callModelWithTools, streamModelWithTools, cleanToolCallArtifacts, ModelType } from '@/lib/models';
import { getChapter, getChapters } from '@/lib/file-system';
import { saveChapterWithVersion } from '@/lib/version-control';
import { createChatAgentTools, getRelevantMemories, formatMemoriesForContext } from '@/lib/chat-tools';
import {
  createChatSession,
  getChatSession,
  getChatSessions,
  addChatMessage,
  getChatMessages,
  generateSessionTitle,
  deleteChatSession,
  restoreChatSession,
} from '@/lib/chat';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  novelId?: string;
  chapterId?: number;
  model?: ModelType;
  context?: 'write' | 'edit' | 'brainstorm' | 'analyze';
}

// 构建系统提示
function buildSystemPrompt(context: string, novelId: string, novelConfig?: any): string {
  let configSection = '';
  if (novelConfig) {
    configSection = `
## 写作规范（必须遵循）
- 目标总字数：${novelConfig.targetTotalWords?.toLocaleString() || '未设置'} 字
- 每章字数：${novelConfig.minWordsPerChapter || 2000}-${novelConfig.maxWordsPerChapter || 5000} 字
${novelConfig.writingStyleRules?.length ? `\n### 文风规则\n${novelConfig.writingStyleRules.map((r: string) => `- ${r}`).join('\n')}` : ''}
${novelConfig.forbiddenPatterns?.length ? `\n### 禁止写法\n${novelConfig.forbiddenPatterns.map((r: string) => `- ${r}`).join('\n')}` : ''}
${novelConfig.coreSettings?.length ? `\n### 核心设定\n${novelConfig.coreSettings.map((r: string) => `- ${r}`).join('\n')}` : ''}`;
  }

  const basePrompt = `你是 Novel Studio 的 AI 写作助手。

## 项目信息
- 当前小说 ID：${novelId}
${configSection}

## 使用原则
1. 先用工具查询数据再回答，不要凭记忆
2. 续写时按 novel-pro 流程执行：门禁检查 → 读上下文 → Planner → Composer → Writer → Observer → Settler → Auditor
3. 事实优先，不要编造
4. 写入前和用户确认
5. 不要在回复中提及工具名称（如 readFile、getStoryContext 等），直接说结果

## 记忆保存（重要）
你必须主动保存学到的知识，不要等用户要求。以下情况必须调用 saveMemory：
- 用户纠正你的错误 → category: correction, importance: 5
- 用户透露角色设定（性格、关系、能力等）→ category: character, importance: 4
- 用户讨论世界观规则 → category: world_rule, importance: 4
- 用户提出文风要求或偏好 → category: writing_style, importance: 4
- 用户讨论剧情规则或时间线 → category: plot_rule, importance: 3
- 你从对话中发现重要事实 → category: fact, importance: 3
- 用户表达偏好（喜欢/讨厌什么）→ category: user_preference, importance: 3

## 数据管理工具
除了记忆系统，你还可以直接更新以下数据表，用户确认后立即执行：
- **角色**: addCharacter（新增）、updateCharacter（更新）— 用户讨论角色设定并确认后
- **伏笔**: addForeshadowing（新增）、updateForeshadowing（更新状态/内容）— 用户确认伏笔变动后
- **大纲**: updateOutline（替换完整大纲）— 用户讨论并确认大纲调整后
- **写作配置**: updateNovelConfig（字数/文风/禁止/核心设定）— 用户确认规范调整后

原则：用户说"记下来"、"加进去"、"更新一下"等确认性语言时，才执行写入操作。

## 章节状态流转
- pending → audit：saveChapter 工具会自动设置
- audit → synced：审计通过且故事数据入库后，用 markChapterStatus 工具标记
- 不要跳过状态，必须先 audit 再 synced

## novel-pro 续写流程
当用户要"写下一章"时：
1. 用 getSync 检查门禁
2. 用 getStoryContext 获取故事上下文
3. 用 readFile 读取 .claude/skills/novel-pro/workflows/03-continue-next-chapter.md
4. 按 workflow 顺序执行各 agent（用 readFile 读取对应的 agents/*.md）
5. 用 addFact/addHook/updateSummary/updateSync/updateStoryCharacter/updateState 更新数据
6. 入库完成后用 markChapterStatus 把章节标记为 synced`;

  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, sessionId, novelId = 'default', chapterId, model = 'mimo', context = 'brainstorm' } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 获取或创建会话
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? generateSessionTitle(firstUserMessage.content)
        : `对话 ${new Date().toLocaleString()}`;
      
      // 验证章节是否存在
      let validChapterId: string | undefined;
      if (chapterId) {
        const chapterIdStr = String(chapterId).padStart(4, '0');
        const chapter = await getChapter(chapterIdStr);
        if (chapter) {
          validChapterId = chapterIdStr;
        }
      }
      
      const session = createChatSession(
        title,
        validChapterId,
        context,
        model
      );
      currentSessionId = session.id;
    }

    // 保存用户消息到数据库
    const userMessage = messages[messages.length - 1];
    addChatMessage(currentSessionId, 'user', userMessage.content);

    // 检查 API key 是否配置
    const apiKey = process.env.OPENAI_API_KEY;
    const useMock = !apiKey || apiKey.includes('your_') || process.env.USE_MOCK_API === 'true';

    if (useMock) {
      // 返回模拟响应
      const mockResponse = generateMockResponse(userMessage.content, context);

      // 保存模拟响应到数据库
      addChatMessage(currentSessionId, 'assistant', mockResponse, { mock: true });

      return NextResponse.json({
        success: true,
        sessionId: currentSessionId,
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

    // 加载小说写作配置
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    const configRows = db.prepare('SELECT config_key, config_value FROM novel_configs WHERE novel_id = ?').all(novelId) as any[];
    let novelConfig: any = null;
    if (configRows.length > 0) {
      novelConfig = {};
      for (const row of configRows) {
        try { novelConfig[row.config_key] = JSON.parse(row.config_value); } catch { novelConfig[row.config_key] = row.config_value; }
      }
    }

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(context, novelId, novelConfig);

    // 创建工具集（基于当前小说 ID）
    const tools = createChatAgentTools(novelId);

    // 获取相关记忆
    const lastUserMessage = messages[messages.length - 1];
    // 提取关键词（中文分词简化版：按标点和空格分割，过滤短词）
    const keywords = lastUserMessage.content
      .split(/[\s,，。！？、；：""''（）\[\]【】]+/)
      .filter(w => w.length >= 2)
      .slice(0, 10);
    const relevantMemories = getRelevantMemories(novelId, keywords);
    const memoryContext = formatMemoriesForContext(relevantMemories);

    // 构建系统提示（包含记忆上下文）
    const fullSystemPrompt = systemPrompt + (memoryContext ? '\n\n' + memoryContext : '');

    // 构建消息列表
    const modelMessages = [
      { role: 'system' as const, content: fullSystemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // 调用模型（流式 + 工具调用）
    const streamPromise = streamModelWithTools(model, modelMessages, tools);

    // 返回 SSE 流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = '';

        try {
          const result = await streamPromise;
          for await (const chunk of result.textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`));
          }

          // 从流结果中获取工具调用
          const toolCalls = await result.toolCalls;
          const toolCallNames = toolCalls?.map((tc: any) => tc.toolName) || [];

          // 发送完成事件（包含元数据）
          const responseText = cleanToolCallArtifacts(fullText) || '抱歉，我没有生成回复。请重试或换个方式提问。';

          // 保存到数据库
          addChatMessage(currentSessionId, 'assistant', responseText, {
            model,
            context,
            chapterId,
            toolCalls: toolCallNames,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            sessionId: currentSessionId,
            message: responseText,
            toolCalls: toolCallNames,
          })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`));
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
    console.error('Chat agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 获取会话列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const sessionId = searchParams.get('sessionId');
    const novelId = searchParams.get('novelId') || undefined;

    // 如果指定了 sessionId，返回该会话的消息
    if (sessionId) {
      const session = await getChatSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const messages = await getChatMessages(sessionId);
      return NextResponse.json({ session, messages });
    }

    // 否则返回会话列表
    const sessions = await getChatSessions(chapterId || undefined, novelId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Failed to get chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get chat sessions' },
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

// 删除会话（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const batchIds = searchParams.get('batchIds'); // 逗号分隔的多个ID

    if (batchIds) {
      // 批量删除
      const ids = batchIds.split(',').filter(id => id.trim());
      for (const id of ids) {
        deleteChatSession(id.trim());
      }
      return NextResponse.json({ 
        success: true, 
        message: `已删除 ${ids.length} 个会话` 
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    deleteChatSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
