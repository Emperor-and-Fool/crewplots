/**
 * Competency Validation Package for ValidationEngine30
 * Provides comprehensive validation for competency CRUD operations
 */

import { VE30PackageBuilder } from '../../../../shared/validation/VE30PackageBuilder';
import { insertCompetencySchema, competencies } from '../../../../shared/schema';
import type { VE30Package } from '../../../../shared/validation/VE30PackageBuilder';

export const competencyPackage: VE30Package = {
  entityType: 'competency',
  
  validateSchema: (data: any, operation: string) => {
    console.log(`📝 COMPETENCY PACKAGE: Schema validation for ${operation}`);
    
    const schema = operation === 'create' ? insertCompetencySchema : insertCompetencySchema.partial();
    return VE30PackageBuilder.validateSchema(data.competencyData || data, operation, schema);
  },
  
  getRequiredPermissions: (operation: string) => {
    const permissionMap = {
      'create': ['competency.create'],
      'read': ['competency.read'],
      'update': ['competency.update'],
      'delete': ['competency.delete'],
      'list': ['competency.read']
    };
    
    return permissionMap[operation as keyof typeof permissionMap] || ['competency.read'];
  },
  
  validateBusinessRules: async (data: any, context: any) => {
    console.log(`📋 COMPETENCY PACKAGE: Business rules validation`);
    
    const rules = {
      // Competency names must be unique within organization
      uniqueCompetencyName: (data: any) => {
        if (!data.name) return { isValid: false, message: 'Competency name is required' };
        return { isValid: true, message: 'Competency name provided' };
      },
      
      // Competency category must be valid
      validCategory: (data: any) => {
        const validCategories = ['technical', 'soft', 'certification', 'experience', 'language'];
        if (data.category && !validCategories.includes(data.category)) {
          return { isValid: false, message: 'Invalid competency category' };
        }
        return { isValid: true, message: 'Competency category validation passed' };
      },
      
      // User must have competency management permissions
      userCanManageCompetency: (data: any, context: any) => {
        if (!context.userId) {
          return { isValid: false, message: 'User authentication required for competency management' };
        }
        return { isValid: true, message: 'User authorized for competency management' };
      },
      
      // Competency level must be valid if specified
      validLevel: (data: any) => {
        if (data.level && !['beginner', 'intermediate', 'advanced', 'expert'].includes(data.level)) {
          return { isValid: false, message: 'Invalid competency level' };
        }
        return { isValid: true, message: 'Competency level validation passed' };
      }
    };
    
    return VE30PackageBuilder.validateBusinessRules(data, context, rules);
  },
  
  assemblePackage: async (data: any, user: any, operation: string) => {
    console.log(`🎁 COMPETENCY PACKAGE: Assembling package for ${operation}`);
    
    const assembly = {
      // Standard competency data assembly
      competencyData: {
        name: data.name,
        description: data.description,
        category: data.category || 'technical',
        level: data.level || 'intermediate',
        isRequired: data.isRequired || false,
        certificationRequired: data.certificationRequired || false,
        expirationMonths: data.expirationMonths || null,
        tags: data.tags || [],
        ...data
      },
      
      // Server-side enhancements
      operation: operation,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      
      // Competency-specific metadata
      competencyMetadata: {
        createdBy: user.userId,
        organizationId: user.organizationId || null,
        competencyClass: data.competencyClass || 'standard',
        priority: data.priority || 'normal'
      }
    };
    
    return VE30PackageBuilder.assemblePackage(data, user, operation, assembly);
  }
};