// CHECK BEFORE MODIFYING CODE HERE  
// 
import { AuthService } from '@/modules/users/services/auth-service';
import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;  // Missing - hooks need this
  isLoading: boolean;
  isAuthenticated: boolean;
  // Remove: isSuperuser, login, logout, register, refreshAuth
};

// Missing AuthContext definition
export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
  isAuthenticated: false,
});

// Missing AuthProvider implementation  
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ADD THIS useEffect HERE:
  useEffect(() => {
    // Skip auth check on login page
    if (window.location.pathname === '/login') {
      setIsLoading(false);
      return;
    }
    const initializeAuth = async () => {
      const userData = await AuthService.validateSession();
      setUser(userData);
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const isAuthenticated = Boolean(user);
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        isAuthenticated,
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