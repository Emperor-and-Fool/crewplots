/**
 * Authentication Context Module
 * 
 * This module provides the authentication context for the entire application.
 * It manages user authentication state, login/logout operations, and session handling.
 * 
 * Key Features:
 * - React Context API for global authentication state
 * - Comprehensive error handling and timeout management
 * - Toast notifications for user feedback
 * - Cache-busting and request optimization
 */

import { createContext, useState, useEffect, ReactNode, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Register } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

/**
 * Authentication Context Type Definition
 * 
 * Defines the shape of the authentication context with all available methods
 * and state properties for use throughout the application.
 */
type AuthContextType = {
  user: User | null;                                            // Current user data or null if not authenticated
  isLoading: boolean;                                           // Loading state for auth operations
  isAuthenticated: boolean;                                     // Whether user is authenticated
  login: (username: string, password: string) => Promise<boolean>; // Login function
  logout: () => Promise<void>;                                  // Logout function
  register: (userData: any) => Promise<boolean>;                // Registration function
  refreshAuth: () => Promise<boolean>;                          // Manual auth refresh function
};

/**
 * Authentication Context default values
 * 
 * These default values are used before the provider is initialized.
 * Each method returns a sensible default.
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => false,
  logout: async () => {},
  register: async () => false,
  refreshAuth: async () => false,
});

/**
 * Authentication Provider Component
 * 
 * This component wraps the application to provide authentication context
 * and functionality to all child components.
 * 
 * @param children - Child components that will have access to auth context
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Query client for cache management
  const queryClient = useQueryClient();
  
  // Toast notifications for user feedback
  const { toast } = useToast();

  /**
   * Initial Authentication Check
   * 
   * Performed once when component mounts to check if the user is already
   * authenticated from a previous session. Uses AbortController for
   * timeout management to prevent infinite loading states.
   */
  useEffect(() => {
    const checkAuth = async () => {
      console.time("auth:client-total");
      console.log("Checking authentication status...");
      
      // Set up timeout to avoid infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      console.timeLog("auth:client-total", "setup complete, before fetch");
      
      try {
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/auth/me?_=${cacheBuster}`, {
          credentials: "include",            // Include cookies for authentication
          signal: controller.signal,         // For timeout cancellation
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        console.log("Auth response status:", response.status);
        console.timeLog("auth:client-total", "response received");
        
        if (response.ok) {
          const data = await response.json();
          console.timeLog("auth:client-total", "response parsed");
          console.log("User data:", data);
          
          // If authenticated and user data exists, set the user
          if (data && data.authenticated && data.user) {
            console.timeLog("auth:client-total", "before setState");
            setUser(data.user);
            setIsAuthenticated(true);
            console.log("User authenticated:", data.user.username);
            console.timeLog("auth:client-total", "after setState");
          } else {
            // Not authenticated or no user data - clear state
            console.log("Not authenticated or no user data found");
            setUser(null);
            setIsAuthenticated(false);
            // Clear any cached queries that might depend on authentication
            queryClient.clear();
            console.timeLog("auth:client-total", "after clearing state (not authenticated)");
          }
        } else {
          // Error response handling
          console.log("Error response, not authenticated");
          setUser(null);
          setIsAuthenticated(false);
          // Clear any cached queries that might depend on authentication
          queryClient.clear();
        }
      } catch (error: any) {
        // Clear the timeout if there was an error
        clearTimeout(timeoutId);
        
        // Special handling for timeout errors
        if (error?.name === 'AbortError') {
          console.error("Authentication request timed out after 5 seconds");
        } else {
          console.error("Error checking authentication status:", error);
        }
        
        // Reset authentication state on error
        setUser(null);
        setIsAuthenticated(false);
        // Clear any cached queries that might depend on authentication
        queryClient.clear();
      } finally {
        // Always ensure loading state is reset
        console.log("Setting isLoading to false");
        setIsLoading(false);
        console.timeEnd("auth:client-total");
      }
    };

    // Execute the authentication check when component mounts
    checkAuth();
  }, [queryClient]);

  /**
   * Login Function
   * 
   * Handles user login by sending credentials to the server.
   * Uses URLSearchParams for proper form data submission to
   * ensure compatibility with Passport.js authentication.
   * 
   * @param username - The username to login with
   * @param password - The password for authentication
   * @returns Promise resolving to true if login successful, false otherwise
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Attempting to log in with URLSearchParams approach:", username);
      
      // Use URLSearchParams for reliable form data submission
      // This works best with Passport.js's default authentication middleware
      const urlencoded = new URLSearchParams();
      urlencoded.append('username', username);
      urlencoded.append('password', password);
      
      // Use fetch with proper content type for form submission
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: urlencoded.toString(),
          credentials: 'include' // Important for cookies
        });
        
        console.log("Login response status:", response.status);
        
        if (response.ok) {
          // Login successful - update auth state
          const data = await response.json();
          console.log("Login successful, user data:", data.user);
          setUser(data.user);
          setIsAuthenticated(true);
          
          // Show success toast notification
          toast({
            title: "Login successful",
            description: `Welcome back, ${data.user?.name || username}!`,
          });
          
          // Invalidate all queries to ensure fresh data after login
          queryClient.invalidateQueries();
          setIsLoading(false);
          return true;
        } else {
          // Login failed - show error message
          console.error("Login failed with status:", response.status);
          try {
            const errorData = await response.json();
            toast({
              title: "Login failed",
              description: errorData.message || "Invalid username or password",
              variant: "destructive",
            });
          } catch (e) {
            // Handle case where response isn't valid JSON
            toast({
              title: "Login failed",
              description: "An unexpected error occurred",
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return false;
        }
      } catch (fetchError) {
        // Network error handling
        console.error("Login fetch error:", fetchError);
        toast({
          title: "Connection error",
          description: "Could not connect to the server. Please check your network connection.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      // General error handling
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Logout Function
   * 
   * Handles user logout by calling the server's logout endpoint
   * and clearing local authentication state.
   * 
   * @returns Promise that resolves when logout is complete
   */
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call server logout endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Include cookies for session identification
      });
      
      if (response.ok) {
        // Logout successful - clear auth state
        setUser(null);
        setIsAuthenticated(false);
        
        // Clear all query caches to prevent showing stale authenticated data
        queryClient.clear();
        
        // Show success notification
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        
        // Redirect to login page after a short delay
        // This gives time for state updates and toast to be visible
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      } else {
        // Logout failed - show error
        console.error("Logout failed with status:", response.status);
        toast({
          title: "Logout failed",
          description: "An error occurred during logout. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Network or other error handling
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always ensure loading state is reset
      setIsLoading(false);
    }
  };

  /**
   * Registration Function
   * 
   * Handles user registration by sending user data to the server.
   * Uses XMLHttpRequest for better compatibility with complex form data.
   * 
   * @param userData - Registration form data including username, password, etc.
   * @returns Promise resolving to true if registration successful, false otherwise
   */
  const register = async (userData: Register): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Log registration data with password masked for security
      console.log("Registration data:", JSON.stringify(userData, (key, value) => 
        key === 'password' ? '********' : value
      ));
      
      // Return a Promise to handle asynchronous XMLHttpRequest
      return new Promise<boolean>((resolve) => {
        // Use XMLHttpRequest for registration as it handles certain edge cases better
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/register", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true; // Include cookies
        
        // Handle state changes
        xhr.onreadystatechange = function() {
          console.log(`Registration XHR state change: readyState=${xhr.readyState}, status=${xhr.status}`);
          
          // readyState 4 means request is complete
          if (xhr.readyState === 4) {
            setIsLoading(false);
            
            // Status 2xx means success
            if (xhr.status >= 200 && xhr.status < 300) {
              // Registration successful - show success message
              toast({
                title: "Registration successful",
                description: "Your account has been created. You can now login.",
              });
              resolve(true);
            } else {
              // Registration failed - parse and show error
              try {
                const errorData = JSON.parse(xhr.responseText);
                toast({
                  title: "Registration failed",
                  description: errorData.message || "Unable to create account",
                  variant: "destructive",
                });
              } catch (e) {
                // Handle case where response isn't valid JSON
                toast({
                  title: "Registration failed",
                  description: "An unexpected error occurred. Please try again.",
                  variant: "destructive",
                });
                console.error("Error parsing registration error response:", e);
              }
              resolve(false);
            }
          }
        };
        
        // Network error handler
        xhr.onerror = function() {
          console.error("Registration request failed");
          toast({
            title: "Registration failed",
            description: "Network error. Please check your connection and try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          resolve(false);
        };
        
        // Send the registration request
        xhr.send(JSON.stringify(userData));
      });
    } catch (error) {
      // General error handling
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Authentication Refresh Function
   * 
   * Manually rechecks authentication status with the server.
   * Used when authentication state may have changed but the user
   * hasn't navigated or performed a full page refresh.
   * 
   * @returns Promise resolving to true if authenticated, false otherwise
   */
  const refreshAuth = async (): Promise<boolean> => {
    console.log("Manually refreshing authentication state");
    setIsLoading(true);
    
    try {
      // Add cache-busting parameter to prevent browser caching
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/auth/me?_=${cacheBuster}`, {
        credentials: "include", // Include cookies
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update authentication state based on response
        if (data && data.authenticated && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          setIsLoading(false);
          return true;
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return false;
        }
      } else {
        // Error response - clear auth state
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      // Network or other error - clear auth state
      console.error("Error refreshing authentication:", error);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  };

  // Provide all auth functionality to child components
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        register,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};