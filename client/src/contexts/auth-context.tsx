/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION ARCHITECTURE GUIDE - READ BEFORE MODIFYING
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This context provides PURE STATE MANAGEMENT only. All authentication operations
 * have been migrated to the modular users module for better separation of concerns.
 * 
 * ┌─ MODULAR AUTHENTICATION ARCHITECTURE ──────────────────────────────────────┐
 * │                                                                             │
 * │ AUTH CONTEXT (THIS FILE)          │  USERS MODULE                          │
 * │ ──────────────────────────         │  ─────────────────────────────         │
 * │ • Pure state container             │  • Authentication business logic       │
 * │ • User state management            │  • Login/logout/register operations    │
 * │ • Session validation only          │  • Form handling & validation          │
 * │ • NO business logic                │  • Service layer integration           │
 * │                                    │                                         │
 * │ LOCATION: client/src/contexts/     │  LOCATION: client/src/modules/users/   │
 * │                                    │                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─ HOW TO IMPLEMENT USER AUTHENTICATION ─────────────────────────────────────┐
 * │                                                                             │
 * │ 1. LOGIN FLOW:                                                              │
 * │    Component → useLogin hook → AuthService → AuthContext.setUser()         │
 * │                                                                             │
 * │    Files involved:                                                          │
 * │    • client/src/modules/users/hooks/useLogin.ts                            │
 * │    • client/src/modules/users/services/auth-service.ts                     │
 * │    • client/src/modules/users/components/forms/LoginForm.tsx               │
 * │                                                                             │
 * │ 2. LOGOUT FLOW:                                                             │
 * │    Component → useLogout hook → AuthService → AuthContext.setUser(null)    │
 * │                                                                             │
 * │    Files involved:                                                          │
 * │    • client/src/modules/users/hooks/useLogout.ts                           │
 * │    • client/src/modules/users/services/auth-service.ts                     │
 * │                                                                             │
 * │ 3. REGISTRATION FLOW:                                                       │
 * │    Component → useRegister hook → AuthService → Success redirect           │
 * │                                                                             │
 * │    Files involved:                                                          │
 * │    • client/src/modules/users/hooks/useRegister.ts                         │
 * │    • client/src/modules/users/services/auth-service.ts                     │
 * │    • client/src/modules/users/components/forms/RegistrationForm.tsx        │
 * │                                                                             │
 * │ 4. SESSION MANAGEMENT:                                                      │
 * │    AuthContext → AuthService.validateSession() → Server session check     │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─ AUTHENTICATION SERVICES LOCATION MAP ─────────────────────────────────────┐
 * │                                                                             │
 * │ CORE SERVICES:                                                              │
 * │ • AuthService        : client/src/modules/users/services/auth-service.ts   │
 * │                                                                             │
 * │ AUTHENTICATION HOOKS:                                                       │
 * │ • useLogin          : client/src/modules/users/hooks/useLogin.ts           │
 * │ • useLogout         : client/src/modules/users/hooks/useLogout.ts          │
 * │ • useRegister       : client/src/modules/users/hooks/useRegister.ts        │
 * │ • useAuthSession    : client/src/modules/users/hooks/useAuthSession.ts     │
 * │                                                                             │
 * │ UI COMPONENTS:                                                              │
 * │ • LoginForm         : client/src/modules/users/components/forms/           │
 * │ • RegistrationForm  : client/src/modules/users/components/forms/           │
 * │ • LoginPage         : client/src/modules/users/pages/LoginPage.tsx         │
 * │ • RegistrationPage  : client/src/modules/users/pages/RegistrationPage.tsx  │
 * │                                                                             │
 * │ LAYOUT COMPONENTS:                                                          │
 * │ • AuthPageLayout    : client/src/modules/users/components/layouts/         │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * MIGRATION STATUS: ✅ COMPLETE
 * • All authentication operations moved to users module
 * • Context serves as pure state container only
 * • Clean separation of concerns achieved
 * • Zero business logic in context layer
 */

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
      console.log('🔍 AUTH-CONTEXT: Starting session validation...');
      const userData = await AuthService.validateSession();
      console.log('🔍 AUTH-CONTEXT: Session validation result:', userData);
      setUser(userData);
      setIsLoading(false);
      console.log('🔍 AUTH-CONTEXT: Auth state updated, user:', userData?.username, 'loading:', false);
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
  console.log('🔍 AUTH-CONTEXT: useAuth called, returning:', { user: context.user?.username, isLoading: context.isLoading, isAuthenticated: context.isAuthenticated });
  return context;
};