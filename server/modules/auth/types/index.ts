// Auth module type definitions for route categorization
// These types support the planned auth route categorization

export interface AuthGlobalRoutes {
  register: '/register';
  login: '/login';
  user: '/user';
  loginSession: '/login-session';
  logout: '/logout';
  changePassword: '/change-password';
}

export interface AuthAdminRoutes {
  clearSessions: '/clear-sessions';
  clearAllSessions: '/clear-all-sessions';
}

export interface AuthDevelopmentRoutes {
  devLogout: '/dev-logout';
  autologin: '/autologin';
  devLogin: '/dev-login';
}

// Combined auth route structure
export interface AuthRouteStructure {
  global: AuthGlobalRoutes;
  admin: AuthAdminRoutes;
  development: AuthDevelopmentRoutes;
}

// Export individual route types for type safety
export type AuthRouteCategory = 'global' | 'admin' | 'development';

// Route handler type definitions
export interface AuthRouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  middleware?: string[];
  handler: Function;
}

// Future integration preparation
export interface AuthModuleConfig {
  enableGlobal: boolean;
  enableAdmin: boolean;
  enableDevelopment: boolean;
}