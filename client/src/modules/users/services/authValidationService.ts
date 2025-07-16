import { User } from "@shared/schema";

export interface SessionValidationResult {
  user: User | null;
  isValid: boolean;
  shouldRedirectToLogin: boolean;
}

export interface SessionValidationOptions {
  skipLoginPage?: boolean;
  skipDuringLogout?: boolean;
}

/**
 * AuthValidationService - Pure business logic for session validation
 * Extracted from auth-context.tsx useEffect to maintain clean separation
 */
export class AuthValidationService {
  
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
   * Make authentication validation request to ValidationEngine30
   */
  private static async validateWithServer(): Promise<{ success: boolean; user?: User }> {
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
        // ValidationEngine30 response structure: { success, result, user }
        if (authData?.success && authData.user) {
          return { success: true, user: authData.user };
        } else {
          return { success: false };
        }
      } else if (response.status === 401) {
        // Session expired or invalid - clear ghost cookies
        this.clearSessionCookies();
        return { success: false };
      } else {
        return { success: false };
      }
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Main session validation logic
   * SCOPE: Session validation business logic only - NO state management
   */
  static async validateSession(options: SessionValidationOptions = {}): Promise<SessionValidationResult> {
    const { skipLoginPage = true, skipDuringLogout = true } = options;

    // Skip auth check on login page - no need to verify what we already know
    if (skipLoginPage && window.location.pathname === '/login') {
      return {
        user: null,
        isValid: false,
        shouldRedirectToLogin: false
      };
    }

    // Check if any session cookies exist before making auth request
    if (!this.hasCookies()) {
      // No session cookies present - user needs to login
      return {
        user: null,
        isValid: false,
        shouldRedirectToLogin: true
      };
    }

    // Validate session with server
    const serverResult = await this.validateWithServer();
    
    return {
      user: serverResult.user || null,
      isValid: serverResult.success,
      shouldRedirectToLogin: !serverResult.success
    };
  }
}