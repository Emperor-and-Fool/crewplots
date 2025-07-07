import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Register } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { hasAdminBypass } from "@shared/utils/permissions";
import { useLocation } from "wouter";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: Register) => Promise<boolean>;
  refreshAuth: () => Promise<boolean>;
};

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Compute derived state
  const isAuthenticated = Boolean(user);
  const isSuperuser = hasAdminBypass(user);

  // Session validation with proper dependencies
  useEffect(() => {
    // Skip auth check on login page and during logout
    if (location === '/login' || isLoggingOut) {
      setIsLoading(false);
      return;
    }

    // Skip auth check if no cookies present to avoid empty session creation
    const hasCookies = document.cookie.includes('connect.sid') || 
                      document.cookie.includes('session') ||
                      document.cookie.length > 0;

    if (!hasCookies) {
      console.log('🔒 No session cookies found - redirecting to login');
      setUser(null);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Use traditional auth endpoint for session validation
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const authData = await response.json();
          // Traditional auth response structure: { authenticated, user }
          if (authData?.authenticated && authData.user) {
            setUser(authData.user);
          } else {
            setUser(null);
          }
        } else if (response.status === 401) {
          // Session expired or invalid - clear state and allow redirect to login
          console.log('🔒 Session invalid - clearing auth state');
          setUser(null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log('🔒 Auth check failed - clearing auth state');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location, isLoggingOut]); // Fixed dependencies

  // Login function using URLSearchParams for reliable authentication
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Use URLSearchParams for reliable form data submission
      const urlencoded = new URLSearchParams();
      urlencoded.append('username', username);
      urlencoded.append('password', password);
      
      // Use fetch with proper content type
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded.toString(),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.user) {
          setUser(data.user);
          
          // Show success toast
          toast({
            title: "Login successful",
            description: `Welcome back, ${data.user?.name || username}!`,
          });
          
          // Invalidate all queries to ensure fresh data
          queryClient.invalidateQueries();
          return true;
        } else {
          console.error("Login response missing user data:", data);
          toast({
            title: "Login failed",
            description: "Authentication successful but user data unavailable",
            variant: "destructive",
          });
          return false;
        }
      } else {
        console.error("Login failed with status:", response.status);
        try {
          const errorData = await response.json();
          toast({
            title: "Login failed",
            description: errorData.message || "Invalid username or password",
            variant: "destructive",
          });
        } catch (e) {
          toast({
            title: "Login failed",
            description: "An unexpected error occurred",
            variant: "destructive",
          });
        }
        return false;
      }
    } catch (fetchError) {
      console.error("Login fetch error:", fetchError);
      toast({
        title: "Connection error",
        description: "Could not connect to the server. Please check your network connection.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast]);

  // Optimistic logout function with proper flag reset
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoggingOut(true);
      
      // Phase 1: Immediate optimistic logout
      setUser(null);
      queryClient.clear();
      
      // Set logout success flag for login page
      sessionStorage.setItem('logout-success', 'true');
      
      // Navigate immediately to login page using React router
      setLocation('/login');
      
      // Phase 2: Background server cleanup
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        // Silent failure - user is already logged out locally
        console.log('Background logout cleanup failed (non-critical):', error);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Logout Error",
        description: "Failed to logout properly. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false); // FIXED: Reset logout flag
    }
  }, [queryClient, setLocation, toast]);

  // Register function
  const register = useCallback(async (userData: Register): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Return a Promise to handle asynchronous XMLHttpRequest
      return new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/register", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            setIsLoading(false);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              // Registration successful
              toast({
                title: "Registration successful",
                description: "Your account has been created. You can now login.",
              });
              resolve(true);
            } else {
              // Registration failed
              try {
                const errorData = JSON.parse(xhr.responseText);
                toast({
                  title: "Registration failed",
                  description: errorData.message || "Unable to create account",
                  variant: "destructive",
                });
              } catch (e) {
                toast({
                  title: "Registration failed",
                  description: "An unexpected error occurred. Please try again.",
                  variant: "destructive",
                });
              }
              resolve(false);
            }
          }
        };
        
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
        
        // Send the request
        xhr.send(JSON.stringify(userData));
      });
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  }, [toast]);

  // Refresh auth function
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Use ValidationEngine30 auth endpoint - same as initial auth check
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
          setUser(authData.user);
          return true;
        } else {
          setUser(null);
          return false;
        }
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Error refreshing authentication:", error);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    isSuperuser,
    login,
    logout,
    register,
    refreshAuth,
  };
};
