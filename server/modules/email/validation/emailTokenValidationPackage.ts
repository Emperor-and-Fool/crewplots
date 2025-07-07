/**
 * Email Token Validation Package
 * VE30 package for validating email verification tokens
 */

import { z } from 'zod';
import type { ValidationPackage } from '../../validation/types';
import { storage } from '../../../storage';
// TODO: SecurityService not implemented yet - using direct logic for now

// Schema for token validation request
const emailTokenValidationSchema = z.object({
  operation: z.literal('emailTokenValidation'),
  token: z.string().min(1, 'Token is required')
});

export const emailTokenValidationPackage: ValidationPackage = {
  // Schema validation
  schema: emailTokenValidationSchema,
  
  // Permission requirements (public endpoint - no auth required)
  permissions: [],
  
  // Business rule validation
  async validateBusinessRules(data: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Verify token format
      if (!SecurityService.isValidToken(data.token)) {
        errors.push('Invalid token format');
      }
      
      // Check if token exists and is not expired
      const tokenRecord = await storage.getUserEmailVerificationStatus(data.token);
      if (!tokenRecord) {
        errors.push('Token not found or expired');
      } else if (tokenRecord.expiresAt < new Date()) {
        errors.push('Token has expired');
      } else if (tokenRecord.isUsed) {
        errors.push('Token has already been used');
      }
    } catch (error) {
      errors.push('Failed to validate token');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Package assembly
  assemblePackage(data: any) {
    return {
      operation: 'emailTokenValidation',
      token: data.token,
      timestamp: new Date().toISOString()
    };
  },
  
  // Database transaction execution
  async executeTransaction(assembledData: any) {
    try {
      // Get token record
      const tokenRecord = await storage.getUserEmailVerificationStatus(assembledData.token);
      if (!tokenRecord) {
        return {
          success: false,
          error: 'Token not found or expired'
        };
      }
      
      // Mark token as used
      await storage.markEmailVerificationTokenUsed(assembledData.token);
      
      // Update user email verification status
      await storage.updateUserEmailVerification(tokenRecord.userId, true);
      
      // Get updated user
      const user = await storage.getUser(tokenRecord.userId);
      
      return {
        success: true,
        data: {
          userId: tokenRecord.userId,
          email: user?.email,
          verifiedAt: new Date().toISOString(),
          message: 'Email verified successfully'
        }
      };
    } catch (error) {
      console.error('[VE30] Token validation failed:', error);
      return {
        success: false,
        error: 'Failed to validate email token'
      };
    }
  }
};