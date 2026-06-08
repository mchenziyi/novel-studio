'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AuditResult, AuditDimensionResult, AuditIssue } from '@/types/pipeline';

interface AuditDetailProps {
  chapterId: number;
  pipelineId?: string;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
};

const severityIcons: Record<string, string> = {
  critical: '🔴',
  warning:  '🟡',
  info:     '🔵',
};

export function AuditDetail({ chapterId, pipelineId }: AuditDetailProps) {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  useEffect(() => {
    loadAuditResult();
  }, [chapterId, pipelineId]);

  const loadAuditResult = async () => {
    setLoading(true);
    try {
      const url = pipelineId
        ? `/api/agent/audit?pipelineId=${pipelineId}`
        : `/api/agent/audit?chapterId=${chapterId}&latest=true`;
      const res = await fetch(url);
      const data = await res.json();
      setResult(data.result || null);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-gray-400 text-sm">暂无审计记录</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 总览 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-2xl font-bold',
              result.overallScore >= 90 ? 'text-green-600' :
              result.overallScore >= 70 ? 'text-amber-600' : 'text-red-600'
            )}
          >
            {result.overallScore}
          </span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
        <div className="flex gap-2 text-xs">
          {result.criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              🔴 {result.criticalCount} 严重
            </span>
          )}
          {result.warningCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              🟡 {result.warningCount} 警告
            </span>
          )}
          {result.infoCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              🔵 {result.infoCount} 建议
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600">{result.summary}</p>

      {/* 各维度结果 */}
      <div className="space-y-1.5">
        {result.dimensions.map((dim) => (
          <DimensionRow
            key={dim.dimensionName}
            dim={dim}
            expanded={expandedDim === dim.dimensionName}
            onToggle={() =>
              setExpandedDim(prev =>
                prev === dim.dimensionName ? null : dim.dimensionName
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function DimensionRow({
  dim,
  expanded,
  onToggle,
}: {
  dim: AuditDimensionResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasIssues = dim.issues.length > 0;

  return (
    <div className="border border-[#e8e8e8] rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
          !dim.passed && 'bg-red-50/30'
        )}
      >
        <div className="flex items-center gap-2">
          <span>{dim.passed ? '✅' : '❌'}</span>
          <span className="font-medium text-[13px]">{dim.dimensionLabel}</span>
          {hasIssues && (
            <span className="text-[10px] text-gray-400">({dim.issues.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium',
              dim.score >= 90 ? 'text-green-600' :
              dim.score >= 70 ? 'text-amber-600' : 'text-red-600'
            )}
          >
            {dim.score}
          </span>
          {hasIssues && (
            <span className={cn('text-[10px] transition-transform', expanded ? 'rotate-180' : '')}>
              ▾
            </span>
          )}
        </div>
      </button>

      {expanded && hasIssues && (
        <div className="border-t border-[#e8e8e8] px-3 py-2 space-y-2 bg-gray-50/50">
          {dim.issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  return (
    <div className={cn('p-2 rounded border text-xs', severityColors[issue.severity])}>
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5">{severityIcons[issue.severity]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium mb-0.5">{issue.title}</div>
          <div className="text-gray-600">{issue.description}</div>
          {issue.location && (
            <div className="mt-1 text-gray-400">📍 {issue.location}</div>
          )}
          {issue.suggestion && (
            <div className="mt-1 text-green-700 bg-green-50/60 rounded px-2 py-1">
              💡 {issue.suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
