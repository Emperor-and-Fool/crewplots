import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateWeekSchedule, useCreateWeekSchedule } from './useSchedulerData';
import type { WeekScheduleFormData, AutoSaveState, WeekScheduleWithShifts } from '../types/scheduler.types';

// Debounce utility for auto-save
function useDebounce<T extends any[]>(
  callback: (...args: T) => void,
  delay: number
): [(...args: T) => void, () => void] {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: T) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setDebounceTimer(newTimer);
  }, [callback, delay, debounceTimer]);

  const cancelDebounce = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [debounceTimer]);

  return [debouncedCallback, cancelDebounce];
}

export const useSchedulerActions = (weekSchedule: WeekScheduleWithShifts | null) => {
  const { toast } = useToast();
  const updateWeekSchedule = useUpdateWeekSchedule();
  const createWeekSchedule = useCreateWeekSchedule();
  
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isAutoSaving: false,
    hasUnsavedChanges: false
  });

  // Auto-save function
  const performAutoSave = useCallback(async (data: Partial<WeekScheduleFormData>) => {
    if (!weekSchedule?.id) return;

    setAutoSaveState(prev => ({ ...prev, isAutoSaving: true, autoSaveError: undefined }));

    try {
      await updateWeekSchedule.mutateAsync({ id: weekSchedule.id, data });
      setAutoSaveState(prev => ({
        ...prev,
        isAutoSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveState(prev => ({
        ...prev,
        isAutoSaving: false,
        autoSaveError: 'Auto-save failed. Changes may be lost.'
      }));
    }
  }, [weekSchedule?.id, updateWeekSchedule]);

  // Debounced auto-save (2 second delay)
  const [debouncedAutoSave, cancelAutoSave] = useDebounce(performAutoSave, 2000);

  // Trigger auto-save when form data changes
  const handleFormChange = useCallback((data: Partial<WeekScheduleFormData>) => {
    setAutoSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));
    debouncedAutoSave(data);
  }, [debouncedAutoSave]);

  // Manual save function
  const saveWeekSchedule = useCallback(async (data: WeekScheduleFormData) => {
    try {
      if (weekSchedule?.id) {
        await updateWeekSchedule.mutateAsync({ id: weekSchedule.id, data });
        toast({ 
          title: "Week schedule updated", 
          description: "Your changes have been saved successfully."
        });
      } else {
        await createWeekSchedule.mutateAsync(data);
        toast({ 
          title: "Week schedule created", 
          description: "New week schedule has been created successfully."
        });
      }
      
      setAutoSaveState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
    } catch (error) {
      console.error('Save failed:', error);
      toast({ 
        title: "Save failed", 
        description: "Failed to save week schedule. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [weekSchedule?.id, updateWeekSchedule, createWeekSchedule, toast]);

  // Cancel auto-save on component unmount
  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, [cancelAutoSave]);

  return {
    autoSaveState,
    handleFormChange,
    saveWeekSchedule,
    isLoading: updateWeekSchedule.isPending || createWeekSchedule.isPending
  };
};