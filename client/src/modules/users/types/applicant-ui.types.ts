/**
 * User Module - Applicant UI Type Extensions
 * 
 * UI-specific types for applicant management and application workflow.
 * Extends @shared/schema types for applicant-related operations.
 */

import type { User, InsertUser } from '@shared/schema';

// Applicant application form wizard state
export interface ApplicantFormWizardState {
  currentStep: number;
  completedSteps: Set<number>;
  formData: Partial<InsertUser>;
  // uploadedFiles: File[]; // near-future-removal: Upload system removed
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
}

// Applicant form steps configuration
export interface ApplicantFormStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  validation: (data: Partial<InsertUser>) => Record<string, string>;
  isOptional?: boolean;
}

// Applicant list filtering and management
export interface ApplicantListFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'interview';
  location?: number;
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasNotes?: boolean;
}

export interface ApplicantListState {
  applicants: User[];
  filters: ApplicantListFilters;
  isLoading: boolean;
  selectedApplicants: Set<number>;
  sortBy: 'name' | 'email' | 'createdAt' | 'status';
  sortOrder: 'asc' | 'desc';
}

// Applicant detail view state
export interface ApplicantDetailState {
  applicant: User;
  notes: {
    content?: string;
    hasNotes: boolean;
    isLoading: boolean;
    isEditing: boolean;
  };
  documents: {
    files: any[];
    isLoading: boolean;
  };
  timeline: {
    events: ApplicantTimelineEvent[];
    isLoading: boolean;
  };
}

export interface ApplicantTimelineEvent {
  id: string;
  type: 'application' | 'note' | 'status_change' | 'interview' | 'document';
  timestamp: Date;
  description: string;
  user?: string;
  metadata?: Record<string, any>;
}

// Applicant status management
export interface ApplicantStatusUpdate {
  applicantId: number;
  newStatus: string;
  reason?: string;
  notifyApplicant?: boolean;
  scheduledActions?: {
    sendEmail?: boolean;
    createReminder?: boolean;
  };
}

// Applicant bulk operations
export interface ApplicantBulkOperation {
  operation: 'approve' | 'reject' | 'archive' | 'export' | 'delete';
  applicantIds: number[];
  reason?: string;
  notificationSettings?: {
    sendEmails: boolean;
    emailTemplate?: string;
  };
}