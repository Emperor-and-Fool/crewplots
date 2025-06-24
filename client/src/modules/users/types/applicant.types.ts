// User Module - Applicant Types
// Extracted from components/applicants/applicant-form.tsx and related files

export type ApplicationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'interview_scheduled' 
  | 'interviewed' 
  | 'hired' 
  | 'rejected' 
  | 'withdrawn';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface WorkExperience {
  previousJobs: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    responsibilities: string;
    isCurrentJob: boolean;
  }>;
  skills: string[];
  certifications: string[];
  references: Array<{
    name: string;
    company: string;
    position: string;
    phone: string;
    email: string;
    relationship: string;
  }>;
}

export interface Availability {
  availableDays: string[];
  shiftPreferences: string[];
  startDate: string;
  hoursPerWeek: number;
  flexibleSchedule: boolean;
  overtime: boolean;
}

export interface ApplicationForm {
  personalInfo: PersonalInfo;
  workExperience: WorkExperience;
  availability: Availability;
  motivation: string;
  additionalInfo?: string;
  agreedToTerms: boolean;
  allowBackgroundCheck: boolean;
}

export interface ApplicationDocument {
  id: string;
  applicantId: number;
  type: 'resume' | 'cover_letter' | 'certificate' | 'reference' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ApplicantNote {
  id: number;
  applicantId: number;
  authorId: number;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface ApplicantSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  applicationStatus: ApplicationStatus;
  appliedAt: Date;
  lastActivity: Date;
  hasResume: boolean;
  noteCount: number;
  interviewDate?: Date;
  assignedLocation?: {
    id: number;
    name: string;
  };
}

export interface ApplicantDetail extends ApplicantSummary {
  application: ApplicationForm;
  documents: ApplicationDocument[];
  notes: ApplicantNote[];
  timeline: Array<{
    id: number;
    action: string;
    description: string;
    performedBy: string;
    performedAt: Date;
  }>;
}

// Form validation schemas
export interface ApplicantFormErrors {
  personalInfo?: Partial<Record<keyof PersonalInfo, string>>;
  workExperience?: {
    previousJobs?: Array<Partial<Record<keyof WorkExperience['previousJobs'][0], string>>>;
    skills?: string;
    references?: Array<Partial<Record<keyof WorkExperience['references'][0], string>>>;
  };
  availability?: Partial<Record<keyof Availability, string>>;
  motivation?: string;
  general?: string;
}

// API interfaces
export interface CreateApplicationRequest {
  application: ApplicationForm;
  documents?: File[];
}

export interface UpdateApplicationStatusRequest {
  applicantId: number;
  status: ApplicationStatus;
  note?: string;
}

export interface ApplicantFilters {
  status?: ApplicationStatus;
  locationId?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}