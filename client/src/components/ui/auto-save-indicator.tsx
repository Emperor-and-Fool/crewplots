// ⭐ ENHANCED AUTO-SAVE INDICATOR - Extended from basic status-indicator
// Provides rich auto-save status display with timestamps and manual save capability

import { useState, useEffect } from 'react';
import { Save, Check, X, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: string | null;
  hasUnsavedChanges?: boolean;
  error?: string | null;
  onManualSave?: () => void;
  variant?: 'minimal' | 'button' | 'badge' | 'full';
  className?: string;
  showTimestamp?: boolean;
  autoHideDelay?: number; // Hide 'saved' status after X seconds
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  hasUnsavedChanges = false,
  error,
  onManualSave,
  variant = 'minimal',
  className,
  showTimestamp = true,
  autoHideDelay = 2000
}: AutoSaveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-hide saved status (extracted from messaging pattern)
  useEffect(() => {
    if (status === 'saved' && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [status, autoHideDelay]);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };
  
  // Get status configuration
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Auto-saving...',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          badgeVariant: 'secondary' as const
        };
      case 'saved':
        return {
          icon: <Check className="w-3 h-3" />,
          text: 'Saved',
          color: 'bg-green-500',
          textColor: 'text-green-600',
          badgeVariant: 'secondary' as const
        };
      case 'error':
        return {
          icon: <X className="w-3 h-3" />,
          text: 'Save failed',
          color: 'bg-red-500',
          textColor: 'text-red-600',
          badgeVariant: 'destructive' as const
        };
      case 'idle':
      default:
        if (hasUnsavedChanges) {
          return {
            icon: <Clock className="w-3 h-3" />,
            text: 'Unsaved changes',
            color: 'bg-gray-400',
            textColor: 'text-gray-600',
            badgeVariant: 'outline' as const
          };
        }
        return {
          icon: null,
          text: '',
          color: 'bg-gray-300',
          textColor: 'text-gray-500',
          badgeVariant: 'outline' as const
        };
    }
  };
  
  const config = getStatusConfig();
  
  // Don't render if idle with no unsaved changes, or if auto-hidden
  if (!isVisible || (status === 'idle' && !hasUnsavedChanges)) {
    return null;
  }
  
  // Minimal variant (dot + text)
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        {config.text && (
          <span className={cn("text-xs", config.textColor)}>
            {config.text}
          </span>
        )}
      </div>
    );
  }
  
  // Badge variant
  if (variant === 'badge') {
    return (
      <Badge variant={config.badgeVariant} className={cn("gap-1", className)}>
        {config.icon}
        {config.text}
      </Badge>
    );
  }
  
  // Button variant (with manual save)
  if (variant === 'button') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
          {config.icon && <div className={config.textColor}>{config.icon}</div>}
          {config.text && (
            <span className={cn("text-xs", config.textColor)}>
              {config.text}
            </span>
          )}
        </div>
        
        {onManualSave && (hasUnsavedChanges || status === 'error') && (
          <Button
            size="sm"
            variant="outline"
            onClick={onManualSave}
            className="h-6 px-2 text-xs"
            disabled={status === 'saving'}
          >
            <Save className="w-3 h-3 mr-1" />
            Save Now
          </Button>
        )}
      </div>
    );
  }
  
  // Full variant (with timestamp and error details)
  if (variant === 'full') {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon && <div className={config.textColor}>{config.icon}</div>}
            {config.text && (
              <span className={cn("text-xs font-medium", config.textColor)}>
                {config.text}
              </span>
            )}
          </div>
          
          {onManualSave && (hasUnsavedChanges || status === 'error') && (
            <Button
              size="sm"
              variant="outline"
              onClick={onManualSave}
              className="h-6 px-2 text-xs"
              disabled={status === 'saving'}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          )}
        </div>
        
        {/* Timestamp */}
        {showTimestamp && lastSaved && status === 'saved' && (
          <span className="text-xs text-muted-foreground">
            Last saved: {formatTimestamp(lastSaved)}
          </span>
        )}
        
        {/* Error details */}
        {status === 'error' && error && (
          <span className="text-xs text-red-600">
            {error}
          </span>
        )}
        
        {/* Unsaved changes warning */}
        {hasUnsavedChanges && status === 'idle' && (
          <span className="text-xs text-orange-600">
            You have unsaved changes
          </span>
        )}
      </div>
    );
  }
  
  return null;
}