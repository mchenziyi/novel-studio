import { getDatabase } from './database';
import {
  getStoryFacts,
  getStoryHooks,
  getStorySummaries,
  getStoryState,
  getStoryCharacters,
  getStoryResources,
  getStoryPlotlines,
  getStorySync,
  getStoryStats,
} from './story-data';

// ==================== 真理文件定义 ====================

export interface TruthFileMeta {
  name: string;
  label: string;
  description: string;
  icon: string;
}

export const TRUTH_FILES: TruthFileMeta[] = [
  { name: 'current_state.md',      label: '当前状态',   description: '世界状态与角色位置',         icon: '🌍' },
  { name: 'character_matrix.md',   label: '角色矩阵',   description: '角色关系网与互动记录',       icon: '👥' },
  { name: 'particle_ledger.md',    label: '资源账本',   description: '关键资源与物品流转',         icon: '📦' },
  { name: 'pending_hooks.md',      label: '未闭合伏笔', description: '还未回收的钩子与悬念',       icon: '⚡' },
  { name: 'chapter_summaries.md',  label: '章节摘要',   description: '逐章摘要与回顾',             icon: '📖' },
  { name: 'subplot_board.md',      label: '支线进度',   description: '支线推进与交叉情况',         icon: '🔀' },
  { name: 'emotional_arcs.md',     label: '情感弧线',   description: '角色情绪与关系变化',         icon: '❤️' },
  { name: 'story_bible.md',        label: '故事圣经',   description: '世界观、势力、核心设定',     icon: '📕' },
];

// ==================== 生成 Markdown 内容 ====================

export function generateTruthFile(novelId: string, fileName: string): string | null {
  switch (fileName) {
    case 'current_state.md':
      return generateCurrentState(novelId);
    case 'character_matrix.md':
      return generateCharacterMatrix(novelId);
    case 'particle_ledger.md':
      return generateParticleLedger(novelId);
    case 'pending_hooks.md':
      return generatePendingHooks(novelId);
    case 'chapter_summaries.md':
      return generateChapterSummaries(novelId);
    case 'subplot_board.md':
      return generateSubplotBoard(novelId);
    case 'emotional_arcs.md':
      return generateEmotionalArcs(novelId);
    case 'story_bible.md':
      return generateStoryBible(novelId);
    default:
      return null;
  }
}

function generateCurrentState(novelId: string): string {
  const state = getStoryState(novelId);
  const characters = getStoryCharacters(novelId);
  const sync = getStorySync(novelId);
  const stats = getStoryStats(novelId);

  let md = `# 当前世界状态\n\n`;
  md += `> 最后更新：${new Date().toLocaleString('zh-CN')}\n\n`;

  // 同步状态
  if (sync) {
    md += `## 📊 同步状态\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 已同步章节 | 第 ${sync.synced_chapter} 章 |\n`;
    md += `| 最新章节 | 第 ${sync.latest_chapter} 章 |\n`;
    md += `| 累计事实 | ${stats.totalFacts} 条 |\n`;
    md += `| 活跃伏笔 | ${stats.openHooks} 条 |\n`;
    md += `| 已回收伏笔 | ${stats.resolvedHooks} 条 |\n`;
    md += `| 允许续写 | ${sync.can_continue ? '✅ 是' : '❌ 否'} |\n\n`;
  }

  // 按分类展示状态
  const categories = new Map<string, typeof state>();
  for (const s of state) {
    const cat = s.category || 'general';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(s);
  }

  for (const [cat, items] of categories) {
    md += `## ${cat}\n\n`;
    md += `| 键 | 值 |\n|----|----|\n`;
    for (const item of items) {
      md += `| ${item.key} | ${item.value || '-'} |\n`;
    }
    md += '\n';
  }

  // 角色当前位置
  if (characters.length > 0) {
    md += `## 👥 角色当前位置\n\n`;
    md += `| 角色 | 当前状态 |\n|------|----------|\n`;
    for (const c of characters) {
      md += `| ${c.name} | ${c.current_state || '-'} |\n`;
    }
    md += '\n';
  }

  return md;
}

