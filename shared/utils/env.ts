/**
 * Environment Detection Utilities
 * Provides consistent environment checking across frontend and backend
 * Browser-safe: Uses import.meta.env for frontend, process.env for backend
 */

// Browser-safe environment access
const getEnv = (key: string): string | undefined => {
  // Frontend: Vite provides import.meta.env
  if (typeof window !== 'undefined' && import.meta?.env) {
    return import.meta.env[key];
  }
  // Backend: Node.js provides process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

export const isDevelopment = (): boolean => getEnv('NODE_ENV') === 'development';
export const isProduction = (): boolean => getEnv('NODE_ENV') === 'production';
export const isDocker = (): boolean => !!getEnv('DOCKER_CONTAINER');
export const isForceEnableAllowed = (): boolean => !isDocker() && isDevelopment();

// Debug information for troubleshooting
export const getEnvironmentInfo = () => ({
  nodeEnv: getEnv('NODE_ENV'),
  isDocker: isDocker(),
  forceEnableAllowed: isForceEnableAllowed(),
  timestamp: new Date().toISOString(),
  context: typeof window !== 'undefined' ? 'frontend' : 'backend'
});