/**
 * Development Types
 * Type definitions for development module components
 */

export interface DevelopmentConfig {
  enableTestMode: boolean;
  debugLevel: 'minimal' | 'verbose' | 'debug';
  experimentalFeatures: string[];
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ExperimentalFeature {
  name: string;
  description: string;
  enabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DevelopmentContext {
  userId: string;
  testMode: boolean;
  experimentalAccess: boolean;
  features: ExperimentalFeature[];
}