import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

// POST /api/radar — 市场雷达：扫描平台趋势，指导故事方向
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genre, platform = '起点/番茄', model = 'mimo' } = body;

    const prompt = `
你是一个网文市场分析专家。请分析当前 ${platform} 平台${genre ? `「${genre}」题材` : ''}的热门趋势。

请从以下维度分析：

1. **热门题材趋势**：当前最火的 3-5 个细分方向
2. **读者偏好变化**：近期读者口味有什么变化
3. **爆款特征**：最近的爆款作品有什么共同特征
4. **题材蓝海**：哪些细分方向竞争少但需求大
5. **避坑指南**：哪些方向已经过饱和或被写烂
6. **开篇套路**：当前最有效的开篇方式
7. **金手指/设定趋势**：什么类型的金手指/设定最受欢迎
8. **字数/节奏建议**：当前主流的字数要求和节奏偏好

请以 JSON 格式输出：
{
  "hotTopics": ["热门方向1", "热门方向2", ...],
  "readerPreferences": "读者偏好变化描述",
  "hitFeatures": "爆款特征描述",
  "blueOcean": ["蓝海方向1", "蓝海方向2"],
  "saturated": ["过饱和方向1", "过饱和方向2"],
  "openingStyles": "开篇套路建议",
  "trendingSettings": "金手指/设定趋势",
  "wordCountAdvice": "字数/节奏建议",
  "summary": "整体市场判断（50字以内）"
}

只输出 JSON。基于你对网文市场的了解进行分析。
`;

    const result = await callModel(model, prompt);
    let radar: any;
    try {
      const cleaned = result.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      radar = JSON.parse(cleaned);
    } catch {
      radar = { summary: result.substring(0, 200), hotTopics: [], readerPreferences: '', hitFeatures: '' };
    }

    return NextResponse.json({ success: true, radar });
  } catch (error) {
    console.error('Radar scan failed:', error);
    return NextResponse.json({ error: '市场扫描失败' }, { status: 500 });
  }
}
