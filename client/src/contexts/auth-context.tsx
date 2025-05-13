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
    const checkAuth = () => {
      console.log("Checking authentication status...");
      const xhr = new XMLHttpRequest();
      const cacheBuster = new Date().getTime();
      xhr.open("GET", `/api/auth/me?_=${cacheBuster}`, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      xhr.setRequestHeader("Pragma", "no-cache");
      xhr.setRequestHeader("Expires", "0");

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log("Auth response status:", xhr.status);
          
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log("User data:", data);
              
              if (data && data.authenticated && data.user) {
                setUser(data.user);
                console.log("User authenticated:", data.user.username);
              } else {
                console.log("Not authenticated or no user data found");
                setUser(null);
                queryClient.clear();
              }
            } catch (e) {
              console.error("Error parsing authentication response:", e);
              setUser(null);
              queryClient.clear();
            }
          } else {
            console.log("Error response, not authenticated");
            setUser(null);
            queryClient.clear();
          }
          
          console.log("Setting isLoading to false");
          setIsLoading(false);
        }
      };
      
      xhr.onerror = function() {
        console.error("Error checking authentication status");
        setUser(null);
        queryClient.clear();
        setIsLoading(false);
      };
      
      xhr.send();
    };
    
    checkAuth();
  }, [queryClient]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Attempting login...");
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/login", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            console.log("Login response status:", xhr.status);
            
            if (xhr.status === 200) {
              try {
                const responseData = JSON.parse(xhr.responseText);
                console.log("Login response data:", responseData);
                
                // Check auth after successful login
                const verifyXhr = new XMLHttpRequest();
                verifyXhr.open("GET", `/api/auth/me?cacheBuster=${Date.now()}`, true);
                verifyXhr.withCredentials = true;
                verifyXhr.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                verifyXhr.setRequestHeader("Pragma", "no-cache");
                verifyXhr.setRequestHeader("Expires", "0");
                
                verifyXhr.onreadystatechange = function() {
                  if (verifyXhr.readyState === 4) {
                    if (verifyXhr.status === 200) {
                      try {
                        const verifyData = JSON.parse(verifyXhr.responseText);
                        console.log("Session verification:", verifyData);
                        
                        if (verifyData && verifyData.authenticated && verifyData.user) {
                          setUser(verifyData.user);
                          
                          toast({
                            title: "Login successful",
                            description: `Welcome back, ${verifyData.user.name || username}!`,
                          });
                          
                          queryClient.invalidateQueries();
                          
                          resolve(true);
                        } else {
                          console.error("Login succeeded but session verification failed");
                          toast({
                            title: "Login error",
                            description: "Session verification failed. Please try again.",
                            variant: "destructive",
                          });
                          setUser(null);
                          resolve(false);
                        }
                      } catch (e) {
                        console.error("Error parsing verification response:", e);
                        toast({
                          title: "Login error",
                          description: "Error processing verification response. Please try again.",
                          variant: "destructive",
                        });
                        setUser(null);
                        resolve(false);
                      }
                    } else {
                      console.error("Verification request failed, status:", verifyXhr.status);
                      toast({
                        title: "Login error",
                        description: "Session verification failed. Please try again.",
                        variant: "destructive",
                      });
                      setUser(null);
                      resolve(false);
                    }
                  }
                };
                
                verifyXhr.send();
              } catch (e) {
                console.error("Error parsing login response:", e);
                toast({
                  title: "Login error",
                  description: "Error processing login response. Please try again.",
                  variant: "destructive",
                });
                resolve(false);
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                console.error("Login failed:", errorData);
                toast({
                  title: "Login failed",
                  description: errorData.message || "Invalid username or password",
                  variant: "destructive",
                });
              } catch (e) {
                toast({
                  title: "Login failed",
                  description: "Unknown error occurred. Please try again.",
                  variant: "destructive",
                });
              }
              resolve(false);
            }
            
            setIsLoading(false);
          }
        };
        
        xhr.onerror = function() {
          console.error("Network error during login");
          toast({
            title: "Login failed",
            description: "Network error. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          resolve(false);
        };
        
        xhr.send(JSON.stringify({ username, password }));
      });
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
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/logout", true);
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            setUser(null);
            queryClient.clear();
            
            toast({
              title: "Logged out",
              description: "You have been successfully logged out",
            });
            
            setIsLoading(false);
            resolve();
          }
        };
        
        xhr.onerror = function() {
          console.error("Network error during logout");
          setUser(null);
          queryClient.clear();
          
          toast({
            title: "Logout issue",
            description: "There was an issue during logout, but you've been logged out of this session.",
          });
          
          setIsLoading(false);
          resolve();
        };
        
        xhr.send();
      });
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      queryClient.clear();
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/auth/register", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 201) {
              toast({
                title: "Registration successful",
                description: "Your account has been created. You can now login.",
              });
              resolve(true);
            } else {
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
                  description: "Unknown error occurred. Please try again.",
                  variant: "destructive",
                });
              }
              resolve(false);
            }
            
            setIsLoading(false);
          }
        };
        
        xhr.onerror = function() {
          console.error("Network error during registration");
          toast({
            title: "Registration failed",
            description: "Network error. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          resolve(false);
        };
        
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