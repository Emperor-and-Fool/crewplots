import { useAuth } from '@/hooks/use-auth';
import { Login, Register } from '@shared/schema';

/**
 * Auth Operations Hook
 * 
 * Provides business logic operations for authentication while maintaining
 * compatibility with existing auth-context. This hook extracts the core
 * authentication operations into a focused interface.
 */
export const useAuthOperations = () => {
  const { 
    login: contextLogin, 
    logout: contextLogout, 
    register: contextRegister,
    user,
    isAuthenticated,
    isLoading 
  } = useAuth();

  /**
   * Login operation with enhanced error handling
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await contextLogin(username, password);
      return result;
    } catch (error) {
      console.error('Login operation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  /**
   * Registration operation with enhanced error handling
   */
  const register = async (userData: Register): Promise<boolean> => {
    try {
      const result = await contextRegister(userData);
      return result;
    } catch (error) {
      console.error('Registration operation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  /**
   * Logout operation with cleanup
   */
  const logout = async (): Promise<void> => {
    try {
      await contextLogout();
    } catch (error) {
      console.error('Logout operation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  /**
   * Get current user info safely
   */
  const getCurrentUser = () => {
    return user;
  };

  return {
    // Core operations
    login,
    register,
    logout,
    
    // State queries
    user,
    isAuthenticated,
    isLoading,
    getCurrentUser,
    
    // Role utilities
    hasRole,
    hasAnyRole,
  };
};

export type AuthOperations = ReturnType<typeof useAuthOperations>;