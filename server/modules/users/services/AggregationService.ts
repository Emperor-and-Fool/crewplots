import type { DataAggregationTask } from '../../../services/validation/DataAggregationEngine';

/**
 * User Profile Aggregation Task Configuration
 * Module: User Management
 * Purpose: Comprehensive user profile data aggregation for applicant portal
 * 
 * Based on Plan 048 modular aggregation architecture
 * Following validation-v3.ts working pattern
 */

export function createUserProfileAggregationTask(userId: number): DataAggregationTask {
  return {
    entityType: 'user',
    entityId: userId,
    requiredData: {
      postgresql: ['user', 'locations', 'permissions'],
      mongodb: ['notes'],
      redis: ['cache-keys']
    },
    compilationRules: {
      enhance: true,
      permissions: true,
      metadata: true
    },
    cacheStrategy: {
      category: 'user-profile',
      ttl: 300, // 5 minutes cache
      connectionId: `profile-${userId}`
    }
  };
}

/**
 * User Profile Quick Task - Minimal data for basic profile views
 */
export function createUserProfileQuickTask(userId: number): DataAggregationTask {
  return {
    entityType: 'user',
    entityId: userId,
    requiredData: {
      postgresql: ['user'],
      mongodb: [],
      redis: ['cache-keys']
    },
    compilationRules: {
      enhance: false,
      permissions: false,
      metadata: false
    },
    cacheStrategy: {
      category: 'user-profile-quick',
      ttl: 600, // 10 minutes cache
      connectionId: `profile-quick-${userId}`
    }
  };
}