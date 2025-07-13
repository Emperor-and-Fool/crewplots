import { LoginResponse } from "@/contexts/auth-context";

/**
 * Authentication Form Service
 * 
 * Service layer for handling authentication form operations.
 * Provides clean separation between form logic and network operations.
 */
export class AuthFormService {
  /**
   * Performs login request with form data
   */
  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  /**
   * Performs registration request with form data
   */
  static async register(userData: any): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Registration service error:', error);
      throw error;
    }
  }
}