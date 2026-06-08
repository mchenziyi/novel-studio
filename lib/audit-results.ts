import { getDatabase } from './database';
import { AuditResult, AuditDimensionResult, AuditIssue } from '@/types/pipeline';

// ==================== 审计结果持久化 ====================

export function saveAuditResult(result: AuditResult): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // 主表
  db.prepare(`
    INSERT OR REPLACE INTO audit_results 
      (id, chapter_id, pipeline_id, passed, summary, total_issues, critical_count, warning_count, info_count, overall_score, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.pipelineId,
    result.chapterId,
    result.pipelineId,
    result.passed ? 1 : 0,
    result.summary,
    result.totalIssues,
    result.criticalCount,
    result.warningCount,
    result.infoCount,
    result.overallScore,
    result.timestamp,
    now,
  );

  // 维度详情表
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO audit_dimension_results
      (id, audit_id, dimension_name, dimension_label, passed, score, issues_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const dim of result.dimensions) {
    stmt.run(
      `${result.pipelineId}-${dim.dimensionName}`,
      result.pipelineId,
      dim.dimensionName,
      dim.dimensionLabel,
      dim.passed ? 1 : 0,
      dim.score,
      JSON.stringify(dim.issues),
    );
  }
}

export function getAuditResult(pipelineId: string): AuditResult | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM audit_results WHERE id = ?').get(pipelineId) as any;
  if (!row) return null;

  const dimRows = db.prepare('SELECT * FROM audit_dimension_results WHERE audit_id = ?').all(pipelineId) as any[];
  
  return {
    chapterId: row.chapter_id,
    pipelineId: row.id,
    passed: row.passed === 1,
    summary: row.summary,
    totalIssues: row.total_issues,
    criticalCount: row.critical_count,
    warningCount: row.warning_count,
    infoCount: row.info_count,
    overallScore: row.overall_score,
    timestamp: row.timestamp,
    dimensions: dimRows.map((d: any) => ({
      dimensionName: d.dimension_name,
      dimensionLabel: d.dimension_label,
      passed: d.passed === 1,
      score: d.score,
      issues: JSON.parse(d.issues_json || '[]') as AuditIssue[],
    })),
  };
}

export function getAuditResultsByChapter(chapterId: number): AuditResult[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM audit_results WHERE chapter_id = ? ORDER BY timestamp DESC').all(chapterId) as any[];
  return rows.map(r => getAuditResult(r.id)).filter(Boolean) as AuditResult[];
}

export function getLatestAuditResult(chapterId: number): AuditResult | null {
  const db = getDatabase();
  const row = db.prepare('SELECT id FROM audit_results WHERE chapter_id = ? ORDER BY timestamp DESC LIMIT 1').get(chapterId) as any;
  if (!row) return null;
  return getAuditResult(row.id);
}

export function deleteAuditResult(pipelineId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM audit_dimension_results WHERE audit_id = ?').run(pipelineId);
  db.prepare('DELETE FROM audit_results WHERE id = ?').run(pipelineId);
}
