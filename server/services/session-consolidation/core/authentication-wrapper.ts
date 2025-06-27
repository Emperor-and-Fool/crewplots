import { Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: string;
  permissions: string[];
}

export class AuthenticationWrapper {
  static validateAuthentication(req: Request): AuthenticatedUser {
    if (!req.isAuthenticated() || !req.user) {
      throw new Error('Authentication required');
    }
    
    const user = req.user as any;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions || []
    };
  }
  
  static hasPermission(user: AuthenticatedUser, permission: string): boolean {
    return user.permissions.includes(permission);
  }
  
  static hasAnyRole(user: AuthenticatedUser, roles: string[]): boolean {
    return roles.includes(user.role);
  }
}