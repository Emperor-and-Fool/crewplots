/**
 * Development Module
 * Centralized development utilities and experimental endpoints
 * 
 * This module provides:
 * - Structured development endpoints following VE30 patterns
 * - Staging area for uncertain/experimental routes
 * - Testing utilities and debugging tools
 * - Clean separation from production code
 * 
 * Usage: Comment out this import to test production readiness
 */

export { developmentRoutes } from './routes';
export { developmentValidationEngine } from './validation/DevelopmentValidationEngine';
export { developmentScripts } from './scripts';