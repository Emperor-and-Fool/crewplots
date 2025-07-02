/**
 * ValidationEngine30.ts - Orchestrator for dual-use validation patterns
 * Plan 050: Completely separate, parallel service
 * 
 * ARCHITECTURE GAPS ADDRESSED:
 * 1. Orchestrator layer for dual-use patterns ✅
 * 2. Coordination with DataOrchestrator3.ts
 * 3. Bypasses direct aggregation calls through orchestration
 * 4. Validates aggregated data through dual-use workflow
 */

export interface ValidationRequest30 {
  operation: 'validate' | 'orchestrate';
  entityType: string;
  entityId?: number;
  data?: any;
  context: {
    userId: number;
    userRole: string;
  };
}

export interface ValidationResult30 {
  success: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
  metadata: {
    operation: 'validate' | 'orchestrate';
    duration: number;
    timestamp: string;
    useAggregation: boolean;
    orchestrator: 'ValidationEngine30';
  };
}

/**
 * ValidationEngine30 - Pure orchestrator (no business logic)
 * Coordinates between DataOrchestrator3 and validation workflows
 */
export class ValidationEngine30 {
  
  /**
   * Main orchestration entry point
   * Dual-use patterns:
   * - 'validate': Direct validation (fast)
   * - 'orchestrate': Aggregate-then-validate (comprehensive)
   */
  async execute(request: ValidationRequest30): Promise<ValidationResult30> {
    const startTime = Date.now();
    
    console.log(`🎯 VALIDATION ENGINE 30: Orchestrating ${request.operation} for ${request.entityType}`);

    try {
      let result: ValidationResult30;

      if (request.operation === 'validate') {
        // Direct validation path
        result = await this.orchestrateDirectValidation(request, startTime);
      } else if (request.operation === 'orchestrate') {
        // Aggregate-then-validate path
        result = await this.orchestrateAggregateValidation(request, startTime);
      } else {
        throw new Error(`Unsupported operation: ${request.operation}`);
      }

      console.log(`✅ VALIDATION ENGINE 30: Orchestration complete (${result.metadata.duration}ms)`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ VALIDATION ENGINE 30: Orchestration failed:`, error);
      
      return {
        success: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Orchestration error'],
        warnings: [],
        metadata: {
          operation: request.operation,
          duration,
          timestamp: new Date().toISOString(),
          useAggregation: request.operation === 'orchestrate',
          orchestrator: 'ValidationEngine30'
        }
      };
    }
  }

  /**
   * Orchestrate direct validation (no aggregation)
   * Fast path for simple validation needs
   */
  private async orchestrateDirectValidation(
    request: ValidationRequest30, 
    startTime: number
  ): Promise<ValidationResult30> {
    console.log(`⚡ DIRECT VALIDATION: Processing ${request.entityType} for user ${request.context.userId}`);

    // Direct validation logic (minimal, fast)
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Basic validation without DataOrchestrator3
    if (!this.hasBasicAccess(request.context.userRole, request.entityType)) {
      validationErrors.push(`Access denied for ${request.entityType}`);
    }

    if (request.data && !this.isValidBasicData(request.data, request.entityType)) {
      validationErrors.push(`Invalid data for ${request.entityType}`);
    }

    const duration = Date.now() - startTime;
    const isValid = validationErrors.length === 0;

    return {
      success: true,
      isValid,
      errors: validationErrors,
      warnings: validationWarnings,
      data: request.data,
      metadata: {
        operation: 'validate',
        duration,
        timestamp: new Date().toISOString(),
        useAggregation: false,
        orchestrator: 'ValidationEngine30'
      }
    };
  }

  /**
   * Orchestrate aggregate-then-validate (comprehensive)
   * Routes through DataOrchestrator3 for full context validation
   */
  private async orchestrateAggregateValidation(
    request: ValidationRequest30, 
    startTime: number
  ): Promise<ValidationResult30> {
    console.log(`📊 AGGREGATE VALIDATION: Processing ${request.entityType} for user ${request.context.userId}`);

    // NOTE: This will coordinate with DataOrchestrator3 once created
    // For now, placeholder orchestration logic
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Placeholder: Will use DataOrchestrator3.coordinate() 
    // to aggregate data and then validate the aggregated result
    validationWarnings.push('DataOrchestrator3 integration pending');

    // Enhanced validation with aggregated context (placeholder)
    if (!this.hasEnhancedAccess(request.context.userRole, request.entityType)) {
      validationErrors.push(`Insufficient permissions for ${request.entityType}`);
    }

    const duration = Date.now() - startTime;
    const isValid = validationErrors.length === 0;

    return {
      success: true,
      isValid,
      errors: validationErrors,
      warnings: validationWarnings,
      data: request.data,
      metadata: {
        operation: 'orchestrate',
        duration,
        timestamp: new Date().toISOString(),
        useAggregation: true,
        orchestrator: 'ValidationEngine30'
      }
    };
  }

  /**
   * Basic access check for direct validation
   */
  private hasBasicAccess(userRole: string, entityType: string): boolean {
    const basicAccess: Record<string, string[]> = {
      'administrator': ['user', 'schedule', 'shift', 'location'],
      'owner': ['user', 'schedule', 'shift', 'location'],
      'app_manager': ['schedule', 'shift'],
      'crew_chief': ['shift'],
      'crew_member': ['shift'],
      'applicant': []
    };

    return basicAccess[userRole]?.includes(entityType) || false;
  }

  /**
   * Enhanced access check for aggregated validation
   */
  private hasEnhancedAccess(userRole: string, entityType: string): boolean {
    // More sophisticated permission checking with aggregated context
    // Will be enhanced once DataOrchestrator3 provides aggregated permissions
    return this.hasBasicAccess(userRole, entityType);
  }

  /**
   * Basic data validation
   */
  private isValidBasicData(data: any, entityType: string): boolean {
    switch (entityType) {
      case 'user':
        return !!(data.username && data.email);
      case 'schedule':
        return !!(data.name);
      case 'shift':
        return !!(data.startTime && data.endTime);
      default:
        return true;
    }
  }
}

// Export singleton instance
export const validationEngine30 = new ValidationEngine30();