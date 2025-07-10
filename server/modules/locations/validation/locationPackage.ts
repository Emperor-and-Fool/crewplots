/**
 * Location Validation Package for ValidationEngine30
 * Provides comprehensive validation for location CRUD operations
 */

import { VE30PackageBuilder } from '../../../../shared/validation/VE30PackageBuilder';
import { insertLocationSchema, locations } from '../../../../shared/schema';
import type { VE30Package } from '../../../../shared/validation/VE30PackageBuilder';

export const locationPackage: VE30Package = {
  entityType: 'location',
  
  validateSchema: (data: any, operation: string) => {
    console.log(`📝 LOCATION PACKAGE: Schema validation for ${operation}`);
    
    const schema = operation === 'create' ? insertLocationSchema : insertLocationSchema.partial();
    return VE30PackageBuilder.validateSchema(data.locationData || data, operation, schema);
  },
  
  getRequiredPermissions: (operation: string) => {
    const permissionMap = {
      'create': ['location.create'],
      'read': ['location.read'],
      'update': ['location.update'],
      'delete': ['location.delete'],
      'list': ['location.read']
    };
    
    return permissionMap[operation as keyof typeof permissionMap] || ['location.read'];
  },
  
  validateBusinessRules: async (data: any, context: any) => {
    console.log(`📋 LOCATION PACKAGE: Business rules validation`);
    
    const rules = [
      (data: any, context: any) => {
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // Skip field validation for list and read operations
        const operation = context?.operation || 'unknown';
        if (operation === 'list' || operation === 'read') {
          return { warnings, errors };
        }
        
        // Location names must be unique within organization
        if (!data.name) {
          errors.push('Location name is required');
        }
        
        // Location must have valid address for public locations
        if (data.isPublic && !data.address) {
          errors.push('Public locations require a valid address');
        }
        
        return { warnings, errors };
      },
      
      (data: any, context: any) => {
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // Skip validation for list operations
        const operation = context?.operation || 'unknown';
        if (operation === 'list') {
          return { warnings, errors };
        }
        
        // User must have location management permissions
        if (!context?.user) {
          errors.push('User authentication required for location management');
        }
        
        return { warnings, errors };
      }
    ];
    
    return VE30PackageBuilder.validateBusinessRules(data, context, rules);
  },
  
  assemblePackage: async (data: any, user: any, operation: string) => {
    console.log(`🎁 LOCATION PACKAGE: Assembling package for ${operation}`);
    
    const assembly = {
      // Standard location data assembly
      locationData: {
        name: data.name,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        phoneNumber: data.phoneNumber,
        email: data.email,
        isPublic: data.isPublic || false,
        settings: data.settings || {},
        publicId: data.publicId || null,
        ...data
      },
      
      // Server-side enhancements
      operation: operation,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      
      // Location-specific metadata
      locationMetadata: {
        createdBy: user.userId,
        organizationId: user.organizationId || null,
        locationClass: data.locationClass || 'standard'
      }
    };
    
    return VE30PackageBuilder.assemblePackage(data, user, operation, assembly);
  }
};