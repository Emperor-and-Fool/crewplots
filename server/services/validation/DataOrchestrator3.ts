import { v4 as uuidv4 } from 'uuid';
import { validationEngine30, ValidationRequest30, ValidationResult30 } from './ValidationEngine30';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import type { User } from '@shared/schema';

/**
 * DataOrchestrator3.ts - Orchestrator for dual-use validation patterns
 * Plan 050: Coordinates validation and aggregation workflows
 * Parent: Plan 048 dual-use architecture (direct + aggregate-then-validate)
 * 
 * Purpose: Orchestrates between ValidationEngine30 + DataAggregationEngine
 * Dependencies: ValidationEngine30 + DataAggregationEngine
 * Risk: ZERO - New file, orchestrates existing components
 */

export interface OrchestrationRequest {
  operation: 'validate' | 'orchestrate';
  entityType: string;
  entityId?: number;
  data?: any;
  validationOperation: 'create' | 'read' | 'update' | 'delete';
  context: {
    userId: number;
    userRole: string;
  };
}

export interface OrchestrationResult {
  success: boolean;
  validationResult: ValidationResult30;
  aggregatedData?: AggregatedUserData;
  orchestrationMetadata: {
    orchestrationId: string;
    operation: 'validate' | 'orchestrate';
    timestamp: string;
    duration: number;
    aggregationUsed: boolean;
    orchestrator: 'DataOrchestrator3';
  };
}

/**
 * DataOrchestrator3 - Main orchestrator for dual-use patterns
 * Coordinates workflows between ValidationEngine30 and DataAggregationEngine
 * 
 * Dual-use patterns from Plan 048:
 * 1. Direct validation: Fast validation without aggregation
 * 2. Aggregate-then-validate: Comprehensive validation with user context
 */
export class DataOrchestrator3 {

  /**
   * Main orchestration method - implements dual-use patterns
   * Routes to either direct validation or aggregate-then-validate workflow
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const orchestrationId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎼 DATA ORCHESTRATOR 3: Starting ${request.operation} for ${request.entityType}`, { orchestrationId });

    try {
      let result: OrchestrationResult;

      if (request.operation === 'validate') {
        // Pattern 1: Direct validation (fast path)
        result = await this.orchestrateDirectValidation(request, orchestrationId, startTime);
      } else if (request.operation === 'orchestrate') {
        // Pattern 2: Aggregate-then-validate (comprehensive path)
        result = await this.orchestrateAggregateValidation(request, orchestrationId, startTime);
      } else {
        throw new Error(`Unsupported orchestration operation: ${request.operation}`);
      }

      console.log(`✅ DATA ORCHESTRATOR 3: Orchestration complete (${result.orchestrationMetadata.duration}ms)`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💥 DATA ORCHESTRATOR 3: Orchestration failed (${duration}ms):`, error);
      
      // Return error result with minimal validation result
      return {
        success: false,
        validationResult: {
          packageId: 'orchestration-error',
          operation: request.validationOperation,
          entityType: request.entityType,
          overall: {
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Orchestration error'],
            warnings: [],
            metadata: {
              validationTime: 0,
              rulesApplied: [],
              packageId: 'orchestration-error',
              usedAggregation: false,
              engine: 'ValidationEngine30'
            }
          },
          threads: {}
        },
        orchestrationMetadata: {
          orchestrationId,
          operation: request.operation,
          timestamp: new Date().toISOString(),
          duration,
          aggregationUsed: false,
          orchestrator: 'DataOrchestrator3'
        }
      };
    }
  }

  /**
   * Pattern 1: Direct validation orchestration (fast path)
   * Bypasses aggregation for simple, fast validation
   */
  private async orchestrateDirectValidation(
    request: OrchestrationRequest, 
    orchestrationId: string, 
    startTime: number
  ): Promise<OrchestrationResult> {
    console.log(`⚡ DIRECT VALIDATION: Orchestrating ${request.entityType} for user ${request.context.userId}`);

    // Create validation request without aggregated context
    const validationRequest: ValidationRequest30 = {
      entityType: request.entityType,
      entityId: request.entityId,
      data: request.data,
      operation: request.validationOperation,
      context: {
        userId: request.context.userId,
        userRole: request.context.userRole
        // No aggregatedData - this is direct validation
      }
    };

    // Execute validation through ValidationEngine30
    const validationResult = await validationEngine30.validateAndExecute(
      request.validationOperation,
      request.entityType,
      request.data,
      {
        userId: request.context.userId,
        userRole: request.context.userRole
      },
      request.entityId
    );
    
    const duration = Date.now() - startTime;
    
    return {
      success: validationResult.overall.isValid,
      validationResult,
      // No aggregatedData in direct validation
      orchestrationMetadata: {
        orchestrationId,
        operation: 'validate',
        timestamp: new Date().toISOString(),
        duration,
        aggregationUsed: false,
        orchestrator: 'DataOrchestrator3'
      }
    };
  }

