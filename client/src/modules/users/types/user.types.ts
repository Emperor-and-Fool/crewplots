// User Module - Core User Types
// Extracted from shared/schema.ts and existing components

export type UserRole = 'applicant' | 'crew' | 'manager' | 'administrator';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Profile fields
  phone?: string;
  avatar?: string;
  bio?: string;
  
  // Applicant-specific fields
  resumeUrl?: string;
  notes?: string;
  applicationStatus?: string;
  
  // Location assignment
  locationId?: number;
}

export interface UserProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  locationId?: number;
}

export interface UserSettings {
  id: number;
  userId: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phone?: string;
  locationId?: number;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  status?: UserStatus;
  role?: UserRole;
  locationId?: number;
}

// User listing and filtering
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  locationId?: number;
  search?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}