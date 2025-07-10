import { insertScheduleBlockSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

/**
 * Schedule Block Validation Package - Operation-Aware Schema Validation
 * Manually configured VE30Package with custom schema validation logic
 * Fixes list operation validation by skipping schema validation for read/list operations
 */

export interface ScheduleBlockData {
  id?: number;
  name: string;
  description?: string;
  locationId: number;
  isActive: boolean;
  createdBy?: number;
}

// Business rules for schedule blocks (operation-agnostic)
const scheduleBlockBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation
    if (data.name && data.name.trim().length === 0) {
      errors.push('Schedule block name cannot be empty');
    } else if (data.name && data.name.length > 100) {
      errors.push('Schedule block name must be 100 characters or less');
    }

    // Location validation
    if (data.locationId && (typeof data.locationId !== 'number' || data.locationId <= 0)) {
      errors.push('Valid location ID is required');
    }

    // Description validation
    if (data.description && data.description.length > 500) {
      warnings.push('Description is quite long - consider being more concise');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation
    if (context?.user && context.operation !== 'list' && context.operation !== 'read') {
      // Active status validation
      if (data.hasOwnProperty('isActive') && typeof data.isActive !== 'boolean') {
        errors.push('Active status must be true or false');
      }
    }

    return { warnings, errors };
  }
];

// Custom assembly function for schedule blocks
const scheduleBlockAssembly = (rawData: any, user: any, operation: string) => {
  return {
    name: rawData.name?.trim(),
    description: rawData.description?.trim() || null,
    locationId: parseInt(rawData.locationId) || rawData.locationId,
    isActive: Boolean(rawData.isActive),
    createdBy: user?.id || rawData.createdBy,
    // Include ID for update operations
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// Manual VE30Package configuration with operation-aware schema validation
export const scheduleBlockPackage: VE30Package = {
  entityType: 'scheduleBlock',
  
  // Operation-aware schema validation - skip validation for list/read operations
  validateSchema: (data: any, operation: string) => {
    // Skip schema validation for list and read operations
    if (operation === 'list' || operation === 'read') {
      return { isValid: true, errors: [] };
    }
    // Apply full schema validation for create/update/delete operations
    return VE30PackageBuilder.validateSchema(data, operation, insertScheduleBlockSchema);
  },
  
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'scheduleBlock'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, scheduleBlockBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, scheduleBlockAssembly)
};

export type ScheduleBlockPackage = typeof scheduleBlockPackage;