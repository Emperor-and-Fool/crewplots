// ⭐ CORE AUTO-SAVE HOOK - Extracted from messaging module
// Provides reusable auto-save functionality for any form/content

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface AutoSaveConfig<T = any> {
  // Core configuration
  debounceMs?: number;           // Auto-save delay (default: 2000ms)
  minContentLength?: number;     // Minimum content length to trigger save (default: 0)
  endpoint: string;              // API endpoint for saving
  method?: 'POST' | 'PUT' | 'PATCH'; // HTTP method (default: POST)
  
  // Data transformation
  transformData?: (data: T) => any; // Transform data before sending
  
  // Validation
  validateData?: (data: T) => boolean; // Validate before saving
  
  // Lifecycle callbacks
  onSaveStart?: () => void;
  onSaveSuccess?: (response: any) => void;
  onSaveError?: (error: any) => void;
  
  // Conditional saving
  enabled?: boolean;             // Enable/disable auto-save
  readOnlyMode?: boolean;        // Skip auto-save in read-only mode
}

export interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export function useAutoSave<T = any>(
  data: T,
  config: AutoSaveConfig<T>
): AutoSaveState & {
  manualSave: () => void;
  resetState: () => void;
} {
  const { toast } = useToast();
  
  // Extract configuration with defaults
  const {
    debounceMs = 2000,
    minContentLength = 0,
    endpoint,
    method = 'POST',
    transformData,
    validateData,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    enabled = true,
    readOnlyMode = false
  } = config;
  
  // Auto-save state (extracted from messaging useMessaging.tsx lines 26-29)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Internal state
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-save mutation (extracted from messaging useMessaging.tsx lines 167-218)
  const autoSaveMutation = useMutation({
    mutationFn: async (saveData: T) => {
      // Transform data if transformer provided
      const finalData = transformData ? transformData(saveData) : saveData;
      
      // Use apiRequest with VE30 unpacker for ValidationEngine30 endpoints
      const response = await apiRequest(method, endpoint, finalData);
      return response;
    },
    onMutate: () => {
      setStatus('saving');
      setError(null);
      onSaveStart?.();
    },
    onSuccess: (response) => {
      setStatus('saved');
      setLastSaved(new Date().toISOString());
      setLastSavedData(data);
      setHasUnsavedChanges(false);
      setError(null);
      onSaveSuccess?.(response);
      
      // Reset to idle after 2 seconds (extracted from messaging pattern)
      setTimeout(() => setStatus('idle'), 2000);
    },
    onError: (error: any) => {
      setStatus('error');
      setError(error.message || 'Auto-save failed');
      onSaveError?.(error);
      
      // Reset to idle after 3 seconds (extracted from messaging pattern)
      setTimeout(() => setStatus('idle'), 3000);
    }
  });
  
  // Data comparison helper
  const isDataChanged = useCallback((currentData: T, savedData: T | null): boolean => {
    if (!savedData) return true;
    
    // Simple deep comparison for objects
    return JSON.stringify(currentData) !== JSON.stringify(savedData);
  }, []);
  
  // Content length validation helper
  const hasMinimumContent = useCallback((checkData: T): boolean => {
    if (minContentLength === 0) return true;
    
    // Handle string content
    if (typeof checkData === 'string') {
      return checkData.trim().length >= minContentLength;
    }
    
    // Handle objects - check if they have meaningful content
    if (typeof checkData === 'object' && checkData !== null) {
      const stringified = JSON.stringify(checkData);
      return stringified.length >= minContentLength;
    }
    
    return true;
  }, [minContentLength]);
  
  // Auto-save effect (extracted from messaging useMessaging.tsx lines 253-266)
  useEffect(() => {
    // Skip if disabled or in read-only mode
    if (!enabled || readOnlyMode) {
      return;
    }
    
    // Skip if no data change
    if (!isDataChanged(data, lastSavedData)) {
      setHasUnsavedChanges(false);
      return;
    }
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new auto-save timeout
    timeoutRef.current = setTimeout(() => {
      // Validate data before saving
      if (validateData && !validateData(data)) {
        return;
      }
      
      // Check minimum content length
      if (!hasMinimumContent(data)) {
        return;
      }
      
      // Perform auto-save
      autoSaveMutation.mutate(data);
    }, debounceMs);
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, lastSavedData, enabled, readOnlyMode, debounceMs, validateData, hasMinimumContent, isDataChanged, autoSaveMutation]);
  
  // Manual save function
  const manualSave = useCallback(() => {
    if (!enabled || readOnlyMode) return;
    
    if (validateData && !validateData(data)) {
      toast({
        title: 'Validation Error',
        description: 'Please fix form errors before saving.',
        variant: 'destructive',
        duration: 4000
      });
      return;
    }
    
    autoSaveMutation.mutate(data);
  }, [data, enabled, readOnlyMode, validateData, autoSaveMutation, toast]);
  
  // Reset state function
  const resetState = useCallback(() => {
    setStatus('idle');
    setLastSaved(null);
    setHasUnsavedChanges(false);
    setError(null);
    setLastSavedData(null);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    // State
    status,
    lastSaved,
    hasUnsavedChanges,
    error,
    
    // Actions
    manualSave,
    resetState
  };
}