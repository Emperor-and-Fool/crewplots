// Applicant-specific types 
// Extension of user types for application workflow

import type { BaseUser } from './user.types';

export type ApplicationStatus = 'new' | 'contacted' | 'interviewed' | 'hired' | 'rejected' | 'short-listed';

export interface Applicant extends BaseUser {
  // Applicant-specific fields from schema
  status: ApplicationStatus;
  resumeUrl?: string;
  notes?: string;
  
  // Extended fields for application workflow
  applicationDate: string;
  interviewDate?: string;
  hiredDate?: string;
  rejectionReason?: string;
  competencies?: string[];
  availableShifts?: string[];
  
  // Document management
  documents?: ApplicantDocument[];
  
  // Communication history via messaging module
  messageCount?: number;
  lastContactDate?: string;
}

export interface ApplicantDocument {
  id: string;
  type: 'resume' | 'cover_letter' | 'reference' | 'certification' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ApplicantFormData {
  // Basic user info
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  
  // Application-specific
  locationId: number;
  competencies: string[];
  availableShifts: string[];
  notes?: string;
  
  // Documents
  resume?: File;
  coverLetter?: File;
}

export interface ApplicantFilters {
  status?: ApplicationStatus;
  location?: number;
  competencies?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ApplicantStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  byLocation: Record<number, number>;
  recentApplications: number;
  averageResponseTime: number;
}

// Application workflow actions
export interface ApplicantActions {
  updateStatus: (applicantId: number, status: ApplicationStatus, reason?: string) => Promise<void>;
  scheduleInterview: (applicantId: number, date: string) => Promise<void>;
  hire: (applicantId: number, startDate: string) => Promise<void>;
  reject: (applicantId: number, reason: string) => Promise<void>;
  addNote: (applicantId: number, note: string) => Promise<void>;
  uploadDocument: (applicantId: number, document: File, type: ApplicantDocument['type']) => Promise<void>;
}