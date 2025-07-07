/**
 * Email Verification Status Package
 * VE30 package for checking user email verification status
 */

import { z } from 'zod';
import type { ValidationPackage } from '../../../validation/types';
import { storage } from '../../../storage';

// Schema for verification status check request
const emailVerificationStatusSchema = z.object({
  operation: z.literal('emailVerificationStatus'),
  userId: z.string().min(1, 'User ID is required')
});

export const emailVerificationStatusPackage: ValidationPackage = {
  // Schema validation
  schema: emailVerificationStatusSchema,
  
  // Permission requirements
  permissions: ['user.read'],
  
  // Business rule validation
  async validateBusinessRules(data: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check if user exists
      const user = await storage.getUser(data.userId);
      if (!user) {
        errors.push('User not found');
      }
    } catch (error) {
      errors.push('Failed to validate user existence');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Package assembly
  assemblePackage(data: any) {
    return {
      operation: 'emailVerificationStatus',
      userId: data.userId,
      timestamp: new Date().toISOString()
    };
  },
  
  // Database transaction execution
  async executeTransaction(assembledData: any) {
    try {
      const user = await storage.getUser(assembledData.userId);
      const verificationStatus = await storage.getEmailVerificationStatus(assembledData.userId);
      
      return {
        success: true,
        data: {
          userId: assembledData.userId,
          email: user?.email,
          isVerified: user?.emailVerified || false,
          verificationToken: verificationStatus?.token || null,
          verificationExpiry: verificationStatus?.expiresAt || null,
          lastVerificationAttempt: verificationStatus?.createdAt || null
        }
      };
    } catch (error) {
      console.error('[VE30] Email verification status check failed:', error);
      return {
        success: false,
        error: 'Failed to check email verification status'
      };
    }
  }
};