function generateCharacterMatrix(novelId: string): string {
  const characters = getStoryCharacters(novelId);

  let md = `# 角色矩阵\n\n`;
  md += `> 共 ${characters.length} 个故事角色\n\n`;

  // 角色详情
  for (const c of characters) {
    md += `## ${c.name}\n\n`;
    md += `- **定位**: ${c.role || '未设定'}\n`;
    md += `- **状态**: ${c.status || '未知'}\n`;
    md += `- **性格**: ${c.personality || '-'}\n`;
    md += `- **说话风格**: ${c.speaking_style || '-'}\n`;
    md += `- **当前状态**: ${c.current_state || '-'}\n`;
    if (c.relations) {
      md += `- **关系**: ${c.relations}\n`;
    }
    md += '\n';
  }

  return md;
}

function generateParticleLedger(novelId: string): string {
  const resources = getStoryResources(novelId);

  let md = `# 资源账本\n\n`;
  md += `> 共 ${resources.length} 条资源变动记录\n\n`;

  // 按资源名分组
  const grouped = new Map<string, typeof resources>();
  for (const r of resources) {
    if (!grouped.has(r.resource_name)) grouped.set(r.resource_name, []);
    grouped.get(r.resource_name)!.push(r);
  }

  for (const [name, items] of grouped) {
    md += `## ${name}\n\n`;
    md += `| 章节 | 变动 | 数量 | 描述 |\n|------|------|------|------|\n`;
    for (const item of items) {
      md += `| ${item.chapter || '-'} | ${item.change_type || '-'} | ${item.amount || '-'} | ${item.description || '-'} |\n`;
    }
    md += '\n';
  }

  return md;
}

function generatePendingHooks(novelId: string): string {
  const hooks = getStoryHooks(novelId);

  const open = hooks.filter(h => h.status === 'open');
  const progressing = hooks.filter(h => h.status === 'progressing');
  const resolved = hooks.filter(h => h.status === 'resolved');

  let md = `# 伏笔追踪\n\n`;
  md += `> 🔴 未回收 ${open.length} | 🟡 进行中 ${progressing.length} | 🟢 已回收 ${resolved.length}\n\n`;

  if (open.length > 0) {
    md += `## 🔴 未回收伏笔\n\n`;
    for (const h of open) {
      md += `- **${h.id}** (第${h.chapter || '?'}章): ${h.content}\n`;
    }
    md += '\n';
  }

  if (progressing.length > 0) {
    md += `## 🟡 进行中伏笔\n\n`;
    for (const h of progressing) {
      md += `- **${h.id}** (第${h.chapter || '?'}章): ${h.content}\n`;
    }
    md += '\n';
  }

  if (resolved.length > 0) {
    md += `## 🟢 已回收伏笔\n\n`;
    for (const h of resolved) {
      md += `- **${h.id}** (第${h.chapter || '?'}章): ${h.content}\n`;
    }
    md += '\n';
  }

  return md;
}

function generateChapterSummaries(novelId: string): string {
  const summaries = getStorySummaries(novelId);

  let md = `# 章节摘要\n\n`;
  md += `> 共 ${summaries.length} 章有摘要\n\n`;

  for (const s of summaries) {
    md += `## 第${s.chapter}章${s.title ? ` ${s.title}` : ''}\n\n`;
    if (s.summary) md += `${s.summary}\n\n`;
    if (s.key_events) md += `**关键事件**: ${s.key_events}\n\n`;
    if (s.fact_range) md += `**事实范围**: ${s.fact_range}\n\n`;
    md += '---\n\n';
  }

  return md;
}

