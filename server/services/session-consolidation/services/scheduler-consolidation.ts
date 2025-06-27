import { BaseConsolidationService } from '../core/base-consolidation-service';
import { AuthenticationWrapper } from '../core/authentication-wrapper';
import { storage } from '../../storage';
import { Request } from 'express';

export interface ShiftCreationData {
  weekSchedules: any[];
  locations: any[];
  competencies: any[];
  userPermissions: string[];
  authenticatedUser: {
    id: number;
    username: string;
    role: string;
  };
}

export class SchedulerConsolidationService extends BaseConsolidationService<ShiftCreationData> {
  constructor() {
    super({
      cachePrefix: 'scheduler-consolidation',
      cacheTTL: 1800, // 30 minutes
      category: 'scheduler-data'
    });
  }

  async getShiftCreationData(req: Request, locationId?: number): Promise<ShiftCreationData> {
    const user = AuthenticationWrapper.validateAuthentication(req);
    const cacheKey = `${this.config.cachePrefix}:${user.id}:creation-data:${locationId || 'all'}`;
    
    return this.getConsolidatedData(
      user.id,
      cacheKey,
      () => this.fetchShiftCreationData(user.id, locationId),
      `scheduler-${user.id}`
    );
  }

  private async fetchShiftCreationData(userId: number, locationId?: number): Promise<ShiftCreationData> {
    console.log(`[SchedulerConsolidation] Fetching fresh data for user ${userId}, location: ${locationId || 'all'}`);
    
    try {
      // Fetch data in parallel for performance
      const [weekSchedules, locations, competencies, user] = await Promise.all([
        storage.getWeekSchedules(locationId),
        storage.getLocations(),
        locationId ? storage.getCompetencies(locationId) : storage.getAllCompetencies(),
        storage.getUserById(userId)
      ]);

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Enhance week schedules with their shifts
      const weekSchedulesWithShifts = await Promise.all(
        (weekSchedules || []).map(async (schedule: any) => {
          const shifts = await storage.getShiftsByWeekSchedule(schedule.id);
          console.log(`[SchedulerConsolidation] Schedule ${schedule.id} (${schedule.name}) has ${shifts?.length || 0} shifts`);
          return {
            ...schedule,
            shifts: shifts || []
          };
        })
      );

      const shiftCreationData: ShiftCreationData = {
        weekSchedules: weekSchedulesWithShifts,
        locations: locations || [],
        competencies: competencies || [],
        userPermissions: user.permissions || [],
        authenticatedUser: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };

      console.log(`[SchedulerConsolidation] Successfully compiled data: ${weekSchedulesWithShifts?.length} schedules with shifts, ${locations?.length} locations, ${competencies?.length} competencies`);
      return shiftCreationData;
    } catch (error) {
      console.error(`[SchedulerConsolidation] Error fetching data for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const schedulerConsolidationService = new SchedulerConsolidationService();