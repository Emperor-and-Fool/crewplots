import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Register } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { hasAdminBypass } from "@shared/utils/permissions";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Compute isAuthenticated from user state
  const isAuthenticated = Boolean(user);
  
  // Compute superuser status
  const isSuperuser = hasAdminBypass(user);

  // Use session consolidation pattern to resolve browser context session isolation
  // This bridges the gap between frontend session (9HbafBUU...) and working backend session (vYD0dYtt...)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Skip auth check if no cookies exist (means no login has occurred)
        // This prevents creating empty sessions before authentication
        const currentCookies = document.cookie;
        console.log('🍪 AUTH DEBUG: Current cookies check:', {
          cookiesExist: !!currentCookies,
          cookiesLength: currentCookies?.length || 0,
          hasConnectSid: currentCookies?.includes('connect.sid'),
          fullCookieString: currentCookies,
          timestamp: new Date().toISOString()
        });
        
        if (!currentCookies || currentCookies.trim() === '' || !currentCookies.includes('connect.sid')) {
          console.log('🚪 AUTH DEBUG: No session cookies found, setting user to logged out');
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Primary: Try auth consolidation endpoint that uses working session
        // Use a longer timeout to prevent session isolation issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/auth-consolidation', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('🔍 CLIENT AUTH RESPONSE:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
          const authData = await response.json();
          if (authData?.authenticated && authData.user) {
            setUser(authData.user);
          } else {
            // Fallback: Try direct auth endpoint
            const fallbackResponse = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (fallbackData?.authenticated && fallbackData.user) {
                setUser(fallbackData.user);
              } else {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function using URLSearchParams for reliable authentication
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("🔍 CLIENT LOGIN DEBUG: Starting login for:", username);
      console.log("🔍 CLIENT COOKIES BEFORE LOGIN:", document.cookie);
      
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
          credentials: 'include' // Important for cookies
        });
        
        console.log("🔍 CLIENT LOGIN RESPONSE:", {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
        console.log("🔍 CLIENT COOKIES AFTER LOGIN:", document.cookie);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Login successful, result:", data);
          
          if (data && data.user) {
            setUser(data.user);
            
            // Show success toast
            toast({
              title: "Login successful",
              description: `Welcome back, ${data.user?.name || username}!`,
            });
            
            // Invalidate all queries to ensure fresh data
            queryClient.invalidateQueries();
            setIsLoading(false);
            return true;
          } else {
            console.error("Login response missing user data:", data);
            toast({
              title: "Login failed",
              description: "Authentication successful but user data unavailable",
              variant: "destructive",
            });
            setIsLoading(false);
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
          setIsLoading(false);
          return false;
        }
      } catch (fetchError) {
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

  // Logout function with better error handling
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Use fetch directly with appropriate error handling
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        
        // Clear all query caches
        queryClient.clear();
        
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      } else {
        console.error("Logout failed with status:", response.status);
        toast({
          title: "Logout failed",
          description: "An error occurred during logout. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: Register): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Registration data:", JSON.stringify(userData, (key, value) => 
        key === 'password' ? '********' : value
      ));
      
      // Return a Promise to handle asynchronous XMLHttpRequest
      return new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/register", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
          console.log(`Registration XHR state change: readyState=${xhr.readyState}, status=${xhr.status}`);
          
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
    console.log("Refreshing authentication state");
    setIsLoading(true);
    
    try {
      // Use standard fetch without cache-busting to allow proper caching
      const response = await fetch('/api/auth/me', {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.authenticated && data.user) {
          setUser(data.user);
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