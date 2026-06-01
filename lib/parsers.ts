// Markdown 解析工具

// 解析 Markdown 标题
export function parseMarkdownHeadings(content: string): {
  level: number;
  title: string;
  line: number;
}[] {
  const lines = content.split('\n');
  const headings: { level: number; title: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        title: match[2],
        line: i + 1,
      });
    }
  }

  return headings;
}

// 解析 Markdown 列表
export function parseMarkdownLists(content: string): {
  type: 'ordered' | 'unordered';
  items: string[];
}[] {
  const lines = content.split('\n');
  const lists: { type: 'ordered' | 'unordered'; items: string[] }[] = [];
  let currentList: { type: 'ordered' | 'unordered'; items: string[] } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检测无序列表
    if (trimmedLine.match(/^[-*+]\s+/)) {
      if (!currentList || currentList.type !== 'unordered') {
        if (currentList) {
          lists.push(currentList);
        }
        currentList = { type: 'unordered', items: [] };
      }
      currentList.items.push(trimmedLine.replace(/^[-*+]\s+/, ''));
    }

    // 检测有序列表
    else if (trimmedLine.match(/^\d+\.\s+/)) {
      if (!currentList || currentList.type !== 'ordered') {
        if (currentList) {
          lists.push(currentList);
        }
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(trimmedLine.replace(/^\d+\.\s+/, ''));
    }

    // 非列表行
    else if (currentList) {
      lists.push(currentList);
      currentList = null;
    }
  }

  if (currentList) {
    lists.push(currentList);
  }

  return lists;
}

// 解析 Markdown 表格
export function parseMarkdownTable(content: string): {
  headers: string[];
  rows: string[][];
} | null {
  const lines = content.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  // 找到表格开始和结束
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('|') && line.includes('---')) {
      tableStart = i - 1;
    }
    if (tableStart >= 0 && !line.includes('|') && i > tableStart + 1) {
      tableEnd = i;
      break;
    }
  }

  if (tableStart < 0) {
    return null;
  }

  if (tableEnd < 0) {
    tableEnd = lines.length;
  }

  // 解析表头
  const headerLine = lines[tableStart].trim();
  const headers = headerLine
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell !== '');

  // 解析数据行
  const rows: string[][] = [];
  for (let i = tableStart + 2; i < tableEnd; i++) {
    const line = lines[i].trim();
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '');
      rows.push(cells);
    }
  }

  return { headers, rows };
}

// 解析 Markdown 代码块
export function parseMarkdownCodeBlocks(content: string): {
  language: string;
  code: string;
  line: number;
}[] {
  const lines = content.split('\n');
  const codeBlocks: { language: string; code: string; line: number }[] = [];
  let currentBlock: { language: string; code: string; line: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```') && !currentBlock) {
      currentBlock = {
        language: line.substring(3).trim() || 'text',
        code: '',
        line: i + 1,
      };
    } else if (line === '```' && currentBlock) {
      codeBlocks.push(currentBlock);
      currentBlock = null;
    } else if (currentBlock) {
      currentBlock.code += (currentBlock.code ? '\n' : '') + lines[i];
    }
  }

  return codeBlocks;
}

// 解析 Markdown 链接
export function parseMarkdownLinks(content: string): {
  text: string;
  url: string;
  line: number;
}[] {
  const lines = content.split('\n');
  const links: { text: string; url: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: i + 1,
      });
    }
  }

  return links;
}

// 解析 Markdown 图片
export function parseMarkdownImages(content: string): {
  alt: string;
  url: string;
  line: number;
}[] {
  const lines = content.split('\n');
  const images: { alt: string; url: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      images.push({
        alt: match[1],
        url: match[2],
        line: i + 1,
      });
    }
  }

  return images;
}

// 统计 Markdown 内容
export function analyzeMarkdown(content: string): {
  wordCount: number;
  charCount: number;
  lineCount: number;
  paragraphCount: number;
  headingCount: number;
  listCount: number;
  codeBlockCount: number;
  linkCount: number;
  imageCount: number;
} {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return {
    wordCount: words.length,
    charCount: content.length,
    lineCount: lines.length,
    paragraphCount: paragraphs.length,
    headingCount: parseMarkdownHeadings(content).length,
    listCount: parseMarkdownLists(content).length,
    codeBlockCount: parseMarkdownCodeBlocks(content).length,
    linkCount: parseMarkdownLinks(content).length,
    imageCount: parseMarkdownImages(content).length,
  };
}
