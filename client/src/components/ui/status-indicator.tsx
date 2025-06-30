import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'saving' | 'saved' | 'error' | 'idle';
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'saving':
        return 'bg-yellow-500 animate-pulse';
      case 'saved':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'idle':
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error';
      case 'idle':
      default:
        return '';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-2 h-2 rounded-full", getStatusStyles())} />
      {getStatusText() && (
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}