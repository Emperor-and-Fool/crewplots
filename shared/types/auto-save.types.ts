// ⭐ SHARED AUTO-SAVE TYPES - Central type definitions
// Used across messaging, scheduler, and future modules

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export interface AutoSaveConfig<T = any> {
  // Core configuration
  debounceMs?: number;           // Auto-save delay (default: 2000ms)
  minContentLength?: number;     // Minimum content length to trigger save
  endpoint: string;              // API endpoint for saving
  method?: 'POST' | 'PUT' | 'PATCH'; // HTTP method
  
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

// Domain-specific auto-save configurations
export interface MessagingAutoSaveConfig extends AutoSaveConfig<string> {
  messageId?: number;
  userId: number;
  workflow: 'applicant_notes' | 'staff_messages' | 'general_notes';
}

export interface SchedulerAutoSaveConfig extends AutoSaveConfig {
  level: 'scheduleBlock' | 'weekSchedule' | 'shift';
  scheduleBlockId?: number;
  weekScheduleId?: number;
  validationPackage?: boolean; // Use validation package service
}

// Auto-save response types
export interface AutoSaveResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// Russian Doll auto-save specific types
export interface RussianDollAutoSaveData {
  scheduleBlock?: {
    id?: number;
    name: string;
    description?: string;
    locationId: number;
    isActive: boolean;
  };
  weekSchedules?: Array<{
    id?: number;
    scheduleBlockId?: number;
    weekNumber: number;
    templateId?: number;
  }>;
  shifts?: Array<{
    id?: number;
    weekScheduleId?: number;
    title: string;
    position?: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    maxSlots: number;
    subscriptionDeadline?: string;
  }>;
}

export interface ValidationPackageAutoSaveResponse extends AutoSaveResponse {
  package?: {
    id: number;
    type: string;
    createdEntities?: {
      scheduleBlockId?: number;
      weekScheduleIds?: number[];
      shiftIds?: number[];
    };
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}