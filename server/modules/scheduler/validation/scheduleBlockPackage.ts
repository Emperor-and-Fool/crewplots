import { insertScheduleBlockSchema } from '@shared/schema';
import { createVE30Package } from '@shared/validation/VE30PackageBuilder';

/**
 * Schedule Block Validation Package - VE30PackageBuilder Standard Compliant
 * Uses createVE30Package utility for standardized package creation
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

// VE30PackageBuilder-compliant package using standard utility
export const scheduleBlockPackage = createVE30Package(
  'scheduleBlock',
  insertScheduleBlockSchema,
  scheduleBlockBusinessRules,
  undefined, // Use default permission mapping
  scheduleBlockAssembly
);

export type ScheduleBlockPackage = typeof scheduleBlockPackage;