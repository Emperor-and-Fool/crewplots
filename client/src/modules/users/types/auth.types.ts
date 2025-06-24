// User Module - Authentication Types
// Extracted from hooks/use-auth.ts and auth contexts

import type { User, UserRole } from './user.types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agreedToTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Permission-related types
export interface UserPermissions {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageApplicants: boolean;
  canManageLocations: boolean;
  canManageSchedules: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canAccessAdmin: boolean;
}

export interface RolePermissions {
  [key: string]: UserPermissions;
}

// Auth context types
export interface AuthContextValue {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  resetPassword: (request: PasswordResetRequest) => Promise<AuthResponse>;
  confirmPasswordReset: (data: PasswordResetConfirm) => Promise<AuthResponse>;
  changePassword: (request: ChangePasswordRequest) => Promise<AuthResponse>;
  checkPermission: (permission: keyof UserPermissions) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

// Authentication hooks
export interface UseAuthReturn extends AuthContextValue {
  permissions: UserPermissions;
  isAdmin: boolean;
  isManager: boolean;
  isCrew: boolean;
  isApplicant: boolean;
}

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAccount: () => Promise<void>;
}

// Session management
export interface SessionConfig {
  maxAge: number;
  rolling: boolean;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface LoginOptions {
  redirectTo?: string;
  rememberMe?: boolean;
}

export interface LogoutOptions {
  redirectTo?: string;
  clearAllSessions?: boolean;
}