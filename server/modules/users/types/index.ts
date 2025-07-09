/**
 * User Module Types
 * Server-side type definitions for user module
 */

export interface UserModuleConfig {
  enableCache: boolean;
  cacheTimeout: number;
  enableAggregation: boolean;
}

export interface UserServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    source: 'cache' | 'database' | 'aggregation';
    timestamp: Date;
  };
}

export interface UserQueryOptions {
  role?: string;
  status?: string;
  locationId?: number;
  includePermissions?: boolean;
  useCache?: boolean;
}