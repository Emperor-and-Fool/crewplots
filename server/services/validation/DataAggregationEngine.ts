import { storage } from '../../storage';
import { messageStorageService } from '../message-storage-service';
import { hybridCacheService, HybridCacheService } from '../hybrid-cache-service-v2';
import type { CacheOptions } from '../hybrid-cache-service-v2';
import type { User } from '@shared/schema';

/**
 * DataAggregationTask Interface - Based on 049 Architecture Decision #2
 * Generic task configuration for data aggregation across hybrid storage
 */
export interface DataAggregationTask {
  entityType: 'user' | 'schedule' | 'location' | 'custom';
  entityId: number | string;
  requiredData: {
    postgresql?: string[];     // ['user', 'locations', 'permissions']
    mongodb?: string[];        // ['notes', 'documents'] 
    redis?: string[];          // ['cache-keys']
  };
  compilationRules: {
    enhance?: boolean;         // Add calculated fields
    permissions?: boolean;     // Include permission context
    metadata?: boolean;        // Include MongoDB metadata
  };
  cacheStrategy: {
    category: string;
    ttl: number;
    connectionId?: string;
  };
}

/**
 * Enhanced user data with aggregated context from hybrid storage
 */
export interface AggregatedUserData {
  // Base user fields
  id: number;
  public_id: string | null;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  role: string;
  locationId: number | null;
  phoneNumber: string | null;
  status: string;
  resumeUrl: string | null;
  createdAt: Date;
  
  // Enhanced fields from aggregation
  aggregatedNotes?: {
    exists: boolean;
    documentId: string | null;
    wordCount: number;
    characterCount: number;
    lastUpdated: string | null;
    workflow: string | null;
  };
  aggregatedPermissions?: {
    rolePermissions: string[];
    workflowPermissions: Record<string, any>;
    blockedPermissions: string[];
  };
  aggregatedLocations?: any[];
  aggregatedCompetencies?: any[];
  displayName?: string;
  _metadata?: {
    aggregatedAt: string;
    taskType: string;
    sources: string[];
  };
  [key: string]: any; // Allow for custom enhanced fields
}

/**
 * DataAggregationEngine - Generic data compilation service
 * Based on ProfileFetcher patterns (049 lines 36-60, 141-150)
 * Uses HybridCacheService integration documented in 049 Section 1.4
 */
export class DataAggregationEngine {
  private cacheKeyPrefix = 'data-aggregation';
  
  constructor(private hybridCache: HybridCacheService = hybridCacheService) {
    console.log('[DataAggregationEngine] Initialized with HybridCacheService integration');
  }

  /**
   * Main aggregation method - following ProfileFetcher cache-first pattern
   */
  async aggregate<T = any>(task: DataAggregationTask): Promise<T | null> {
    const cacheKey = `${this.cacheKeyPrefix}:${task.entityType}:${task.entityId}:${this.generateTaskHash(task)}`;
    
    try {
      // Try Redis cache first (following 049 ProfileFetcher pattern lines 36-60)
      console.log(`[DataAggregationEngine] Checking cache for ${task.entityType}:${task.entityId}`);
      
      const cacheOptions: CacheOptions = {
        category: task.cacheStrategy.category,
        connectionId: task.cacheStrategy.connectionId || `aggregation-${task.entityType}-${task.entityId}`,
        ttl: task.cacheStrategy.ttl
      };

      const cachedResult = await this.hybridCache.get<T>(cacheKey, cacheOptions);
      
      if (cachedResult) {
        console.log(`⚡ CACHE HIT: Aggregated data loaded from cache for ${task.entityType}:${task.entityId}`);
        return cachedResult;
      }

      console.log(`[DataAggregationEngine] Cache miss, executing fresh aggregation for ${task.entityType}:${task.entityId}`);
      
      // Execute fresh aggregation
      const aggregatedData = await this.executeFreshAggregation<T>(task);
      
      if (aggregatedData) {
        // Cache the result (following 049 HybridCacheService pattern)
        await this.cacheAggregatedData(cacheKey, aggregatedData, cacheOptions);
      }
      
      return aggregatedData;
    } catch (error) {
      console.error(`[DataAggregationEngine] Error aggregating data for ${task.entityType}:${task.entityId}:`, error);
      throw error;
    }
  }

