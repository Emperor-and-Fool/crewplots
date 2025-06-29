import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Location } from '@shared/schema';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';
import MultiWeekCalendarPreview from '../components/MultiWeekCalendarPreview';

// Schema for week schedule update form
const weekScheduleUpdateSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required'),
  isActive: z.boolean().default(true)
});

// Schema for shift creation form
const shiftCreationSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  daysOfWeek: z.array(z.string()).min(1, 'Select at least one day'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxSlots: z.number().min(1, 'Max slots must be at least 1'),
  subscriptionDeadline: z.string().optional(),
  competencyRequirements: z.array(z.object({
    competencyId: z.string(),
    priority: z.enum(['required', 'preferred', 'nice-to-have'])
  })).optional()
});

type WeekScheduleUpdateForm = z.infer<typeof weekScheduleUpdateSchema>;
type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

export default function SchedulerEditPage() {
  const params = useParams();
  const { scheduleId } = params; // Schedule block ID from URL parameter
  const id = scheduleId; // For backward compatibility with existing code
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  // Schedule block-based state
  const [selectedWeekScheduleIds, setSelectedWeekScheduleIds] = useState<number[]>([]);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic-info' | 'requirements' | 'schedule'>('basic-info');
  const [editingShift, setEditingShift] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Group editing dialog state
  const [showGroupEditDialog, setShowGroupEditDialog] = useState(false);
  const [groupEditDialogShift, setGroupEditDialogShift] = useState<any>(null);

  // Form setup
  const scheduleForm = useForm<WeekScheduleUpdateForm>({
    resolver: zodResolver(weekScheduleUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  const shiftForm = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      position: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      maxSlots: 1,
      subscriptionDeadline: '',
      competencyRequirements: []
    }
  });

  // Fetch schedule block data
  const { data: scheduleBlockData, isLoading: scheduleBlockLoading, error: scheduleBlockError } = useQuery({
    queryKey: ['/api/schedule-blocks', id],
    queryFn: async () => {
      console.log('🔍 FRONTEND: Fetching schedule block with ID:', id);
      console.log('🔍 FRONTEND: Permissions check - canEditSchedules:', permissions.canEditSchedules);
      const response = await fetch(`/api/schedule-blocks/${id}`, {
        credentials: 'include'
      });
      console.log('🔍 FRONTEND: Schedule block response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error('Failed to fetch schedule block');
      }
      const data = await response.json();
      console.log('🔍 FRONTEND: Schedule block data received:', data);
      return data;
    },
    enabled: !!id && permissions.canEditSchedules,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes in memory
  });

  // Use schedule block data as the primary source
  const existingSchedule = scheduleBlockData;

  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
    enabled: permissions.canEditSchedules,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for locations
    gcTime: 60 * 60 * 1000, // 1 hour in memory
  });



  // Fetch shifts for all week schedules - enable live data updates
  const { data: allShiftsData = [], isLoading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useQuery({
    queryKey: ['/api/schedule-blocks', scheduleId, 'all-shifts'],
    queryFn: async () => {
      console.log('🔍 ALL SHIFTS: Fetching shifts for schedule block:', scheduleId);
      
      // First get all week schedules for this block
      const weekSchedulesResponse = await fetch('/api/week-schedules', {
        credentials: 'include'
      });
      if (!weekSchedulesResponse.ok) {
        throw new Error('Failed to fetch week schedules');
      }
      const allWeeks = await weekSchedulesResponse.json();
      const scheduleBlockWeeks = allWeeks.filter((ws: any) => ws.scheduleBlockId === parseInt(scheduleId || '0'));
      
      // Then fetch shifts for each week schedule
      const allShifts: any[] = [];
      for (const week of scheduleBlockWeeks) {
        try {
          const shiftsResponse = await fetch(`/api/week-schedules/${week.id}/shifts`, {
            credentials: 'include'
          });
          if (shiftsResponse.ok) {
            const shifts = await shiftsResponse.json();
            allShifts.push(...shifts.map((shift: any) => ({ ...shift, weekScheduleId: week.id })));
          }
        } catch (error) {
          console.warn('Failed to fetch shifts for week:', week.id, error);
        }
      }
      
      console.log('🔍 ALL SHIFTS: Total shifts loaded:', allShifts.length);
      return allShifts;
    },
    enabled: !!scheduleId && permissions.canEditSchedules,
    staleTime: 0, // Always fresh for live updates
    gcTime: 30 * 1000, // 30 seconds in memory
  });

  // Fetch all week schedules in the same schedule block for multi-week preview
  const { data: allWeekSchedules = [] } = useQuery({
    queryKey: ['/api/week-schedules', 'frameId', scheduleBlockData?.id],
    queryFn: async () => {
      const response = await fetch(`/api/week-schedules?frameId=${scheduleBlockData.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch week schedules');
      }
      const data = await response.json();
      return data.weekSchedules || [];
    },
    enabled: !!scheduleBlockData?.id && permissions.canEditSchedules,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use consolidated data as primary source (following the standard pattern)
  const actualScheduleData = existingSchedule;

  // Populate form when schedule data loads
  useEffect(() => {
    if (actualScheduleData && actualScheduleData.name) {
      scheduleForm.reset({
        name: actualScheduleData.name || '',
        description: actualScheduleData.description || '',
        locationId: actualScheduleData.locationId || 0,
        isActive: actualScheduleData.isActive !== false
      });
    }
  }, [actualScheduleData, scheduleForm]);

  // Create a basic info form that syncs with the schedule data for the tabbed interface
  const basicInfoForm = useForm<WeekScheduleUpdateForm>({
    resolver: zodResolver(weekScheduleUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  // Keep basicInfoForm in sync with schedule data
  useEffect(() => {
    if (actualScheduleData && actualScheduleData.name) {
      basicInfoForm.reset({
        name: actualScheduleData.name || '',
        description: actualScheduleData.description || '',
        locationId: actualScheduleData.locationId || 0,
        isActive: actualScheduleData.isActive !== false
      });
    }
  }, [actualScheduleData, basicInfoForm]);

  const isLoading = scheduleBlockLoading && !existingSchedule;
  
  // State for controlling view transition
  const [showTabbedInterface, setShowTabbedInterface] = useState(true);

  // Set default selected week when allWeekSchedules loads
  useEffect(() => {
    if (allWeekSchedules.length > 0 && selectedWeekScheduleIds.length === 0) {
      // Default to the first week schedule
      setSelectedWeekScheduleIds([allWeekSchedules[0].id]);
    }
  }, [allWeekSchedules, selectedWeekScheduleIds]);

  // Function to go back to initial schedule form
  const handleBackToSchedule = () => {
    setShowTabbedInterface(false);
  };





  // Mutations
  const updateWeekScheduleMutation = useMutation({
    mutationFn: async (data: WeekScheduleUpdateForm) => {
      return await apiRequest('PUT', `/api/week-schedules/${scheduleId}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      // Update selectedWeekScheduleId for schedule block architecture
      // Schedule block architecture - no week schedule ID needed
      setHasBeenEdited(true);
      toast({
        title: "Schedule updated successfully",
        description: "You can now manage shifts for this schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Auto-save state management
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);
  const [hasSaveError, setHasSaveError] = React.useState(false);
  const [lastSavedFormData, setLastSavedFormData] = React.useState<string>('');
  const [draftShiftId, setDraftShiftId] = React.useState<number | null>(null);

  // Auto-save mutation using notes system pattern
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (formData: ShiftCreationForm) => {
      console.log('🔄 AUTO-SAVE: Starting auto-save for shift draft');
      
      // Generate unique group ID for shifts created together
      const shiftGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use selected week schedule IDs for shift creation, fallback to first week if none selected
      const targetWeekScheduleIds = selectedWeekScheduleIds.length > 0 ? selectedWeekScheduleIds : (allWeekSchedules.length > 0 ? [allWeekSchedules[0].id] : [parseInt(scheduleId || '0')]);
      
      // For auto-save, just save the first shift as draft
      const firstWeekId = targetWeekScheduleIds[0];
      const firstDay = formData.daysOfWeek[0];
      
      if (!firstWeekId || !firstDay) {
        throw new Error('No week schedule or day selected');
      }

      const draftShift = {
        weekScheduleId: firstWeekId,
        shiftGroupId,
        title: `${formData.position} - ${firstDay}`,
        position: formData.position,
        dayOfWeek: firstDay,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxSlots: formData.maxSlots,
        subscriptionDeadline: formData.subscriptionDeadline || null,
        competencyRequirements: formData.competencyRequirements || [],
        status: 'draft' as const
      };

      if (draftShiftId) {
        // Update existing draft - need PUT endpoint for shifts
        console.log(`🔄 AUTO-SAVE: Updating existing draft ${draftShiftId}`);
        const response = await apiRequest('PUT', `/api/shifts/${draftShiftId}`, draftShift);
        return await response.json();
      } else {
        // Create new draft
        console.log('🔄 AUTO-SAVE: Creating new draft shift');
        const response = await apiRequest('POST', `/api/week-schedules/${firstWeekId}/shifts`, draftShift);
        return await response.json();
      }
    },
    onMutate: () => {
      setIsAutoSaving(true);
      setHasSaveError(false);
    },
    onSuccess: (savedShift) => {
      console.log('🔄 AUTO-SAVE: Draft saved successfully', savedShift);
      if (!draftShiftId) {
        setDraftShiftId(savedShift.id);
      }
      setIsAutoSaving(false);
      setHasSaveError(false);
    },
    onError: (error) => {
      console.error('🔄 AUTO-SAVE: Failed to save draft', error);
      setIsAutoSaving(false);
      setHasSaveError(true);
    }
  });

  // Final save mutation (converts draft to final shifts)
  const finalSaveMutation = useMutation({
    mutationFn: async (data: ShiftCreationForm) => {
      console.log('💾 FINAL SAVE: Converting draft to final shifts');
      
      // Generate unique group ID for shifts created together
      const shiftGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use selected week schedule IDs for shift creation, fallback to first week if none selected
      const targetWeekScheduleIds = selectedWeekScheduleIds.length > 0 ? selectedWeekScheduleIds : (allWeekSchedules.length > 0 ? [allWeekSchedules[0].id] : [parseInt(scheduleId || '0')]);
      
      // Generate unique batch ID for shifts created across multiple weeks
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create final shifts for each selected week and each selected day
      const shiftsToCreate = [];
      for (const weekScheduleId of targetWeekScheduleIds) {
        for (const dayOfWeek of data.daysOfWeek) {
          shiftsToCreate.push({
            weekScheduleId: weekScheduleId,
            shiftGroupId,
            batchId,
            title: `${data.position} - ${dayOfWeek}`,
            position: data.position,
            dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            maxSlots: data.maxSlots,
            subscriptionDeadline: data.subscriptionDeadline || null,
            competencyRequirements: data.competencyRequirements || [],
            status: 'open' as const
          });
        }
      }

      // Delete draft if exists
      if (draftShiftId) {
        try {
          await apiRequest('DELETE', `/api/shifts/${draftShiftId}`);
          console.log('💾 FINAL SAVE: Draft deleted');
        } catch (error) {
          console.warn('💾 FINAL SAVE: Failed to delete draft', error);
        }
      }

      // Serial processing: create final shifts one by one
      const createdShifts = [];
      for (const shift of shiftsToCreate) {
        const weekScheduleId = shift.weekScheduleId;
        console.log(`💾 FINAL SAVE: Creating final shift for week ${weekScheduleId}:`, shift);
        const response = await apiRequest('POST', `/api/week-schedules/${weekScheduleId}/shifts`, shift);
        const createdShift = await response.json();
        createdShifts.push(createdShift);
      }
      
      console.log('💾 FINAL SAVE: All final shifts created successfully:', createdShifts);
      return createdShifts;
    },
    onSuccess: (data) => {
      // Invalidate cache and refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-blocks', scheduleId, 'all-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      selectedWeekScheduleIds.forEach(weekId => {
        queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', weekId, 'shifts'] });
      });
      refetchShifts();
      
      // Reset form and state
      shiftForm.reset();
      setEditingShift(null);
      setDraftShiftId(null);
      setLastSavedFormData('');
      
      const shiftCount = data.length;
      const weekCount = selectedWeekScheduleIds.length || 1;
      const dayCount = data.length / weekCount;
      
      toast({
        title: `${shiftCount} shift${shiftCount > 1 ? 's' : ''} saved successfully`,
        description: weekCount > 1 
          ? `Created identical shifts across ${weekCount} weeks (${dayCount} day${dayCount > 1 ? 's' : ''} each)`
          : "Your shifts have been added to the schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save shifts",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Auto-save effect with debouncing (following notes system pattern)
  React.useEffect(() => {
    const formData = shiftForm.getValues();
    const formDataString = JSON.stringify(formData);
    
    // Skip if form data hasn't changed or is empty
    if (formDataString === lastSavedFormData || !formData.position || !formData.startTime || !formData.endTime || !formData.daysOfWeek || formData.daysOfWeek.length === 0) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      if (formDataString !== lastSavedFormData && formData.position && formData.startTime && formData.endTime && formData.daysOfWeek && formData.daysOfWeek.length > 0) {
        console.log('🔄 AUTO-SAVE: Form changed, triggering auto-save');
        setLastSavedFormData(formDataString);
        autoSaveDraftMutation.mutate(formData as ShiftCreationForm);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [shiftForm.watch(), lastSavedFormData]);

  // Cleanup draft on unmount
  React.useEffect(() => {
    return () => {
      if (draftShiftId) {
        // Cleanup draft when leaving the page
        apiRequest('DELETE', `/api/shifts/${draftShiftId}`).catch(console.warn);
      }
    };
  }, [draftShiftId]);

  const handleScheduleSubmit = async (data: WeekScheduleUpdateForm) => {
    // Get the latest isActive value from basicInfoForm since that's where the Switch is connected
    const basicInfoValues = basicInfoForm.getValues();
    const mergedData = {
      ...data,
      isActive: basicInfoValues.isActive // Use the Switch value from basicInfoForm
    };
    updateWeekScheduleMutation.mutate(mergedData);
  };

  const handleShiftSubmit = async (data: ShiftCreationForm) => {
    console.log('💾 FRONTEND: handleShiftSubmit called with data:', data);
    console.log('💾 FRONTEND: editingShift state:', editingShift);
    console.log('💾 FRONTEND: finalSaveMutation.isPending:', finalSaveMutation.isPending);
    
    // In edit mode, we should NOT create new shifts when editing existing schedule
    if (editingShift) {
      console.log('💾 FRONTEND: In edit mode - showing toast and returning');
      toast({
        title: "Edit Mode Active",
        description: "Click-to-edit functionality is for viewing shift details. To modify shifts, use individual shift management.",
        variant: "default"
      });
      return;
    }
    
    console.log('💾 FRONTEND: Not in edit mode - proceeding with final save');
    console.log('💾 FRONTEND: Calling finalSaveMutation.mutate with data:', data);
    // Convert draft to final shifts
    finalSaveMutation.mutate(data);
  };

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      return apiRequest('DELETE', `/api/shifts/${shiftId}`);
    },
    onSuccess: () => {
      // Invalidate the week schedule shifts query
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId, 'shifts'] });
      toast({
        title: "Shift deleted successfully",
        description: "The shift has been removed from the schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete shift",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const [, setLocation] = useLocation();
  
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest('DELETE', `/api/week-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      setLocation('/scheduler');
      toast({
        title: "Schedule deleted successfully",
        description: "The schedule and all its shifts have been removed"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Schedule block update mutation
  const updateScheduleBlockMutation = useMutation({
    mutationFn: async (blockData: { name: string; description?: string; locationId: number; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/schedule-blocks/${id}`, blockData);
    },
    onSuccess: (block: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-blocks'] });
      toast({
        title: "Schedule updated successfully",
        description: `Schedule "${block?.name || 'block'}" has been updated`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyWeekToFrameMutation = useMutation({
    mutationFn: async ({ frameId, weekNumber }: { frameId: number; weekNumber: number }) => {
      return await apiRequest('POST', `/api/week-schedules/${scheduleId}/copy`, {
        multiWeekFrameId: frameId,
        weekNumber
      });
    },
    onSuccess: (copiedWeek: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-blocks', scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId] });
      toast({
        title: "Week copied successfully",
        description: `Week ${copiedWeek?.weekNumber || 'new'} added to multi-week frame`
      });
      // Stay on current editor - don't navigate away
      // The user wants to see unified multi-week editing
    },
    onError: (error: any) => {
      toast({
        title: "Failed to copy week",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleShiftClick = (shift: any) => {
    // Check if this shift belongs to a group
    if (shift.shiftGroupId) {
      // Show group editing dialog
      setGroupEditDialogShift(shift);
      setShowGroupEditDialog(true);
    } else {
      // Edit single shift directly
      editSingleShift(shift);
    }
  };

  const editSingleShift = (shift: any) => {
    setEditingShift(shift);
    
    // Find the week schedule that contains this shift
    const shiftWeekScheduleId = shift.weekScheduleId || shift.scheduleId;
    if (shiftWeekScheduleId) {
      // Auto-select the week that contains this shift
      setSelectedWeekScheduleIds([shiftWeekScheduleId]);
    }
    
    shiftForm.reset({
      position: shift.position || '',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      maxSlots: shift.maxSlots || 1,
      subscriptionDeadline: shift.subscriptionDeadline || '',
      daysOfWeek: [shift.dayOfWeek || ''],
      competencyRequirements: shift.competencyRequirements || []
    });
    
    // Don't change tabs when editing - stay where the user is
    
    toast({
      title: "Shift selected for editing",
      description: `Editing ${shift.position} shift for ${shift.dayOfWeek}`
    });
  };

  const editShiftGroup = (shift: any) => {
    // Use the live shifts data for group detection
    const groupShifts = allShiftsData.filter((s: any) => s.shiftGroupId === shift.shiftGroupId);
    const groupDays = groupShifts.map((s: any) => s.dayOfWeek);
    
    console.log('🔍 GROUP EDIT: Found group shifts:', groupShifts.length);
    console.log('🔍 GROUP EDIT: Group days:', groupDays);
    
    setEditingShift(shift);
    
    // Find the week schedule that contains this shift
    const shiftWeekScheduleId = shift.weekScheduleId || shift.scheduleId;
    if (shiftWeekScheduleId) {
      // Auto-select the week that contains this shift
      setSelectedWeekScheduleIds([shiftWeekScheduleId]);
    }
    
    // Reset form with group days - use setTimeout to ensure state update
    setTimeout(() => {
      shiftForm.reset({
        position: shift.position || '',
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        maxSlots: shift.maxSlots || 1,
        subscriptionDeadline: shift.subscriptionDeadline || '',
        daysOfWeek: groupDays, // Set all days from the group
        competencyRequirements: shift.competencyRequirements || []
      });
      console.log('🔍 GROUP EDIT: Form reset with days:', groupDays);
    }, 100);
    
    // Don't change tabs when editing - stay where the user is
    
    toast({
      title: "Group selected for editing",
      description: `Editing ${shift.position} shift group (${groupDays.length} days)`
    });
  };

  const handleShiftDelete = (shift: any) => {
    deleteShiftMutation.mutate(shift.id);
  };

  const handleScheduleDelete = () => {
    const scheduleIdFromParams = scheduleId ? parseInt(scheduleId) : undefined;
    if (scheduleIdFromParams) {
      deleteScheduleMutation.mutate(scheduleIdFromParams);
    } else {
      toast({
        title: "Error",
        description: "Cannot delete schedule - invalid ID",
        variant: "destructive"
      });
    }
  };

  // Multi-week frame handlers
  const handleAddWeek = async () => {
    if (!actualScheduleData) return;

    // If this schedule doesn't have a multi-week frame yet, create one
    if (!actualScheduleData.multiWeekFrameId) {
      // Create a new multi-week frame
      const frameData = {
        name: `${actualScheduleData.name} - Multi-Week Frame`,
        description: `Multi-week frame for ${actualScheduleData.name}`,
        locationId: actualScheduleData.locationId,
        maxWeeks: 8
      };

      try {
        // Schedule block architecture - no frame creation needed
        const frame = { id: parseInt(scheduleId!) };
        
        // Update the current schedule to be part of this frame as week 1
        await updateWeekScheduleMutation.mutateAsync({
          ...actualScheduleData,
          multiWeekFrameId: frame.id,
          weekNumber: 1,
          name: `${actualScheduleData.name} (Week 1)`
        });

        // Refresh data to get updated schedule
        queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId] });

        // Now copy this week to create week 2
        await copyWeekToFrameMutation.mutateAsync({
          frameId: frame.id,
          weekNumber: 2
        });
      } catch (error) {
        console.error('Error creating multi-week frame:', error);
      }
    } else {
      // Frame already exists, just copy the current week
      const nextWeekNumber = 2; // Default to week 2 for schedule blocks
      if (nextWeekNumber <= 8) {
        await copyWeekToFrameMutation.mutateAsync({
          frameId: actualScheduleData.multiWeekFrameId,
          weekNumber: nextWeekNumber
        });
      } else {
        toast({
          title: "Maximum weeks reached",
          description: "Cannot add more than 8 weeks to a frame",
          variant: "destructive"
        });
      }
    }
  };

  const DAYS_OF_WEEK = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const POSITION_TEMPLATES = [
    'Manager',
    'Staff',
    'Supervisor', 
    'Floor Staff',
    'Assistant Manager',
    'Team Lead',
    'Coordinator'
  ];

  if (!permissions.canEditSchedules) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You don't have permission to edit schedules.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !existingSchedule) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {isLoading ? "Loading schedule data..." : "Loading schedule..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scheduleBlockError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load schedule data. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {!showTabbedInterface ? (
        // Initial state: Schedule editing form (pre-populated)
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              Edit Week Schedule: {existingSchedule?.name || 'Loading...'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Update the details for your weekly schedule template
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Details
              </CardTitle>
              <CardDescription>
                Modify the basic information for your weekly schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...scheduleForm}>
                <form onSubmit={scheduleForm.handleSubmit(handleScheduleSubmit)} className="space-y-6">
                  <FormField
                    control={scheduleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Week 1 Schedule" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scheduleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of this schedule..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scheduleForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(locations as Location[]).map((location: Location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between gap-4">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const formData = scheduleForm.getValues();
                        await updateWeekScheduleMutation.mutateAsync(formData);
                        window.location.href = '/scheduler';
                      }}
                      disabled={updateWeekScheduleMutation.isPending}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {updateWeekScheduleMutation.isPending ? "Saving..." : "To Templates"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const formData = scheduleForm.getValues();
                        await updateWeekScheduleMutation.mutateAsync(formData);
                        setShowTabbedInterface(true);
                      }}
                      disabled={updateWeekScheduleMutation.isPending}
                    >
                      {updateWeekScheduleMutation.isPending ? "Saving..." : "To Shifts"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Transformed state: Tabbed shift management interface (identical to create page)
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToSchedule}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Schedule
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAddWeek}
                  disabled={updateScheduleBlockMutation.isPending || copyWeekToFrameMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {updateScheduleBlockMutation.isPending || copyWeekToFrameMutation.isPending 
                    ? "Adding Week..." 
                    : "Add Week"
                  }
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    Add Shifts to {actualScheduleData?.name}
                    {actualScheduleData?.weekNumber && (
                      <span className="text-muted-foreground text-xl ml-2">
                        (Week {actualScheduleData.weekNumber})
                      </span>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Create and manage shifts for your weekly schedule
                  </p>
                </div>
                
                {actualScheduleData?.multiWeekFrameId && (
                  <div className="text-sm text-muted-foreground">
                    Multi-week schedule
                  </div>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic-info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Schedule Information
                    </CardTitle>
                    <CardDescription>
                      Edit the basic details of your weekly schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...basicInfoForm}>
                      <form onSubmit={basicInfoForm.handleSubmit(handleScheduleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={basicInfoForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Schedule Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., Weekend Service Schedule"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={basicInfoForm.control}
                            name="locationId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(locations as Location[]).map((location: Location) => (
                                      <SelectItem key={location.id} value={location.id.toString()}>
                                        {location.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={basicInfoForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Brief description of this schedule template..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={basicInfoForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className={`text-base font-medium ${field.value ? 'text-green-600' : 'text-red-600'}`}>
                                  {field.value ? 'Active Schedule' : 'Inactive Schedule'}
                                </FormLabel>
                                <FormDescription className={field.value ? 'text-green-500' : 'text-red-500'}>
                                  {field.value ? 'Available for shift creation' : 'Not available for shift creation'}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={updateWeekScheduleMutation.isPending}
                        >
                          {updateWeekScheduleMutation.isPending ? (
                            "Updating..."
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Update Schedule
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competency Requirements
                    </CardTitle>
                    <CardDescription>
                      Define the skills and competencies needed for this shift
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Competency requirements will be configured here. This feature is coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Create New Shifts
                    </CardTitle>
                    <CardDescription>
                      Add new shifts to this weekly schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...shiftForm}>
                      <form onSubmit={shiftForm.handleSubmit(handleShiftSubmit)} className="space-y-6">
                        <FormField
                          control={shiftForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select or type a position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {POSITION_TEMPLATES.map((position) => (
                                    <SelectItem key={position} value={position}>
                                      {position}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={shiftForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={shiftForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={shiftForm.control}
                          name="maxSlots"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Slots</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shiftForm.control}
                          name="subscriptionDeadline"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscription Deadline (Optional)</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Week Selector - checkbox selection for multi-week creation */}
                        {allWeekSchedules.length > 1 && (
                          <div className="space-y-3">
                            <FormLabel>Select Weeks</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {allWeekSchedules.map((weekSchedule) => (
                                <div key={weekSchedule.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`week-${weekSchedule.id}`}
                                    checked={selectedWeekScheduleIds.includes(weekSchedule.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedWeekScheduleIds([...selectedWeekScheduleIds, weekSchedule.id]);
                                      } else {
                                        setSelectedWeekScheduleIds(selectedWeekScheduleIds.filter(id => id !== weekSchedule.id));
                                      }
                                    }}
                                  />
                                  <label 
                                    htmlFor={`week-${weekSchedule.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    Week {weekSchedule.weekNumber}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Select multiple weeks to create identical shifts across them
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <FormLabel>Days of Week</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {DAYS_OF_WEEK.map(({ value, label }) => (
                              <FormField
                                key={value}
                                control={shiftForm.control}
                                name="daysOfWeek"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(value)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValue, value]);
                                          } else {
                                            field.onChange(currentValue.filter((item) => item !== value));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Auto-save status indicator */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-2">
                            {isAutoSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                                <span>Auto-saving...</span>
                              </>
                            ) : hasSaveError ? (
                              <>
                                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                                <span>Auto-save failed</span>
                              </>
                            ) : draftShiftId ? (
                              <>
                                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                <span>Draft saved</span>
                              </>
                            ) : (
                              <span>Fill form to auto-save</span>
                            )}
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={finalSaveMutation.isPending}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {finalSaveMutation.isPending ? (
                            "Finalizing Shifts..."
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Finalize Shifts
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competency Requirements
                    </CardTitle>
                    <CardDescription>
                      Define the skills and competencies needed for this shift
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Competency requirements will be configured here. This feature is coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Schedule
                    </CardTitle>
                    <CardDescription>
                      View and manage your weekly shift schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Debug live data flow */}
                    <div className="mb-2 text-xs text-muted-foreground">
                      Debug: {allShiftsData.length} shifts loaded, {allWeekSchedules.length} weeks
                    </div>
                    
                    <MultiWeekCalendarPreview 
                      scheduleBlockId={scheduleBlockData?.id || 0}
                      scheduleBlockName={scheduleBlockData?.name || ''}
                      weekSchedules={allWeekSchedules.map(ws => {
                        const weekShifts = allShiftsData.filter(shift => shift.weekScheduleId === ws.id);
                        console.log(`🔍 PREVIEW: Week ${ws.id} has ${weekShifts.length} shifts`);
                        return {
                          ...ws,
                          shifts: weekShifts
                        };
                      })}
                      onShiftClick={handleShiftClick}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>


        </div>
      )}

      {/* Group Edit Dialog */}
      <Dialog open={showGroupEditDialog} onOpenChange={setShowGroupEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift Group</DialogTitle>
            <DialogDescription>
              This shift belongs to a group created together. Would you like to edit the entire group or just this individual shift?
            </DialogDescription>
          </DialogHeader>
          
          {groupEditDialogShift && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Shift: <span className="font-medium">{groupEditDialogShift.position}</span> on <span className="font-medium">{groupEditDialogShift.dayOfWeek}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Group ID: <span className="font-mono text-xs">{groupEditDialogShift.shiftGroupId}</span>
              </p>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGroupEditDialog(false);
                if (groupEditDialogShift) {
                  editSingleShift(groupEditDialogShift);
                }
              }}
            >
              Edit Just This Shift
            </Button>
            <Button 
              onClick={() => {
                setShowGroupEditDialog(false);
                if (groupEditDialogShift) {
                  editShiftGroup(groupEditDialogShift);
                }
              }}
            >
              Edit Entire Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}