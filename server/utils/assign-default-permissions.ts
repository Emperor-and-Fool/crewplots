import { storage } from '../storage';
import { getDefaultWorkflowPermissions, shouldAssignDefaultPermissions } from './default-permissions';

/**
 * Assign default workflow permissions to all existing users who don't have them
 * This is a one-time utility to migrate existing users to the new permission system
 */
export async function assignDefaultPermissionsToExistingUsers(): Promise<void> {
  console.log('🔧 Assigning default workflow permissions to existing users...');
  
  try {
    const allUsers = await storage.getUsers();
    let updatedCount = 0;
    
    for (const user of allUsers) {
      // Skip if user already has workflow permissions or shouldn't get them
      if (user.workflowPermissions || !shouldAssignDefaultPermissions(user.role)) {
        continue;
      }
      
      const defaultPermissions = getDefaultWorkflowPermissions(user.role);
      
      if (Object.keys(defaultPermissions).length > 0) {
        await storage.updateUser(user.id, {
          workflowPermissions: defaultPermissions
        });
        
        console.log(`✅ Assigned default permissions to ${user.username} (${user.role}):`, 
          Object.keys(defaultPermissions));
        updatedCount++;
      }
    }
    
    console.log(`🎉 Successfully assigned default permissions to ${updatedCount} users`);
  } catch (error) {
    console.error('❌ Error assigning default permissions:', error);
    throw error;
  }
}

/**
 * Initialize workflow permissions for a new user based on their role
 */
export function initializeWorkflowPermissions(role: string): Record<string, string[]> | undefined {
  if (shouldAssignDefaultPermissions(role)) {
    return getDefaultWorkflowPermissions(role);
  }
  return undefined;
}