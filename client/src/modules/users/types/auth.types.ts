// Authentication and authorization types

import type { UserRole, UserWithProfile } from './user.types';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  locationId?: number;
  isAuthenticated: boolean;
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  locationId?: number;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginDate?: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<AuthUser>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserWithProfile>) => Promise<void>;
  checkPermission: (permission: string, workflow?: string) => boolean;
}

// Permission system
export interface Permission {
  id: string;
  name: string;
  description: string;
  workflow?: string;
  level: 'read' | 'write' | 'admin';
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  workflows: string[];
}

// Session management
export interface SessionInfo {
  sessionId: string;
  userId: number;
  expiresAt: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
}