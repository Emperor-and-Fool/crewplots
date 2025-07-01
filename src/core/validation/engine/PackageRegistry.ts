import type { EntityType } from '../types/ValidationPackage';

/**
 * Package Registry - Manages dynamic package loading and registration
 * IMPLEMENTING PATTERN FROM ValidationPackageService
 */

export interface PackageHandler {
  entityType: EntityType;
  validate: (data: any, operation: string) => Promise<{ isValid: boolean; errors: any[]; warnings: any[] }>;
  transform?: (data: any, operation: string) => Promise<any>;
  getRequiredPermissions: (operation: string) => string[];
  getSchema: (operation: string) => any;
}

export class PackageRegistry {
  private handlers: Map<string, PackageHandler> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeDefaultHandlers();
  }

  /**
   * Register a package handler for an entity type
   */
  registerPackageHandler(entityType: EntityType, handler: PackageHandler): void {
    console.log(`📦 PACKAGE REGISTRY: Registering handler for ${entityType}`);
    this.handlers.set(entityType, handler);
  }

  /**
   * Get package handler for entity type
   */
  getPackageHandler(entityType: string): PackageHandler | null {
    const handler = this.handlers.get(entityType);
    if (!handler) {
      console.warn(`📦 PACKAGE REGISTRY: No handler found for ${entityType}`);
      return null;
    }
    return handler;
  }

  /**
   * List all registered entity types
   */
  getRegisteredEntityTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if entity type has registered handler
   */
  hasHandler(entityType: string): boolean {
    return this.handlers.has(entityType);
  }

  /**
   * Initialize default handlers based on existing working patterns
   */
  private initializeDefaultHandlers(): void {
    if (this.initialized) return;

    // Schedule handler - BASED ON WORKING ValidationPackageService
    this.registerPackageHandler('schedule', {
      entityType: 'schedule',
      validate: async (data: any, operation: string) => {
        // Basic validation pattern copied from working service
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data.scheduleBlock?.name) {
          errors.push('Schedule block name is required');
        }

        if (!data.scheduleBlock?.locationId) {
          errors.push('Location ID is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      },
      getRequiredPermissions: (operation: string) => {
        switch (operation) {
          case 'create':
            return ['schedule.create', 'scheduler_development.write'];
          case 'update':
            return ['schedule.update', 'scheduler_development.write'];
          case 'delete':
            return ['schedule.delete', 'scheduler_development.execute'];
          default:
            return ['schedule.read'];
        }
      },
      getSchema: (operation: string) => {
        // Return appropriate schema based on operation
        return null; // Will be implemented with actual schemas
      }
    });

    // User handler - PLACEHOLDER FOR FUTURE IMPLEMENTATION
    this.registerPackageHandler('user', {
      entityType: 'user',
      validate: async (data: any, operation: string) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data.profile?.email) {
          errors.push('Email is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      },
      getRequiredPermissions: (operation: string) => {
        switch (operation) {
          case 'create':
            return ['user.create'];
          case 'update':
            return ['user.update'];
          case 'delete':
            return ['user.delete'];
          default:
            return ['user.read'];
        }
      },
      getSchema: (operation: string) => null
    });

    // Location handler - PLACEHOLDER FOR FUTURE IMPLEMENTATION
    this.registerPackageHandler('location', {
      entityType: 'location',
      validate: async (data: any, operation: string) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data.name) {
          errors.push('Location name is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      },
      getRequiredPermissions: (operation: string) => {
        switch (operation) {
          case 'create':
            return ['location.create'];
          case 'update':
            return ['location.update'];
          case 'delete':
            return ['location.delete'];
          default:
            return ['location.read'];
        }
      },
      getSchema: (operation: string) => null
    });

    this.initialized = true;
    console.log('📦 PACKAGE REGISTRY: Default handlers initialized');
  }

  /**
   * Validate package handler registration
   */
  validateHandler(handler: PackageHandler): boolean {
    if (!handler.entityType) return false;
    if (typeof handler.validate !== 'function') return false;
    if (typeof handler.getRequiredPermissions !== 'function') return false;
    if (typeof handler.getSchema !== 'function') return false;
    return true;
  }

  /**
   * Unregister a package handler
   */
  unregisterPackageHandler(entityType: EntityType): boolean {
    const deleted = this.handlers.delete(entityType);
    if (deleted) {
      console.log(`📦 PACKAGE REGISTRY: Unregistered handler for ${entityType}`);
    }
    return deleted;
  }

  /**
   * Clear all registered handlers
   */
  clearAllHandlers(): void {
    this.handlers.clear();
    this.initialized = false;
    console.log('📦 PACKAGE REGISTRY: All handlers cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalHandlers: number;
    entityTypes: string[];
    isInitialized: boolean;
  } {
    return {
      totalHandlers: this.handlers.size,
      entityTypes: Array.from(this.handlers.keys()),
      isInitialized: this.initialized
    };
  }
}