function generateSubplotBoard(novelId: string): string {
  const plotlines = getStoryPlotlines(novelId);

  let md = `# 支线进度板\n\n`;
  md += `> 共 ${plotlines.length} 条支线\n\n`;

  const active = plotlines.filter(p => p.status === 'active');
  const dormant = plotlines.filter(p => p.status === 'dormant');
  const resolved = plotlines.filter(p => p.status === 'resolved');

  if (active.length > 0) {
    md += `## 🟢 活跃支线\n\n`;
    for (const p of active) {
      md += `### ${p.name}\n`;
      md += `- 状态: 活跃\n`;
      md += `- 起始: 第${p.start_chapter || '?'}章\n`;
      if (p.end_chapter) md += `- 结束: 第${p.end_chapter}章\n`;
      if (p.description) md += `- 描述: ${p.description}\n`;
      md += '\n';
    }
  }

  if (dormant.length > 0) {
    md += `## 🟡 休眠支线\n\n`;
    for (const p of dormant) {
      md += `### ${p.name}\n`;
      md += `- 状态: 休眠\n`;
      if (p.description) md += `- 描述: ${p.description}\n`;
      md += '\n';
    }
  }

  if (resolved.length > 0) {
    md += `## ⚪ 已完结支线\n\n`;
    for (const p of resolved) {
      md += `### ${p.name}\n`;
      md += `- 已完结\n\n`;
    }
  }

  return md;
}

function generateEmotionalArcs(novelId: string): string {
  const state = getStoryState(novelId, 'emotion');
  const characters = getStoryCharacters(novelId);

  let md = `# 情感弧线\n\n`;

  if (characters.length > 0) {
    md += `## 角色情绪状态\n\n`;
    md += `| 角色 | 当前状态 | 性格 |\n|------|----------|------|\n`;
    for (const c of characters) {
      md += `| ${c.name} | ${c.current_state || '-'} | ${c.personality || '-'} |\n`;
    }
    md += '\n';
  }

  if (state.length > 0) {
    md += `## 情感状态记录\n\n`;
    for (const s of state) {
      md += `- **${s.key}**: ${s.value}\n`;
    }
    md += '\n';
  }

  return md;
}

function generateStoryBible(novelId: string): string {
  const state = getStoryState(novelId);
  const db = getDatabase();

  let md = `# 故事圣经\n\n`;

  // 核心设定
  const coreSettings = state.filter(s => s.category === 'setting' || s.category === 'world');
  if (coreSettings.length > 0) {
    md += `## 世界观设定\n\n`;
    for (const s of coreSettings) {
      md += `- **${s.key}**: ${s.value}\n`;
    }
    md += '\n';
  }

  // 写作配置
  try {
    const configRows = db.prepare('SELECT config_key, config_value FROM novel_configs WHERE novel_id = ?').all(novelId) as any[];
    if (configRows.length > 0) {
      md += `## 写作配置\n\n`;
      for (const row of configRows) {
        let value: any;
        try { value = JSON.parse(row.config_value); } catch { value = row.config_value; }
        if (Array.isArray(value)) {
          md += `### ${row.config_key}\n\n`;
          for (const v of value) {
            md += `- ${v}\n`;
          }
          md += '\n';
        } else {
          md += `- **${row.config_key}**: ${value}\n`;
        }
      }
    }
  } catch {
    // ignore
  }

  // 大纲
  try {
    const outlineRow = db.prepare('SELECT content FROM outline WHERE novel_id = ? OR id = ?').get(novelId, 'main') as any;
    if (outlineRow?.content) {
      md += `\n## 大纲\n\n${outlineRow.content}\n\n`;
    }
  } catch {
    // ignore
  }

  return md;
}

// ==================== 列表 API ====================

export interface TruthFileListItem {
  name: string;
  label: string;
  description: string;
  icon: string;
  size: number;
}

export function listTruthFiles(novelId: string): TruthFileListItem[] {
  return TRUTH_FILES.map(meta => {
    const content = generateTruthFile(novelId, meta.name);
    return {
      ...meta,
      size: content?.length || 0,
    };
  });
}
