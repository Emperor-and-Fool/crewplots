import { hybridCacheService } from '../../hybrid-cache-service-v2';

export interface ConsolidationConfig {
  cachePrefix: string;
  cacheTTL: number;
  category: string;
}

export abstract class BaseConsolidationService<T> {
  protected config: ConsolidationConfig;
  
  constructor(config: ConsolidationConfig) {
    this.config = config;
  }
  
  protected async getConsolidatedData(
    userId: number,
    cacheKey: string,
    dataFetcher: () => Promise<T>,
    connectionId?: string
  ): Promise<T> {
    try {
      // Try Redis cache first
      const cachedData = await hybridCacheService.get<T>(cacheKey, {
        category: this.config.category,
        connectionId: connectionId || `${this.config.cachePrefix}-${userId}`,
        ttl: this.config.cacheTTL
      });

      if (cachedData) {
        console.log(`⚡ CONSOLIDATION CACHE HIT: ${cacheKey}`);
        return cachedData;
      }

      console.log(`[Consolidation] Cache miss, fetching fresh data: ${cacheKey}`);
      
      // Fetch fresh data
      const freshData = await dataFetcher();
      
      // Cache the result
      await this.cacheData(cacheKey, freshData, connectionId);
      
      return freshData;
    } catch (error) {
      console.error(`[Consolidation] Error fetching data for ${cacheKey}:`, error);
      throw error;
    }
  }
  
  protected async cacheData(
    cacheKey: string, 
    data: T, 
    connectionId?: string
  ): Promise<void> {
    try {
      await hybridCacheService.set(cacheKey, data, {
        ttl: this.config.cacheTTL,
        category: this.config.category,
        connectionId: connectionId || cacheKey
      });
      console.log(`[Consolidation] Data cached successfully: ${cacheKey}`);
    } catch (error) {
      console.warn(`[Consolidation] Failed to cache data for ${cacheKey}:`, error);
      // Don't throw - caching failure shouldn't break the response
    }
  }
  
  async clearCache(userId: number, additionalKeys: string[] = []): Promise<void> {
    const baseKey = `${this.config.cachePrefix}:${userId}`;
    const keysToDelete = [baseKey, ...additionalKeys];
    
    for (const key of keysToDelete) {
      try {
        await hybridCacheService.delete(key, {
          category: this.config.category,
          connectionId: `${this.config.cachePrefix}-${userId}`
        });
        console.log(`[Consolidation] Cleared cache: ${key}`);
      } catch (error) {
        console.warn(`[Consolidation] Failed to clear cache for ${key}:`, error);
      }
    }
  }
}