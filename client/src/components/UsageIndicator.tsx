import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface UsageIndicatorProps {
  tokensUsed: number;
  tokenLimit: number;
  plan: string;
}

export const UsageIndicator = ({ tokensUsed, tokenLimit, plan }: UsageIndicatorProps) => {
  const usagePercentage = (tokensUsed / tokenLimit) * 100;
  const isNearLimit = usagePercentage > 80;

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border-b">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">Daily Usage</span>
          <Badge variant={plan === 'pro' ? 'default' : 'secondary'}>
            {plan.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={usagePercentage} 
          className={`h-2 ${isNearLimit ? 'bg-red-100' : ''}`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{tokensUsed.toLocaleString()} tokens used</span>
          <span>{tokenLimit.toLocaleString()} limit</span>
        </div>
      </div>
      
      {isNearLimit && (
        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
          ⚠️ Approaching daily limit
        </div>
      )}
    </div>
  );
};
