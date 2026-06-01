import { cn } from '@/lib/utils';
import { AgentType } from '@/types';

interface AgentCardProps {
  agentId: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function AgentCard({
  agentId,
  name,
  description,
  icon,
  color,
  selected = false,
  disabled = false,
  onClick,
}: AgentCardProps) {
  return (
    <div
      className={cn(
        'p-4 border rounded-lg cursor-pointer transition-all',
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex items-center space-x-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      </div>
    </div>
  );
}
