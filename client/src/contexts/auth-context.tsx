// CHECK BEFORE MODIFYING CODE HERE  
// Imports:
// [ - @tanstack/react-query, @/lib/queryClient, @shared/schema, @/hooks/use-toast, @shared/utils/permissions, wouter, @/client/src/modules/locations/LocationsContext]
// Exports:
// [ - AuthContext, AuthProvider, useAuth]

import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Register } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { hasAdminBypass } from "@shared/utils/permissions";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
  refreshAuth: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isSuperuser: false,
  login: async () => false,
  logout: async () => {},
  register: async () => false,
  refreshAuth: async () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Compute isAuthenticated from user state
  const isAuthenticated = Boolean(user);
  
  // Compute superuser status
  const isSuperuser = hasAdminBypass(user);

  // Session validation with graceful fallback for clean session states
  useEffect(() => {
    // Skip auth check on login page - no need to verify what we already know
    if (window.location.pathname === '/login') {
      setIsLoading(false);
      return;
    }

    // Skip auth check if we're in the middle of logging out
    if (isLoggingOut) {
      return;
    }

    // Check if any session cookies exist before making auth request
    const hasCookies = document.cookie.includes('connect.sid') || 
                      document.cookie.includes('session') ||
                      document.cookie.length > 0;

    if (!hasCookies) {
      // No session cookies present - user needs to login
      console.log('🔒 No session cookies found - redirecting to login');
      setUser(null);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
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
            setUser(authData.user);
          } else {
            setUser(null);
          }
        } else if (response.status === 401) {
          // Session expired or invalid - clear ghost cookies and redirect to login
          console.log('🔒 Session invalid - clearing ghost cookies and auth state');
          document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          setUser(null);
          setLocation('/login');
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
  }, [isLoggingOut]); // Add dependency array to prevent infinite loops

  // Login function using URLSearchParams for reliable authentication
  /* COMMENTED OUT FOR TESTING
  const login = async (username: string, password: string): Promise<any> => {
    try {
      setIsLoading(true);

      
      // Use URLSearchParams for reliable form data submission
      const urlencoded = new URLSearchParams();
      urlencoded.append('username', username);
      urlencoded.append('password', password);
      
      // Use fetch with proper content type
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: urlencoded.toString(),
          credentials: 'include', // Important for cookies
        });

        
        if (response.ok) {
          const data = await response.json();

          // 🔍 DEBUG: Log complete data structure
          console.log("🔍 DATA DEBUG: Complete response data:", data);
          console.log("🔍 DATA DEBUG: data exists:", !!data);
          console.log("🔍 DATA DEBUG: data.user exists:", !!(data && data.user));
          console.log("🔍 DATA DEBUG: data.user value:", data?.user);
          console.log("🔍 DATA DEBUG: typeof data:", typeof data);
          console.log("🔍 DATA DEBUG: typeof data.user:", typeof data?.user);
          
          if (data && data.user) {
            console.log("🔍 DATA DEBUG: CONDITION PASSED - Setting user");
            setUser(data.user);
            
            // Invalidate all queries to ensure fresh data
            queryClient.invalidateQueries();
            setIsLoading(false);
            return data;
          } else {
            console.log("🔍 DATA DEBUG: CONDITION FAILED - Returning false");
            console.error("Login response missing user data:", data);
            setIsLoading(false);
            return false;
          }
        } else {
          console.error("Login failed with status:", response.status);
          try {
            const errorData = await response.json();
            // Return error data for page-level handling
            setIsLoading(false);
            return { error: errorData.message || "Login failed" };
          } catch (e) {
            setIsLoading(false);
            return { error: "An unexpected error occurred" };
          }
        }
      } catch (fetchError) {
        console.error("Login fetch error:", fetchError);
        setIsLoading(false);
        return { error: "Could not connect to the server. Please check your network connection." };
      }
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      return { error: "An unexpected error occurred. Please try again." };
    }
  };
  */

  // Optimistic logout function - immediate UI response with background cleanup
  const logout = async (): Promise<void> => {
    // Phase 1: Immediate optimistic logout
    setUser(null);
    setIsLoading(false);
    queryClient.clear();
    
    // Set logout success flag for login page
    sessionStorage.setItem('logout-success', 'true');
    
    // Navigate immediately to login page using React router (preserves context)
    setLocation('/login');
    
    // Phase 2: Background server cleanup (fire and forget)
    backgroundSessionCleanup();
  };

  // Background session cleanup - relies on server Set-Cookie headers only
  const backgroundSessionCleanup = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      // Server handles cookie deletion via Set-Cookie headers with Max-Age=0
      // No manual cookie manipulation needed - HttpOnly cookies cannot be cleared by JS
      console.log('🔴 Frontend: Server logout completed, cookies cleared by Set-Cookie headers');
    } catch (error) {
      // Silent failure - user is already logged out locally
      console.log('🔴 Frontend: Logout request failed, but user locally logged out');
    }
  };

  // Register function
  const register = async (userData: Register): Promise<boolean> => {
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
                console.error("Error parsing registration error response:", e);
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
  };

  // Optimized refreshAuth function using React Query for deduplication
  const refreshAuth = async (): Promise<boolean> => {

    setIsLoading(true);
    
    try {
      // Use ValidationEngine30 auth endpoint 
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
          setIsLoading(false);
          return true;
        } else {
          setUser(null);
          setIsLoading(false);
          return false;
        }
      } else {
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error refreshing authentication:", error);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isSuperuser,
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

// Export useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};