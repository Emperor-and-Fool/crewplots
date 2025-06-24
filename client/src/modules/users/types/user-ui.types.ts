/**
 * User Module - UI-Specific Type Extensions
 * 
 * This file contains UI-only types that extend the canonical @shared/schema types
 * without duplicating core business logic. All database operations should use
 * types from @shared/schema directly.
 */

import type { User, InsertUser } from '@shared/schema';

// Form state extensions for user management UI
export interface UserFormState extends Omit<InsertUser, 'id'> {
  confirmPassword?: string;
  isSubmitting?: boolean;
  validationErrors?: Record<string, string>;
}

// User list and filtering UI state
export interface UserListFilters {
  role?: string;
  location?: number;
  searchTerm?: string;
  sortBy?: 'name' | 'email' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListState {
  users: User[];
  filters: UserListFilters;
  isLoading: boolean;
  selectedUsers: Set<number>;
  totalCount: number;
  currentPage: number;
}

// Profile editing UI state
export interface ProfileEditState {
  user: User;
  isEditing: boolean;
  unsavedChanges: boolean;
  isSubmitting: boolean;
  errors?: Record<string, string>;
}

// User creation workflow UI state
export interface UserCreationWizardState {
  currentStep: number;
  completedSteps: Set<number>;
  formData: Partial<InsertUser>;
  validationResults: Record<string, boolean>;
}

// User authentication UI state (extends the core auth state)
export interface UserAuthUIState {
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  loginError?: string;
  rememberMe: boolean;
  redirectPath?: string;
}

// User permissions and role management UI
export interface UserPermissionsState {
  availableRoles: string[];
  rolePermissions: Record<string, string[]>;
  isUpdatingPermissions: boolean;
}