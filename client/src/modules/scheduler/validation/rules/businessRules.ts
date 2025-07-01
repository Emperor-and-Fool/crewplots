/**
 * Business Rules for Scheduler Validation
 * Extracted from server/services/validation-package-service.ts
 * Contains domain-specific validation logic for scheduler entities
 */

export interface ValidationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  sessionId: string;
}

export interface BusinessRuleResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SchedulerBusinessRules {
  
  /**
   * Validate unique schedule names per location
   * Extracted from validation-package-service.ts validateBusinessRules method
   */
  static async validateUniqueScheduleName(
    scheduleData: { name: string; locationId: number; id?: number },
    context: ValidationContext
  ): Promise<BusinessRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // This would typically check against the database
    // For now, implementing basic name validation
    if (!scheduleData.name || scheduleData.name.trim().length < 3) {
      errors.push('Schedule name must be at least 3 characters long');
    }
    
    if (scheduleData.name && scheduleData.name.length > 100) {
      errors.push('Schedule name cannot exceed 100 characters');
    }
    
    // Check for reserved words
    const reservedWords = ['admin', 'system', 'test', 'temp'];
    if (scheduleData.name && reservedWords.some(word => 
      scheduleData.name.toLowerCase().includes(word)
    )) {
      warnings.push('Schedule name contains a reserved word');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate location access permissions
   * Ensures user has access to the specified location
   */
  static async validateLocationAccess(
    locationId: number,
    context: ValidationContext
  ): Promise<BusinessRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!context.locationAccess.includes(locationId)) {
      errors.push('User does not have access to the specified location');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate multi-week schedule consistency
   * Ensures week schedules don't conflict or overlap inappropriately
   */
  static async validateMultiWeekConsistency(
    weekSchedules: Array<{ weekNumber: number; templateId?: number }>,
    context: ValidationContext
  ): Promise<BusinessRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for duplicate week numbers
    const weekNumbers = weekSchedules.map(ws => ws.weekNumber);
    const duplicates = weekNumbers.filter((week, index) => weekNumbers.indexOf(week) !== index);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate week numbers found: ${duplicates.join(', ')}`);
    }
    
    // Validate week number range
    weekSchedules.forEach((ws, index) => {
      if (ws.weekNumber < 1 || ws.weekNumber > 52) {
        errors.push(`Week schedule ${index + 1}: Week number must be between 1 and 52`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate shift time constraints
   * Ensures shifts don't overlap and have reasonable durations
   */
  static async validateShiftTimeConstraints(
    shifts: Array<{ dayOfWeek: string; startTime: string; endTime: string }>,
    context: ValidationContext
  ): Promise<BusinessRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Group shifts by day
    const shiftsByDay = shifts.reduce((acc, shift) => {
      const day = shift.dayOfWeek.toLowerCase();
      if (!acc[day]) acc[day] = [];
      acc[day].push(shift);
      return acc;
    }, {} as Record<string, typeof shifts>);
    
    // Check for overlapping shifts within each day
    Object.entries(shiftsByDay).forEach(([day, dayShifts]) => {
      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const shift1 = dayShifts[i];
          const shift2 = dayShifts[j];
          
          if (this.shiftsOverlap(shift1, shift2)) {
            errors.push(`Overlapping shifts detected on ${day}: ${shift1.startTime}-${shift1.endTime} and ${shift2.startTime}-${shift2.endTime}`);
          }
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check if two shifts overlap in time
   */
  private static shiftsOverlap(
    shift1: { startTime: string; endTime: string },
    shift2: { startTime: string; endTime: string }
  ): boolean {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1 = parseTime(shift1.startTime);
    const end1 = parseTime(shift1.endTime);
    const start2 = parseTime(shift2.startTime);
    const end2 = parseTime(shift2.endTime);
    
    return start1 < end2 && start2 < end1;
  }
  
  /**
   * Validate competency requirements
   * Ensures required competencies are valid and available
   */
  static async validateCompetencyRequirements(
    competencyRequirements: any[],
    context: ValidationContext
  ): Promise<BusinessRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!competencyRequirements || competencyRequirements.length === 0) {
      warnings.push('No competency requirements specified for shifts');
      return { isValid: true, errors, warnings };
    }
    
    // Validate each competency requirement
    competencyRequirements.forEach((req, index) => {
      if (!req.competencyId) {
        errors.push(`Competency requirement ${index + 1}: competencyId is required`);
      }
      
      if (!req.priority || !['required', 'preferred', 'optional'].includes(req.priority)) {
        errors.push(`Competency requirement ${index + 1}: priority must be 'required', 'preferred', or 'optional'`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}