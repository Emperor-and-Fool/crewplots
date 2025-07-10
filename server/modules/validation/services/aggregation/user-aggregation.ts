import type { DataAggregationTask } from '../DataAggregationEngine';

/**
 * User Profile Aggregation Task Configuration
 * Based on 049 ProfileFetcher pattern evidence
 * Combines PostgreSQL user + MongoDB notes + Redis cache
 */
export const userProfileAggregationTask = (userId: number): DataAggregationTask => ({
  entityType: 'user',
  entityId: userId,
  requiredData: {
    postgresql: ['user'], // Base user data from PostgreSQL
    mongodb: ['notes'],   // Notes metadata from MongoDB via MessageStorage
    redis: []             // Future: cached session data, preferences
  },
  compilationRules: {
    enhance: true,        // Add calculated fields (displayName, etc.)
    permissions: false,   // Include permission context (future enhancement)
    metadata: true        // Include aggregation metadata
  },
  cacheStrategy: {
    category: 'user-profile',
    ttl: 3600,           // 1 hour (matching ProfileFetcher pattern)
    connectionId: `user-profile-${userId}`
  }
});

/**
 * User Management Aggregation Task
 * For admin/management views requiring extended user context
 */
export const userManagementAggregationTask = (userId: number): DataAggregationTask => ({
  entityType: 'user',
  entityId: userId,
  requiredData: {
    postgresql: ['user', 'locations', 'competencies'], // Extended PostgreSQL data
    mongodb: ['notes', 'documents'],                   // Full MongoDB context
    redis: ['session-data']                            // Session and activity data
  },
  compilationRules: {
    enhance: true,        // Full enhancement suite
    permissions: true,    // Include permission context for management
    metadata: true        // Include processing metadata
  },
  cacheStrategy: {
    category: 'user-management',
    ttl: 1800,           // 30 minutes (shorter for management data)
    connectionId: `user-mgmt-${userId}`
  }
});

/**
 * Applicant Workflow Aggregation Task  
 * Optimized for applicant-specific workflows and recruitment
 */
export const applicantWorkflowAggregationTask = (userId: number): DataAggregationTask => ({
  entityType: 'user',
  entityId: userId,
  requiredData: {
    postgresql: ['user'],              // Basic user data
    mongodb: ['notes'],                // Application notes and workflow data
    redis: []                          // Minimal Redis usage for applicants
  },
  compilationRules: {
    enhance: true,        // Basic enhancement (displayName, status)
    permissions: false,   // Applicants don't need permission context
    metadata: false       // Minimal metadata for applicant views
  },
  cacheStrategy: {
    category: 'applicant-workflow',
    ttl: 7200,           // 2 hours (longer cache for relatively static applicant data)
    connectionId: `applicant-${userId}`
  }
});

/**
 * Bulk User Aggregation Configuration
 * For dashboard and list views requiring multiple user contexts
 */
export const bulkUserAggregationConfig = {
  batchSize: 10,         // Process users in batches of 10
  parallelLimit: 3,      // Maximum 3 parallel aggregation operations
  cacheStrategy: {
    category: 'bulk-users',
    ttl: 1800,           // 30 minutes
    connectionId: 'bulk-user-aggregation'
  },
  compilationRules: {
    enhance: true,       // Basic enhancement for list views
    permissions: false,  // Skip permissions for bulk operations
    metadata: false      // No metadata for bulk operations
  }
};

/**
 * Factory function for creating task configurations
 * Provides standardized task creation with validation
 */
export const createUserAggregationTask = (
  userId: number,
  variant: 'profile' | 'management' | 'applicant' = 'profile'
): DataAggregationTask => {
  switch (variant) {
    case 'management':
      return userManagementAggregationTask(userId);
    case 'applicant':
      return applicantWorkflowAggregationTask(userId);
    case 'profile':
    default:
      return userProfileAggregationTask(userId);
  }
};