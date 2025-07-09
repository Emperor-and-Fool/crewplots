import { insertScheduleBlockSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

/**
 * Schedule Block Validation Package - VE30PackageBuilder Standard
 * Converted from function-based implementation to VE30PackageBuilder configuration
 */

export interface ScheduleBlockData {
  id?: number;
  name: string;
  description?: string;
  locationId: number;
  isActive: boolean;
  createdBy?: number;
}

// Business rules for schedule blocks
const scheduleBlockBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Schedule block name is required');
    } else if (data.name.length > 100) {
      errors.push('Schedule block name must be 100 characters or less');
    }

    // Location validation
    if (!data.locationId || typeof data.locationId !== 'number' || data.locationId <= 0) {
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

    // User permission validation
    if (!context?.user) {
      errors.push('User context required for schedule block operations');
      return { warnings, errors };
    }

    // Active status validation
    if (typeof data.isActive !== 'boolean') {
      errors.push('Active status must be true or false');
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

// VE30PackageBuilder-based package (STANDARDIZED from working function-based)
export const scheduleBlockPackage: VE30Package = {
  entityType: 'scheduleBlock',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, insertScheduleBlockSchema),
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'scheduleBlock'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, scheduleBlockBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, scheduleBlockAssembly)
};

export type ScheduleBlockPackage = typeof scheduleBlockPackage;