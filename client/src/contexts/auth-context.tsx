import { createContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Register } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  register: async () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if user is already logged in with retry logic and periodic refresh
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;
    let sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
    
    // Implement a reliable fetch with timeout
    const fetchWithTimeout = async (url: string, options = {}, timeout = 3000) => {
      const controller = new AbortController();
      const { signal } = controller;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal,
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Authentication check with explicit retry logic and exponential backoff
    const checkAuthWithRetry = async (maxRetries = 3, initialDelay = 500, isInitialCheck = false) => {
      if (isInitialCheck) {
        console.log("Starting authentication check with retry logic");
      }
      
      let retries = 0;
      let delay = initialDelay;
      
      // Start loading state only for initial check
      if (isInitialCheck && isMounted) setIsLoading(true);
      
      while (retries <= maxRetries) {
        try {
          // Add cache-busting parameter
          const cacheBuster = new Date().getTime();
          const response = await fetchWithTimeout(`/api/auth/me?_=${cacheBuster}`, {}, 3000); 
          
          if (isInitialCheck) {
            console.log(`Auth response (attempt ${retries + 1}/${maxRetries + 1}):`, response.status);
          }
          
          if (response.ok) {
            const data = await response.json();
            
            if (isInitialCheck) {
              console.log("User data received:", data);
            }
            
            if (data && data.authenticated && data.user) {
              if (isMounted) {
                setUser(data.user);
                if (isInitialCheck) {
                  setIsLoading(false);
                  console.log("Auth successful, user:", data.user.username);
                }
              }
              // Success - exit the retry loop
              return true;
            } else {
              if (isInitialCheck) {
                console.log("Not authenticated or no user data");
              } else if (user) {
                // If this is a refresh check and we were previously authenticated,
                // but now we're not, log the session expiry
                console.warn("Session expired or user logged out on server");
              }
              
              if (isMounted) {
                setUser(null);
                queryClient.clear();
              }
              // No need to retry - we got a valid response indicating not authenticated
              return false;
            }
          } else {
            // Server responded with error - may need to retry
            if (isInitialCheck) {
              console.warn(`Auth check failed with status ${response.status}, retrying...`);
            }
          }
        } catch (error: any) {
          // Request failed - abort or retry
          if (error?.name === 'AbortError') {
            if (isInitialCheck) {
              console.warn(`Auth check timed out (attempt ${retries + 1}/${maxRetries + 1})`);
            }
          } else {
            if (isInitialCheck) {
              console.error(`Auth check error (attempt ${retries + 1}/${maxRetries + 1}):`, error);
            } else {
              console.error("Session refresh check error:", error);
            }
          }
        }
        
        // If this was the last retry, set not authenticated
        if (retries >= maxRetries) {
          if (isInitialCheck) {
            console.warn("Max retries reached, setting not authenticated");
          }
          
          if (isMounted) {
            setUser(null);
            queryClient.clear();
          }
          return false;
        }
        
        // Increment retry counter and delay for next attempt
        retries++;
        
        // Wait with exponential backoff before retrying
        if (isInitialCheck) {
          console.log(`Waiting ${delay}ms before retry ${retries}/${maxRetries}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff with jitter to avoid thundering herd
        delay = Math.min(delay * 1.5, 5000) * (0.9 + Math.random() * 0.2);
      }
      
      // Ensure loading state is updated when done with all retries
      if (isInitialCheck && isMounted) {
        console.log("Setting isLoading to false after all retries");
        setIsLoading(false);
      }
      
      return false;
    };

    // Start the initial authentication check process
    checkAuthWithRetry(3, 500, true).then((authenticated) => {
      // Set up periodic session check if authenticated
      if (authenticated && isMounted) {
        // Check session every 2 minutes to detect server-side expiration
        sessionCheckInterval = setInterval(() => {
          // No logging for periodic checks unless there's a change in status
          checkAuthWithRetry(1, 1000, false);
        }, 2 * 60 * 1000); // 2 minutes
      }
    });
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [queryClient, user]);

  // Login function using URLSearchParams for reliable authentication
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Attempting to log in with URLSearchParams approach:", username);
      
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
        
        console.log("Login response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Login successful, user data:", data.user);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};