  /**
   * Execute fresh data aggregation from hybrid storage sources
   * Task Execution Flow (049 evidence):
   * 1. Task Definition → Specify what data to aggregate
   * 2. Parallel Fetching → PostgreSQL + MongoDB + Redis simultaneously  
   * 3. Data Compilation → Apply business rules and enhancements
   */
  private async executeFreshAggregation<T>(task: DataAggregationTask): Promise<T | null> {
    console.log(`[DataAggregationEngine] Starting fresh aggregation for ${task.entityType}:${task.entityId}`);
    
    // Initialize results container
    let aggregatedData: any = {};
    
    // Phase 1: PostgreSQL Data Fetching
    if (task.requiredData.postgresql) {
      aggregatedData = await this.fetchPostgreSQLData(task);
      if (!aggregatedData) {
        console.log(`[DataAggregationEngine] Base entity not found: ${task.entityType}:${task.entityId}`);
        return null;
      }
    }

    // Phase 2: MongoDB Data Enhancement (parallel with PostgreSQL when possible)
    if (task.requiredData.mongodb) {
      const mongoData = await this.fetchMongoDBData(task);
      aggregatedData = { ...aggregatedData, ...mongoData };
    }

    // Phase 3: Redis Data Enhancement
    if (task.requiredData.redis) {
      const redisData = await this.fetchRedisData(task);
      aggregatedData = { ...aggregatedData, ...redisData };
    }

    // Phase 4: Apply compilation rules (049 business rules)
    if (task.compilationRules.enhance || task.compilationRules.permissions || task.compilationRules.metadata) {
      aggregatedData = await this.applyCompilationRules(aggregatedData, task);
    }

    return aggregatedData as T;
  }

  /**
   * Fetch data from PostgreSQL based on task configuration
   */
  private async fetchPostgreSQLData(task: DataAggregationTask): Promise<any | null> {
    const entityId = typeof task.entityId === 'string' ? parseInt(task.entityId) : task.entityId;
    
    switch (task.entityType) {
      case 'user':
        console.log(`[DataAggregationEngine] Fetching user data from PostgreSQL for ID: ${entityId}`);
        const user = await storage.getUser(entityId);
        if (user) {
          console.log(`[DataAggregationEngine] Found user: ${user.username} (${user.role})`);
        }
        return user;
        
      case 'schedule':
        // Future: Add schedule fetching logic
        console.log(`[DataAggregationEngine] Schedule aggregation not yet implemented`);
        return null;
        
      case 'location':
        // Future: Add location fetching logic  
        console.log(`[DataAggregationEngine] Location aggregation not yet implemented`);
        return null;
        
      default:
        console.log(`[DataAggregationEngine] Unknown entity type: ${task.entityType}`);
        return null;
    }
  }

