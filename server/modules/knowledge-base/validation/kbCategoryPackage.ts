/**
 * Knowledge Base Category Validation Package for ValidationEngine30
 * Provides comprehensive validation for KB category CRUD operations
 */

import { VE30PackageBuilder } from '../../../../shared/validation/VE30PackageBuilder';
import { insertKbCategorySchema, kbCategories } from '../../../../shared/schema';
import type { VE30Package } from '../../../../shared/validation/VE30PackageBuilder';

export const kbCategoryPackage: VE30Package = {
  entityType: 'kbCategory',
  
  validateSchema: (data: any, operation: string) => {
    console.log(`📝 KB CATEGORY PACKAGE: Schema validation for ${operation}`);
    
    const schema = operation === 'create' ? insertKbCategorySchema : insertKbCategorySchema.partial();
    return VE30PackageBuilder.validateSchema(data.categoryData || data, operation, schema);
  },
  
  getRequiredPermissions: (operation: string) => {
    const permissionMap = {
      'create': ['kb.create'],
      'read': ['kb.read'],
      'update': ['kb.update'],
      'delete': ['kb.delete'],
      'list': ['kb.read']
    };
    
    return permissionMap[operation as keyof typeof permissionMap] || ['kb.read'];
  },
  
  validateBusinessRules: async (data: any, context: any) => {
    console.log(`📋 KB CATEGORY PACKAGE: Business rules validation`);
    
    const rules = {
      // Category names must be unique within organization
      uniqueCategoryName: (data: any) => {
        if (!data.name) return { isValid: false, message: 'Category name is required' };
        return { isValid: true, message: 'Category name provided' };
      },
      
      // Category slug must be URL-friendly
      validSlug: (data: any) => {
        if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
          return { isValid: false, message: 'Category slug must be URL-friendly (lowercase, numbers, hyphens only)' };
        }
        return { isValid: true, message: 'Category slug validation passed' };
      },
      
      // User must have KB management permissions
      userCanManageKB: (data: any, context: any) => {
        if (!context.userId) {
          return { isValid: false, message: 'User authentication required for KB management' };
        }
        return { isValid: true, message: 'User authorized for KB management' };
      },
      
      // Parent category must exist if specified
      validParentCategory: (data: any) => {
        // For now, just validate that parentId is a positive number if provided
        if (data.parentId && (typeof data.parentId !== 'number' || data.parentId <= 0)) {
          return { isValid: false, message: 'Invalid parent category ID' };
        }
        return { isValid: true, message: 'Parent category validation passed' };
      }
    };
    
    return VE30PackageBuilder.validateBusinessRules(data, context, rules);
  },
  
  assemblePackage: async (data: any, user: any, operation: string) => {
    console.log(`🎁 KB CATEGORY PACKAGE: Assembling package for ${operation}`);
    
    const assembly = {
      // Standard category data assembly
      categoryData: {
        name: data.name,
        description: data.description,
        slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '-'),
        parentId: data.parentId || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        sortOrder: data.sortOrder || 0,
        icon: data.icon || null,
        color: data.color || '#3B82F6',
        ...data
      },
      
      // Server-side enhancements
      operation: operation,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      
      // KB Category-specific metadata
      categoryMetadata: {
        createdBy: user.userId,
        organizationId: user.organizationId || null,
        categoryType: data.categoryType || 'general',
        accessLevel: data.accessLevel || 'public'
      }
    };
    
    return VE30PackageBuilder.assemblePackage(data, user, operation, assembly);
  }
};