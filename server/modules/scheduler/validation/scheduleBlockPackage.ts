import { insertScheduleBlockSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

/**
 * Schedule Block Validation Package - VE30PackageBuilder Standard
 * COMPLIANT with userListPackage pattern using operation-appropriate schemas
 */

// List operations schema - handles empty data objects like userListPackage
export const scheduleBlockListSchema = z.object({
  filters: z.object({
    locationId: z.number().optional(),
    isActive: z.boolean().optional(),
    searchTerm: z.string().optional()
  }).optional()
});

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

// Assembly function for schedule blocks
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

// VE30PackageBuilder-based schedule block package (COMPLIANT like userListPackage)
export const scheduleBlockPackage: VE30Package = {
  entityType: 'scheduleBlock',
  
  // Operation-appropriate schema validation like userListPackage
  validateSchema: (data: any, operation: string) => {
    // Use list schema for list/read operations (handles empty data {})
    if (operation === 'list' || operation === 'read') {
      return VE30PackageBuilder.validateSchema(data, operation, scheduleBlockListSchema);
    }
    // Use insert schema for create/update operations
    return VE30PackageBuilder.validateSchema(data, operation, insertScheduleBlockSchema);
  },
  
  // Custom permissions like userListPackage (bypasses centralized mapper)
  getRequiredPermissions: (operation: string) => {
    if (operation === 'list' || operation === 'read') return ['schedule.read'];
    if (operation === 'create') return ['schedule.read', 'schedule.create'];
    if (operation === 'update') return ['schedule.read', 'schedule.update'];
    if (operation === 'delete') return ['schedule.read', 'schedule.delete'];
    return ['schedule.read'];
  },
  
  // Standard VE30PackageBuilder business rules
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, scheduleBlockBusinessRules),
  
  // Standard VE30PackageBuilder assembly
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, scheduleBlockAssembly)
};

export type ScheduleBlockPackage = typeof scheduleBlockPackage;