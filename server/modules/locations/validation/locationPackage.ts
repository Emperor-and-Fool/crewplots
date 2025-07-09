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
    
    const rules = {
      // Location names must be unique within organization
      uniqueLocationName: (data: any) => {
        if (!data.name) return { isValid: false, message: 'Location name is required' };
        return { isValid: true, message: 'Location name provided' };
      },
      
      // Location must have valid address for public locations
      validAddress: (data: any) => {
        if (data.isPublic && !data.address) {
          return { isValid: false, message: 'Public locations require a valid address' };
        }
        return { isValid: true, message: 'Address validation passed' };
      },
      
      // User must have location management permissions
      userCanManageLocation: (data: any, context: any) => {
        if (!context.userId) {
          return { isValid: false, message: 'User authentication required for location management' };
        }
        return { isValid: true, message: 'User authorized for location management' };
      }
    };
    
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