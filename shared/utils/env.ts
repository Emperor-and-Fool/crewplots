/**
 * Environment Detection Utilities
 * Provides consistent environment checking across frontend and backend
 */

export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isDocker = (): boolean => !!process.env.DOCKER_CONTAINER;
export const isForceEnableAllowed = (): boolean => !isDocker() && isDevelopment();

// Debug information for troubleshooting
export const getEnvironmentInfo = () => ({
  nodeEnv: process.env.NODE_ENV,
  isDocker: isDocker(),
  forceEnableAllowed: isForceEnableAllowed(),
  timestamp: new Date().toISOString()
});