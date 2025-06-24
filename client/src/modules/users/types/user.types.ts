// User module core types
// Extracted from shared/schema.ts and existing user components

export type UserRole = 'administrator' | 'manager' | 'crew_manager' | 'crew_member' | 'applicant';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface BaseUser {
  id: number;
  publicId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  role: UserRole;
  locationId?: number;
  phoneNumber?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithProfile extends BaseUser {
  location?: {
    id: number;
    name: string;
    address?: string;
  };
  permissions: {
    [workflowName: string]: string[];
  };
  blockedPermissions: {
    [workflowName: string]: string[];
  };
}

export interface UserFormData {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: UserRole;
  locationId?: number;
  password?: string;
}

export interface UserUpdateData extends Partial<UserFormData> {
  status?: UserStatus;
}

// User management context
export interface UserManagementState {
  currentUser: UserWithProfile | null;
  users: UserWithProfile[];
  selectedLocation?: number;
  filters: UserFilters;
  isLoading: boolean;
  error: string | null;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  location?: number;
  search?: string;
}