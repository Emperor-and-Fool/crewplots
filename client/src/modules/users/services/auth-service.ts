/**
 * Auth Service - Pure authentication business logic
 * Handles all HTTP requests, response parsing, and auth flow coordination
 * Used by auth hooks to keep context clean
 */

import { User, Register, Login } from "@shared/schema";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse =
  | { user: User; redirectScript: string }
  | { error: string }
  | false;

export type AuthResult = {
  success: boolean;
  user?: User;
  error?: string;
};

export class AuthService {
  /**
   * Authenticate user with username/password
   * Returns user data and redirect info on success
   */
  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const urlencoded = new URLSearchParams();
      urlencoded.append('username', username);
      urlencoded.append('password', password);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded.toString(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.user) {
          return data;
        } else {
          return false;
        }
      } else {
        try {
          const errorData = await response.json();
          return { error: errorData.message || "Login failed" };
        } catch (e) {
          return { error: "An unexpected error occurred" };
        }
      }
    } catch (error) {
      return { error: "Could not connect to the server. Please check your network connection." };
    }
  }

  /**
   * Register new user account
   * Returns success/failure with appropriate messaging
   */
  static async register(userData: Register): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (response.ok) {
        return { success: true };
      } else {
        try {
          const errorData = await response.json();
          return { 
            success: false, 
            error: errorData.message || "Unable to create account" 
          };
        } catch (e) {
          return { 
            success: false, 
            error: "An unexpected error occurred. Please try again." 
          };
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: "Could not connect to the server. Please check your network connection." 
      };
    }
  }

  /**
   * Check if any session cookies exist before making auth request
   */
  private static hasCookies(): boolean {
    return document.cookie.includes('connect.sid') || 
           document.cookie.includes('session') ||
           document.cookie.length > 0;
  }

  /**
   * Clear ghost/expired session cookies
   */
  private static clearSessionCookies(): void {
    document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  /**
   * Validate current session and return user data
   * Returns null if no valid session exists
   */
  static async validateSession(): Promise<User | null> {
    try {
      // Use ValidationEngine30 auth endpoint - simplified authentication check
      const response = await fetch('/api/validation/v3/auth', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const authData = await response.json();
        // ValidationEngine30 response structure: { success, result, user }
        if (authData?.success && authData.user) {
          return authData.user;
        } else {
          return null;
        }
      } else if (response.status === 401) {
        // Session expired or invalid - clear ghost cookies
        this.clearSessionCookies();
        return null;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout current user session
   * Uses dev-logout route for reliable session cleanup
   */
  static async logout(): Promise<void> {
    try {
      // Use production logout endpoint instead of dev-logout
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Silent failure - user is already logged out locally
      console.log('Logout request failed, but proceeding with local cleanup:', error);
    }
  }

  /**
   * Check current authentication status
   * Used for session validation and user data refresh
   */
  static async checkAuth(): Promise<AuthResult> {
    try {
      const response = await fetch('/api/validation/v3/auth', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const authData = await response.json();
        if (authData?.success && authData.user) {
          return { success: true, user: authData.user };
        } else {
          return { success: false };
        }
      } else {
        return { success: false };
      }
    } catch (error) {
      return { success: false };
    }
  }
}