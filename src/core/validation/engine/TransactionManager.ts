import { db } from '../../../../server/db';
import { 
  scheduleBlocks, 
  weekSchedules, 
  shifts,
  users,
  locations 
} from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { ValidationPackage } from '../types/ValidationPackage';

/**
 * Transaction Manager - Handles atomic database operations
 * COPIED FROM ValidationPackageService.executeStorageTransaction
 */
export class TransactionManager {

  /**
   * Execute atomic transaction - COPIED FROM working implementation
   */
  async executeTransaction(validationPackage: ValidationPackage): Promise<{
    success: boolean;
    data?: any;
    errors: string[];
    operationsExecuted?: number;
    recordsAffected?: number;
  }> {
    console.log('💾 TRANSACTION MANAGER: Starting atomic transaction');
    
    const errors: string[] = [];
    let operationsExecuted = 0;
    let recordsAffected = 0;

    try {
      return await db.transaction(async (tx) => {
        console.log('💾 TRANSACTION MANAGER: Transaction started');

        let result: any = {};

        switch (validationPackage.entityType) {
          case 'schedule':
            result = await this.executeScheduleTransaction(validationPackage, tx);
            break;
          case 'user':
            result = await this.executeUserTransaction(validationPackage, tx);
            break;
          case 'location':
            result = await this.executeLocationTransaction(validationPackage, tx);
            break;
          default:
            throw new Error(`Unsupported entity type: ${validationPackage.entityType}`);
        }

        operationsExecuted = result.operationsExecuted || 0;
        recordsAffected = result.recordsAffected || 0;

        console.log('💾 TRANSACTION MANAGER: Transaction completed successfully:', {
          operationsExecuted,
          recordsAffected
        });

        return {
          success: true,
          data: result.data,
          errors: [],
          operationsExecuted,
          recordsAffected
        };

      });

    } catch (error) {
      console.error('💾 TRANSACTION MANAGER: Transaction failed:', error);
      errors.push(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        errors,
        operationsExecuted,
        recordsAffected
      };
    }
  }

  /**
   * Execute schedule transaction - COPIED FROM ValidationPackageService
   */
  private async executeScheduleTransaction(
    validationPackage: ValidationPackage,
    tx: any
  ): Promise<{ data: any; operationsExecuted: number; recordsAffected: number }> {
    const data = validationPackage.data;
    let scheduleBlockId: number | null = null;
    let weekScheduleIds: number[] = [];
    let shiftIds: number[] = [];
    let operationsExecuted = 0;
    let recordsAffected = 0;

    // Handle schedule block (create or update)
    if (data.scheduleBlock) {
      if (validationPackage.operation === 'create') {
        const [createdScheduleBlock] = await tx
          .insert(scheduleBlocks)
          .values({
            name: data.scheduleBlock.name,
            description: data.scheduleBlock.description || '',
            locationId: data.scheduleBlock.locationId,
            isActive: data.scheduleBlock.isActive ?? true,
            createdBy: validationPackage.context.userId
          })
          .returning({ id: scheduleBlocks.id });

        scheduleBlockId = createdScheduleBlock.id;
        operationsExecuted++;
        recordsAffected++;
        console.log('💾 TRANSACTION MANAGER: Schedule block created with ID:', scheduleBlockId);

      } else if (validationPackage.operation === 'update' && data.scheduleBlock.id) {
        await tx
          .update(scheduleBlocks)
          .set({
            name: data.scheduleBlock.name,
            description: data.scheduleBlock.description || '',
            locationId: data.scheduleBlock.locationId,
            isActive: data.scheduleBlock.isActive ?? true,
            updatedAt: new Date()
          })
          .where(eq(scheduleBlocks.id, data.scheduleBlock.id));

        scheduleBlockId = data.scheduleBlock.id;
        operationsExecuted++;
        recordsAffected++;
        console.log('💾 TRANSACTION MANAGER: Schedule block updated with ID:', scheduleBlockId);
      }
    }

    // Handle week schedules if present
    if (data.weekSchedules && Array.isArray(data.weekSchedules) && scheduleBlockId) {
      for (const weekSchedule of data.weekSchedules) {
        if (validationPackage.operation === 'create') {
          const [createdWeekSchedule] = await tx
            .insert(weekSchedules)
            .values({
              scheduleBlockId,
              weekNumber: weekSchedule.weekNumber,
              templateId: weekSchedule.templateId
            })
            .returning({ id: weekSchedules.id });

          weekScheduleIds.push(createdWeekSchedule.id);
          operationsExecuted++;
          recordsAffected++;
          console.log('💾 TRANSACTION MANAGER: Week schedule created with ID:', createdWeekSchedule.id);
        }
      }
    }

    // Handle shifts if present
    if (data.shifts && Array.isArray(data.shifts)) {
      for (let i = 0; i < data.shifts.length; i++) {
        const shift = data.shifts[i];
        const targetWeekScheduleId = weekScheduleIds[i] || shift.weekScheduleId;

        if (validationPackage.operation === 'create' && targetWeekScheduleId) {
          const [createdShift] = await tx
            .insert(shifts)
            .values({
              weekScheduleId: targetWeekScheduleId,
              title: shift.title,
              position: shift.position || '',
              dayOfWeek: shift.dayOfWeek,
              startTime: shift.startTime,
              endTime: shift.endTime,
              maxSlots: shift.maxSlots || 1,
              subscriptionDeadline: shift.subscriptionDeadline
            })
            .returning({ id: shifts.id });

          shiftIds.push(createdShift.id);
          operationsExecuted++;
          recordsAffected++;
          console.log('💾 TRANSACTION MANAGER: Shift created with ID:', createdShift.id);
        }
      }
    }

    return {
      data: {
        scheduleBlockId,
        weekScheduleIds,
        shiftIds
      },
      operationsExecuted,
      recordsAffected
    };
  }

  /**
   * Execute user transaction - PLACEHOLDER FOR FUTURE IMPLEMENTATION
   */
  private async executeUserTransaction(
    validationPackage: ValidationPackage,
    tx: any
  ): Promise<{ data: any; operationsExecuted: number; recordsAffected: number }> {
    const data = validationPackage.data;
    let operationsExecuted = 0;
    let recordsAffected = 0;

    // User transaction logic would be implemented here
    console.log('💾 TRANSACTION MANAGER: User transaction placeholder');

    return {
      data: { userId: null },
      operationsExecuted,
      recordsAffected
    };
  }

  /**
   * Execute location transaction - PLACEHOLDER FOR FUTURE IMPLEMENTATION
   */
  private async executeLocationTransaction(
    validationPackage: ValidationPackage,
    tx: any
  ): Promise<{ data: any; operationsExecuted: number; recordsAffected: number }> {
    const data = validationPackage.data;
    let operationsExecuted = 0;
    let recordsAffected = 0;

    // Location transaction logic would be implemented here
    console.log('💾 TRANSACTION MANAGER: Location transaction placeholder');

    return {
      data: { locationId: null },
      operationsExecuted,
      recordsAffected
    };
  }

  /**
   * Rollback transaction - for future implementation
   */
  async rollbackTransaction(transactionId: string): Promise<boolean> {
    console.log('💾 TRANSACTION MANAGER: Rollback requested for transaction:', transactionId);
    // Rollback logic would be implemented here
    return true;
  }

  /**
   * Get transaction status - for future implementation
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'rolled_back';
    details: any;
  }> {
    // Transaction status logic would be implemented here
    return {
      status: 'completed',
      details: {}
    };
  }
}