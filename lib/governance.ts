import { getDatabase } from './database';

// ==================== 输入治理控制面 ====================
// 参照 inkos 的 author_intent + current_focus 设计

export interface GovernanceDoc {
  novel_id: string;
  doc_type: 'author_intent' | 'current_focus';
  content: string;
  updated_at: string;
}

const DOC_LABELS: Record<string, string> = {
  author_intent: '作者意图',
  current_focus: '当前焦点',
};

const DOC_DESCRIPTIONS: Record<string, string> = {
  author_intent: '这本书长期想成为什么——核心主题、风格方向、终局愿景',
  current_focus: '最近 1-3 章要把注意力拉回哪里——当前矛盾、伏笔推进、角色发展',
};

// 获取治理文档
export function getGovernanceDoc(novelId: string, docType: string): GovernanceDoc | null {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM novel_governance WHERE novel_id = ? AND doc_type = ?'
  ).get(novelId, docType) as GovernanceDoc | null;
}

// 获取所有治理文档
export function getGovernanceDocs(novelId: string): GovernanceDoc[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM novel_governance WHERE novel_id = ? ORDER BY doc_type'
  ).all(novelId) as GovernanceDoc[];
}

// 更新治理文档
export function updateGovernanceDoc(novelId: string, docType: string, content: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO novel_governance (novel_id, doc_type, content, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(novel_id, doc_type) DO UPDATE SET content = ?, updated_at = ?
  `).run(novelId, docType, content, now, content, now);
}

// 删除治理文档
export function deleteGovernanceDoc(novelId: string, docType: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM novel_governance WHERE novel_id = ? AND doc_type = ?').run(novelId, docType);
}

// 获取治理上下文（注入 pipeline 用）
export function getGovernanceContext(novelId: string): {
  authorIntent: string;
  currentFocus: string;
} {
  const intent = getGovernanceDoc(novelId, 'author_intent');
  const focus = getGovernanceDoc(novelId, 'current_focus');
  return {
    authorIntent: intent?.content || '',
    currentFocus: focus?.content || '',
  };
}

export { DOC_LABELS, DOC_DESCRIPTIONS };
