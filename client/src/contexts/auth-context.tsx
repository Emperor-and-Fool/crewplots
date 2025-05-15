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

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      console.log("Checking authentication status...");
      try {
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/auth/me?_=${cacheBuster}`, {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        console.log("Auth response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("User data:", data);
          
          // If authenticated and user data exists, set the user
          if (data && data.authenticated && data.user) {
            setUser(data.user);
            console.log("User authenticated:", data.user.username);
          } else {
            // Not authenticated or no user data
            console.log("Not authenticated or no user data found");
            setUser(null);
            // Clear any cached queries that might depend on authentication
            queryClient.clear();
          }
        } else {
          console.log("Error response, not authenticated");
          setUser(null);
          // Clear any cached queries that might depend on authentication
          queryClient.clear();
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setUser(null);
        // Clear any cached queries that might depend on authentication
        queryClient.clear();
      } finally {
        console.log("Setting isLoading to false");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [queryClient]);

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

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout", {});
      setUser(null);
      
      // Clear all query caches
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
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