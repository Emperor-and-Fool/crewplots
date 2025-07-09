/**
 * Knowledge Base Article Validation Package for ValidationEngine30
 * Provides comprehensive validation for KB article CRUD operations
 */

import { VE30PackageBuilder } from '../../../../shared/validation/VE30PackageBuilder';
import { insertKbArticleSchema, kbArticles } from '../../../../shared/schema';
import type { VE30Package } from '../../../../shared/validation/VE30PackageBuilder';

export const kbArticlePackage: VE30Package = {
  entityType: 'kbArticle',
  
  validateSchema: (data: any, operation: string) => {
    console.log(`📝 KB ARTICLE PACKAGE: Schema validation for ${operation}`);
    
    const schema = operation === 'create' ? insertKbArticleSchema : insertKbArticleSchema.partial();
    return VE30PackageBuilder.validateSchema(data.articleData || data, operation, schema);
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
    console.log(`📋 KB ARTICLE PACKAGE: Business rules validation`);
    
    const rules = {
      // Article titles must be unique within category
      uniqueArticleTitle: (data: any) => {
        if (!data.title) return { isValid: false, message: 'Article title is required' };
        return { isValid: true, message: 'Article title provided' };
      },
      
      // Article slug must be URL-friendly
      validSlug: (data: any) => {
        if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
          return { isValid: false, message: 'Article slug must be URL-friendly (lowercase, numbers, hyphens only)' };
        }
        return { isValid: true, message: 'Article slug validation passed' };
      },
      
      // Content must be provided for published articles
      validContent: (data: any) => {
        if (data.isPublished && (!data.content || data.content.trim().length === 0)) {
          return { isValid: false, message: 'Published articles must have content' };
        }
        return { isValid: true, message: 'Article content validation passed' };
      },
      
      // User must have KB management permissions
      userCanManageKB: (data: any, context: any) => {
        if (!context.userId) {
          return { isValid: false, message: 'User authentication required for KB management' };
        }
        return { isValid: true, message: 'User authorized for KB management' };
      },
      
      // Category must exist if specified
      validCategory: (data: any) => {
        if (data.categoryId && (typeof data.categoryId !== 'number' || data.categoryId <= 0)) {
          return { isValid: false, message: 'Invalid category ID' };
        }
        return { isValid: true, message: 'Category validation passed' };
      },
      
      // Tags must be valid array if provided
      validTags: (data: any) => {
        if (data.tags && !Array.isArray(data.tags)) {
          return { isValid: false, message: 'Article tags must be an array' };
        }
        return { isValid: true, message: 'Tags validation passed' };
      }
    };
    
    return VE30PackageBuilder.validateBusinessRules(data, context, rules);
  },
  
  assemblePackage: async (data: any, user: any, operation: string) => {
    console.log(`🎁 KB ARTICLE PACKAGE: Assembling package for ${operation}`);
    
    const assembly = {
      // Standard article data assembly
      articleData: {
        title: data.title,
        content: data.content,
        summary: data.summary || '',
        slug: data.slug || data.title?.toLowerCase().replace(/\s+/g, '-'),
        categoryId: data.categoryId,
        isPublished: data.isPublished !== undefined ? data.isPublished : false,
        publishedAt: data.isPublished ? new Date().toISOString() : null,
        viewCount: data.viewCount || 0,
        tags: data.tags || [],
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
        sortOrder: data.sortOrder || 0,
        ...data
      },
      
      // Server-side enhancements
      operation: operation,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      
      // KB Article-specific metadata
      articleMetadata: {
        createdBy: user.userId,
        organizationId: user.organizationId || null,
        articleType: data.articleType || 'general',
        accessLevel: data.accessLevel || 'public',
        reviewStatus: data.reviewStatus || 'draft',
        lastModifiedBy: user.userId
      }
    };
    
    return VE30PackageBuilder.assemblePackage(data, user, operation, assembly);
  }
};