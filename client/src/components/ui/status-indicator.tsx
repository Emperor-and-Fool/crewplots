import React from 'react';
import { cn } from '@/lib/utils';

export type StatusIndicatorState = 'idle' | 'saving' | 'saved' | 'error';

interface StatusIndicatorProps {
  state: StatusIndicatorState;
  className?: string;
  showText?: boolean;
}

const statusConfig = {
  idle: {
    color: 'bg-gray-300',
    text: 'Not saved',
    pulse: false
  },
  saving: {
    color: 'bg-yellow-500',
    text: 'Saving...',
    pulse: true
  },
  saved: {
    color: 'bg-green-500',
    text: 'Saved',
    pulse: false
  },
  error: {
    color: 'bg-red-500',
    text: 'Error saving',
    pulse: false
  }
};

export function StatusIndicator({ state, className, showText = false }: StatusIndicatorProps) {
  const config = statusConfig[state];
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "w-2.5 h-2.5 rounded-full border border-white shadow-sm",
          config.color,
          config.pulse && "animate-pulse"
        )}
        title={config.text}
      />
      {showText && (
        <span className="text-xs text-gray-600">
          {config.text}
        </span>
      )}
    </div>
  );
}