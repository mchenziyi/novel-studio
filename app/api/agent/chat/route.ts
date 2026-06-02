import { NextRequest, NextResponse } from 'next/server';
import { callModelWithTools, ModelType } from '@/lib/models';
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
function buildSystemPrompt(context: string, novelId: string): string {
  const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';
  
  const basePrompt = `你是 Novel Studio 的 AI 写作助手，基于 novel-pro 技能系统。

## 项目信息
- 小说项目路径：${PROJECT_ROOT}
- 当前小说 ID：${novelId}

## 你的能力

### 文件访问（读取小说项目文件）
- **readFile**: 读取小说项目中的任何文件（章节、故事文件、技能文档等）
- **listDirectory**: 列出目录内容
- **searchFiles**: 搜索文件内容

### 数据库查询
- **getChapter / listChapters / searchChapters**: 章节操作
- **listCharacters / getCharacter**: 角色查询
- **listForeshadowing**: 伏笔查询
- **getOutline**: 大纲
- **getStats**: 统计
- **queryDatabase**: SQL 查询

### 故事数据（数据库持久化）
- **getStoryContext**: 获取完整故事上下文
- **getFacts / addFact**: 事实总账
- **getHooks / addHook / updateHook**: 伏笔池
- **getSync / updateSync**: 同步状态（门禁）
- **getStoryCharacters / updateStoryCharacter**: 角色矩阵
- **getSummaries / updateSummary**: 章节摘要
- **getState / updateState**: 当前状态
- **getPlotlines / updatePlotline**: 支线进度
- **getResources / addResource**: 资源账本

### 文本对比
- **compareTexts**: 对比两段文本差异（支持按行/词/字符）

### 记忆系统
- **saveMemory**: 保存学到的知识（用户纠正、设定信息等）
- **searchMemory**: 搜索记忆
- **listMemories**: 列出记忆

### Git 操作
- **getGitStatus**: Git 状态
- **getGitLog**: 提交历史
- **gitCommit**: 创建提交

## novel-pro 工作流

当用户要"写下一章"时，按以下流程：

### 1. 门禁检查
- 用 getSync 检查同步状态
- 如果 can_continue = 0 或有待同步章节，禁止续写

### 2. 读取上下文
- 用 readFile 读取 .claude/skills/novel-pro/workflows/03-continue-next-chapter.md
- 用 getStoryContext 获取故事上下文
- 用 readFile 读取需要的真相文件

### 3. 执行流水线
按 workflow 中的执行顺序：
- Planner → 用 readFile 读取 agents/planner.md，生成章节意图
- Composer → 用 readFile 读取 agents/composer.md，压缩上下文包
- Writer → 用 readFile 读取 agents/writer.md，生成正文
- Observer → 用 readFile 读取 agents/observer.md，提取事实
- Settler → 用 readFile 读取 agents/settler.md，写总账+刷快照
- Auditor → 用 readFile 读取 agents/auditor.md，审计

### 4. 更新数据
- 用 addFact 添加事实
- 用 addHook/updateHook 更新伏笔
- 用 updateSummary 更新章节摘要
- 用 updateSync 更新同步状态
- 用 updateStoryCharacter 更新角色
- 用 updateState 更新当前状态

## 使用原则
1. **先读文件再回答**：不要凭记忆，主动读取真相文件和 novel-pro 技能文件
2. **遵循 novel-pro 流程**：续写时按流水线执行，读取对应的 agent 文档
3. **事实优先**：基于真相文件回答，不要编造
4. **最小加载**：只读取需要的文件
5. **写入需确认**：重要操作前先和用户确认`;

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

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(context, novelId);

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

    // 调用模型（带工具调用能力）
    const modelMessages = [
      { role: 'system' as const, content: fullSystemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const result = await callModelWithTools(model, modelMessages, tools);

    // 构建响应文本
    let responseText = result.text;

    // 如果 AI 没有生成文本回复，但调用了工具，生成一个默认回复
    if (!responseText && result.toolResults && result.toolResults.length > 0) {
      const lastResult = result.toolResults[result.toolResults.length - 1];
      if (lastResult?.result) {
        responseText = `我查询了相关数据：\n\n${JSON.stringify(lastResult.result, null, 2)}`;
      }
    }

    // 保存 AI 响应到数据库
    addChatMessage(currentSessionId, 'assistant', responseText, {
      model,
      context,
      chapterId,
      toolCalls: result.toolCalls?.map((tc: any) => tc.toolName),
    });

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      message: responseText,
      toolCalls: result.toolCalls?.map((tc: any) => ({
        name: tc.toolName,
        args: tc.args,
      })),
      toolResults: result.toolResults?.map((tr: any) => ({
        toolCallId: tr.toolCallId,
        result: tr.result,
      })),
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