  /**
   * Fetch data from MongoDB based on task configuration
   * Following MessageStorageService patterns (049 hybrid storage evidence)
   */
  private async fetchMongoDBData(task: DataAggregationTask): Promise<any> {
    const mongoData: any = {};
    const entityId = typeof task.entityId === 'string' ? parseInt(task.entityId) : task.entityId;
    
    if (task.requiredData.mongodb?.includes('notes')) {
      try {
        console.log(`[DataAggregationEngine] Fetching notes from MongoDB for user: ${entityId}`);
        const notes = await messageStorageService.getNoteRefsByUser(entityId);
        
        mongoData.aggregatedNotes = notes.length > 0 ? {
          exists: true,
          documentId: notes[0].noteId,
          wordCount: notes[0].wordCount || 0,
          characterCount: notes[0].characterCount || 0,
          lastUpdated: notes[0].updatedAt?.toISOString() || null,
          workflow: notes[0].workflow
        } : {
          exists: false,
          documentId: null,
          wordCount: 0,
          characterCount: 0,
          lastUpdated: null,
          workflow: null
        };
        
        console.log(`[DataAggregationEngine] Notes metadata compiled:`, mongoData.aggregatedNotes);
      } catch (error) {
        console.error(`[DataAggregationEngine] Error fetching notes:`, error);
        mongoData.notes = {
          exists: false,
          documentId: null,
          wordCount: 0,
          characterCount: 0,
          lastUpdated: null,
          workflow: null
        };
      }
    }

    return mongoData;
  }

  /**
   * Fetch data from Redis cache based on task configuration
   */
  private async fetchRedisData(task: DataAggregationTask): Promise<any> {
    const redisData: any = {};
    
    // Implementation for Redis-specific data fetching
    // Future enhancement for cached metadata, session data, etc.
    
    return redisData;
  }

  /**
   * Apply compilation rules for data enhancement
   */
  private async applyCompilationRules(data: any, task: DataAggregationTask): Promise<any> {
    let enhancedData = { ...data };
    
    if (task.compilationRules.enhance) {
      // Add calculated fields, derived data, etc.
      if (task.entityType === 'user' && enhancedData.firstName && enhancedData.lastName) {
        enhancedData.displayName = `${enhancedData.firstName} ${enhancedData.lastName}`;
      }
    }

    if (task.compilationRules.permissions && task.entityType === 'user') {
      // Add permission context (future enhancement)
      enhancedData.permissions = {
        rolePermissions: [], // Future: fetch from permissions system
        workflowPermissions: {},
        blockedPermissions: []
      };
    }

    if (task.compilationRules.metadata) {
      // Add metadata timestamps, processing info, etc.
      enhancedData._metadata = {
        aggregatedAt: new Date().toISOString(),
        taskType: task.entityType,
        sources: Object.keys(task.requiredData).filter(key => task.requiredData[key as keyof typeof task.requiredData]?.length)
      };
    }

    return enhancedData;
  }

  /**
   * Cache aggregated data using HybridCacheService
   */
  private async cacheAggregatedData(cacheKey: string, data: any, options: CacheOptions): Promise<void> {
    try {
      const success = await this.hybridCache.set(cacheKey, data, options);
      if (success) {
        console.log(`[DataAggregationEngine] Cached aggregated data: ${cacheKey} (TTL: ${options.ttl}s)`);
      } else {
        console.log(`[DataAggregationEngine] Failed to cache: ${cacheKey}`);
      }
    } catch (error) {
      console.error(`[DataAggregationEngine] Cache error for ${cacheKey}:`, error);
    }
  }

  /**
   * Generate unique hash for task configuration
   * Used for cache key generation
   */
  private generateTaskHash(task: DataAggregationTask): string {
    const taskString = JSON.stringify({
      requiredData: task.requiredData,
      compilationRules: task.compilationRules
    });
    
    // Simple hash generation (could be enhanced with crypto if needed)
    let hash = 0;
    for (let i = 0; i < taskString.length; i++) {
      const char = taskString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear cache for specific entity
   * Useful for cache invalidation after updates
   */
  async clearCache(entityType: string, entityId: number | string): Promise<void> {
    const pattern = `${this.cacheKeyPrefix}:${entityType}:${entityId}:*`;
    console.log(`[DataAggregationEngine] Clearing cache pattern: ${pattern}`);
    
    // Note: Full pattern clearing would require Redis SCAN
    // For now, we rely on TTL expiration and individual key deletion
    // Future enhancement: Implement pattern-based cache clearing
  }
}

// Export singleton instance
export const dataAggregationEngine = new DataAggregationEngine();