  /**
   * Pattern 2: Aggregate-then-validate orchestration (comprehensive path)
   * First aggregates user context, then validates with enhanced context
   */
  private async orchestrateAggregateValidation(
    request: OrchestrationRequest, 
    orchestrationId: string, 
    startTime: number
  ): Promise<OrchestrationResult> {
    console.log(`📊 AGGREGATE VALIDATION: Orchestrating ${request.entityType} for user ${request.context.userId}`);

    // Step 1: Aggregate user context using DataAggregationEngine
    const aggregatedData = await this.aggregateUserContext(request.context, request.entityType);
    
    // Step 2: Create enhanced validation request with aggregated context
    const validationRequest: ValidationRequest30 = {
      entityType: request.entityType,
      entityId: request.entityId,
      data: request.data,
      operation: request.validationOperation,
      context: {
        userId: request.context.userId,
        userRole: request.context.userRole,
        aggregatedData // Enhanced context from aggregation
      }
    };

    // Step 3: Execute validation through ValidationEngine30 with enhanced context
    const validationResult = await validationEngine30.validateAndExecute(
      request.validationOperation,
      request.entityType,
      request.data,
      {
        userId: request.context.userId,
        userRole: request.context.userRole,
        aggregatedData // Enhanced context from aggregation
      },
      request.entityId
    );
    
    const duration = Date.now() - startTime;
    
    return {
      success: validationResult.overall.isValid,
      validationResult,
      aggregatedData, // Return aggregated data for reference
      orchestrationMetadata: {
        orchestrationId,
        operation: 'orchestrate',
        timestamp: new Date().toISOString(),
        duration,
        aggregationUsed: true,
        orchestrator: 'DataOrchestrator3'
      }
    };
  }

  /**
   * Aggregate user context using DataAggregationEngine
   * Creates comprehensive user context for enhanced validation
   */
  private async aggregateUserContext(
    context: { userId: number; userRole: string }, 
    entityType: string
  ): Promise<AggregatedUserData | undefined> {
    try {
      console.log(`📊 AGGREGATION: Collecting user context for ${context.userId}`);

      // Create aggregation task for user context
      const aggregationTask: DataAggregationTask = {
        entityType: 'user',
        entityId: context.userId,
        requiredData: {
          postgresql: ['user', 'permissions', 'locations'],
          mongodb: ['notes'],
          redis: ['cache-keys']
        },
        compilationRules: {
          enhance: true,
          permissions: true,
          metadata: true
        },
        cacheStrategy: {
          category: 'orchestration-context',
          ttl: 300, // 5 minutes for orchestration context
          connectionId: `orchestrator-${context.userId}-${entityType}`
        }
      };

      // Execute aggregation through DataAggregationEngine
      const aggregatedData = await dataAggregationEngine.aggregate<AggregatedUserData>(aggregationTask);
      
      if (!aggregatedData) {
        console.warn(`⚠️ AGGREGATION: No data found for user ${context.userId}`);
        return undefined;
      }

      console.log(`✅ AGGREGATION: Context collected for user ${context.userId}`);
      return aggregatedData;

    } catch (error) {
      console.error(`💥 AGGREGATION ERROR:`, error);
      // Return undefined to fall back to basic validation
      return undefined;
    }
  }

  /**
   * Utility method: Get orchestration summary
   * Useful for debugging and monitoring orchestration patterns
   */
  getOrchestrationSummary(result: OrchestrationResult): string {
    const { orchestrationMetadata, validationResult } = result;
    
    return `DataOrchestrator3 ${orchestrationMetadata.operation}: ` +
           `${result.success ? 'SUCCESS' : 'FAILED'} in ${orchestrationMetadata.duration}ms ` +
           `(aggregation: ${orchestrationMetadata.aggregationUsed ? 'YES' : 'NO'}, ` +
           `validation: ${validationResult.overall.isValid ? 'PASS' : 'FAIL'}, ` +
           `errors: ${validationResult.overall.errors.length}, warnings: ${validationResult.overall.warnings.length})`;
  }
}

// Export singleton instance
export const dataOrchestrator3 = new DataOrchestrator3();