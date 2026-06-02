/**
 * 轻量级 Markdown → HTML 转换
 * 支持：标题、粗体、斜体、代码块、行内代码、列表、引用、换行
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';
  return text
    // 代码块（```lang\n...\n```）
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:12px;border-radius:8px;margin:8px 0;overflow-x:auto;font-size:13px"><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:1px 5px;border-radius:4px;font-size:13px">$1</code>')
    // 标题
    .replace(/^#### (.+)$/gm, '<h4 style="font-size:14px;font-weight:600;margin:8px 0 4px">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;margin:10px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:600;margin:12px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:600;margin:12px 0 6px">$1</h1>')
    // 粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="font-style:italic">$1</em>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #d4d4d4;padding-left:12px;margin:8px 0;color:#525252">$1</blockquote>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<div style="padding-left:16px">• $1</div>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:16px">$1</div>')
    // 表格分隔行（移除 |---|---|）
    .replace(/^\|[\s\-:|]+\|$/gm, '')
    // 表格行
    .replace(/^\|(.+)\|$/gm, (_, cells) => {
      const cols = cells.split('|').map((c: string) => c.trim());
      return '<div style="display:flex;gap:16px;padding:2px 0">' +
        cols.map((c: string) => `<span style="flex:1">${c}</span>`).join('') +
        '</div>';
    })
    // 水平线
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0"/>')
    // 换行处理
    .replace(/\n\n/g, '</p><p style="margin:0 0 8px">')
    .replace(/\n/g, '<br/>')
    // 包裹
    .replace(/^/, '<p style="margin:0 0 8px">')
    .replace(/$/, '</p>');
}
