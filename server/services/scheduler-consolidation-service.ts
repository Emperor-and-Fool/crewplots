import { storage } from '../storage';
import { hybridCacheService } from './hybrid-cache-service-v2';

export interface SchedulerEditData {
  schedule: any | null;
  locations: any[];
  shifts: any[];
  permissions: {
    canEditSchedules: boolean;
    canCreateShifts: boolean;
    canManageCompetencies: boolean;
  };
}

export class SchedulerConsolidationService {
  private cacheKeyPrefix = 'scheduler-edit';
  private cacheTTL = 600; // 10 minutes (shorter for edit data)

  /**
   * Get complete scheduler edit data with Redis-first caching
   * This prevents session isolation issues by consolidating all data in one authenticated backend request
   */
  async getSchedulerEditData(scheduleId: number, userRole: string): Promise<SchedulerEditData | null> {
    const cacheKey = `${this.cacheKeyPrefix}:${scheduleId}:data`;
    
    try {
      // Try Redis cache first
      console.log(`[SchedulerConsolidation] Checking Redis cache for schedule ${scheduleId}`);
      const cachedData = await hybridCacheService.get<SchedulerEditData>(cacheKey, {
        category: 'scheduler-edit',
        connectionId: `schedule-edit-${scheduleId}`,
        ttl: this.cacheTTL
      });

      if (cachedData) {
        console.log(`⚡ REDIS SUCCESS: Scheduler edit data loaded from cache for schedule ${scheduleId}`);
        return cachedData;
      }

      // Cache miss - assemble data from database
      console.log(`[SchedulerConsolidation] Cache miss, assembling data for schedule ${scheduleId}`);
      
      // Fetch all required data in parallel (backend session is stable)
      const [schedule, locations, shifts] = await Promise.all([
        storage.getWeekScheduleById(scheduleId),
        storage.getLocations(),
        storage.getShiftsByWeekSchedule(scheduleId)
      ]);

      // Calculate permissions based on user role
      const permissions = this.calculatePermissions(userRole);

      // Assemble consolidated response
      const consolidatedData: SchedulerEditData = {
        schedule: schedule || null,
        locations: locations,
        shifts: shifts,
        permissions
      };

      // Cache the result for future requests
      await hybridCacheService.set(cacheKey, consolidatedData, {
        category: 'scheduler-edit',
        connectionId: `schedule-edit-${scheduleId}`,
        ttl: this.cacheTTL
      });

      console.log(`✅ SCHEDULER CONSOLIDATION: Data assembled and cached for schedule ${scheduleId}`);
      return consolidatedData;

    } catch (error) {
      console.error(`❌ SCHEDULER CONSOLIDATION ERROR for schedule ${scheduleId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache when schedule or shifts are updated
   */
  async invalidateScheduleCache(scheduleId: number): Promise<void> {
    const cacheKey = `${this.cacheKeyPrefix}:${scheduleId}:data`;
    
    try {
      await hybridCacheService.delete(cacheKey, {
        category: 'scheduler-edit',
        connectionId: `schedule-edit-${scheduleId}`
      });
      console.log(`🗑️ CACHE INVALIDATED: Scheduler edit data for schedule ${scheduleId}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for schedule ${scheduleId}:`, error);
    }
  }

  /**
   * Calculate user permissions based on role
   */
  private calculatePermissions(userRole: string): SchedulerEditData['permissions'] {
    const hasSchedulerDevelopment = ['administrator', 'owner', 'app_manager'].includes(userRole);
    
    return {
      canEditSchedules: hasSchedulerDevelopment,
      canCreateShifts: hasSchedulerDevelopment,
      canManageCompetencies: hasSchedulerDevelopment
    };
  }
}

// Export singleton instance
export const schedulerConsolidationService = new SchedulerConsolidationService();