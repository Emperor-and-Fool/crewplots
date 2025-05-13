import { createContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
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

  // Login function - direct form submission to ensure cookie handling
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Attempting to log in with:", username);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      console.log("Login response status:", response.status);
      const responseData = await response.json();
      console.log("Login response data:", responseData);
      
      if (!response.ok) {
        console.error("Login failed:", responseData);
        toast({
          title: "Login failed",
          description: responseData.message || "Invalid username or password",
          variant: "destructive",
        });
        return false;
      }

      // Verify session with a follow-up request
      try {
        console.log("Verifying session after login...");
        const verifyResponse = await fetch(`/api/auth/me?cacheBuster=${Date.now()}`, {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        const verifyData = await verifyResponse.json();
        console.log("Session verification:", verifyData);
        
        if (verifyData && verifyData.authenticated && verifyData.user) {
          // Set the user in state
          setUser(verifyData.user);
          
          // Show success toast
          toast({
            title: "Login successful",
            description: `Welcome back, ${verifyData.user.name || username}!`,
          });
          
          // Invalidate all queries to ensure fresh data
          await queryClient.invalidateQueries();
          
          return true;
        } else {
          console.error("Login succeeded but session verification failed");
          toast({
            title: "Login error",
            description: "Session verification failed. Please try again.",
            variant: "destructive",
          });
          setUser(null);
          return false;
        }
      } catch (verifyErr) {
        console.error("Error verifying session:", verifyErr);
        toast({
          title: "Login error",
          description: "Session verification failed. Please try again.",
          variant: "destructive",
        });
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
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
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Registration failed",
          description: errorData.message || "Unable to create account",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Registration successful",
        description: "Your account has been created. You can now login.",
      });
      
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
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