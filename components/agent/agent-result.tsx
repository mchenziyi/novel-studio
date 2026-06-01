import { cn } from '@/lib/utils';

interface AgentResultProps {
  result: any;
  error?: string;
  loading?: boolean;
}

export function AgentResult({ result, error, loading = false }: AgentResultProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-red-500">❌</span>
          <span className="font-semibold text-red-700">错误</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无结果</p>
      </div>
    );
  }

  const isString = typeof result === 'string';
  const isObject = typeof result === 'object' && result !== null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-green-500">✅</span>
        <span className="font-semibold">运行结果</span>
      </div>

      {isString ? (
        <div className="whitespace-pre-wrap text-sm font-mono bg-white p-4 rounded border">
          {result}
        </div>
      ) : isObject ? (
        <div className="bg-white p-4 rounded border overflow-auto max-h-96">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="text-sm">{String(result)}</div>
      )}
    </div>
  );
}
