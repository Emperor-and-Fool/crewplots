/**
 * Development Package Registry - External registry for development packages
 * Plan 058: Traffic isolation strategy - separate email operations from core app validation
 * 
 * PURPOSE:
 * - Register development-specific validation packages
 * - Enable route re-registration without touching ValidationEngine30.ts
 * - Provide traffic isolation for resource-intensive email operations
 * 
 * PATTERN:
 * - Import existing ValidationEngine30 exports (engine + registry + type)
 * - Add development packages to separate registry
 * - Export combined registry for development routes
 */

import { validationEngine30, packageRegistry as productionRegistry, ValidationEngine30Type } from '../../../services/validation/ValidationEngine30';
import { emailTestPackage } from './packages/emailTestPackage';

/**
 * Development Package Registry - extends production registry with dev-specific packages
 */
export const developmentPackageRegistry = {
  // Include all production packages
  ...productionRegistry,
  
  // Add development-specific packages
  emailTest: emailTestPackage,
  
  // Future development packages can be added here
  // debugPackage: debugPackage,
  // performanceTestPackage: performanceTestPackage,
};

/**
 * Development ValidationEngine30 instance - same engine, extended registry
 */
export const developmentValidationEngine = validationEngine30;

/**
 * Type export for development usage
 */
export type DevelopmentValidationEngine30Type = ValidationEngine30Type;

/**
 * Registry access for external development route registration
 */
export { developmentPackageRegistry as devPackageRegistry };