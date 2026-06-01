import { NextRequest, NextResponse } from 'next/server';
import { getDefaultModel } from '@/lib/model-config';
import { generateText } from 'ai';
import { createModelInstance } from '@/lib/model-config';

export async function POST(request: NextRequest) {
  try {
    const { selectedText, instruction, fullContent } = await request.json();

    if (!selectedText || !instruction) {
      return NextResponse.json(
        { error: '缺少选中文本或修改指令' },
        { status: 400 }
      );
    }

    const modelConfig = await getDefaultModel();
    if (!modelConfig) {
      return NextResponse.json(
        { error: '未配置默认模型，请在设置中添加模型' },
        { status: 400 }
      );
    }

    const model = createModelInstance(modelConfig);

    const prompt = `你是一个专业的文字编辑助手。用户选中了一段文字，并希望按照指定的方式修改。

## 选中的原文：
${selectedText}

## 用户的修改要求：
${instruction}

## 上下文（章节全文，供参考）：
${fullContent.substring(0, 2000)}${fullContent.length > 2000 ? '...' : ''}

请根据用户的要求，修改选中的文字。只输出修改后的文字，不要添加任何解释或说明。`;

    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 2000,
    });

    return NextResponse.json({
      original: selectedText,
      modified: result.text.trim(),
      instruction,
    });
  } catch (error) {
    console.error('AI edit failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 编辑失败' },
      { status: 500 }
    );
  }
}
