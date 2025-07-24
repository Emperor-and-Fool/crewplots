import { db } from '../db'
import { users } from '../../shared/schema'
import { eq } from 'drizzle-orm'

// Simple workflow-based permission service
export class PermissionService {
  
  // Get user permissions for specific workflow from database
  static async getUserWorkflowPermissions(userId: number, workflow: string): Promise<string[]> {
    try {
      // Get user from database
      const user = await db
        .select({ workflow_permissions: users.workflowPermissions })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user[0] || !user[0].workflow_permissions) {
        return []
      }

      // Parse workflow permissions JSON
      const workflowPermissions = JSON.parse(user[0].workflow_permissions as string)
      
      // Check if user has access to requested workflow
      if (!workflowPermissions[workflow]) {
        return []
      }

      // Map workflow actions to database permissions
      const workflowActions = workflowPermissions[workflow]
      const modulePermissions = this.mapWorkflowToPermissions(workflow, workflowActions)
      
      return modulePermissions
      
    } catch (error) {
      console.error('Error getting workflow permissions:', error)
      return []
    }
  }

  // Map workflow actions to specific database permissions
  private static mapWorkflowToPermissions(workflow: string, actions: string[]): string[] {
    const permissions: string[] = []
    
    switch (workflow) {
      case 'scheduling':
        actions.forEach(action => {
          switch (action) {
            case 'view':
              permissions.push('schedule.read')
              break
            case 'create':
              permissions.push('schedule.create')
              break
            case 'edit':
              permissions.push('schedule.update')
              break
            case 'delete':
              permissions.push('schedule.delete')
              break
            case 'assign':
              permissions.push('schedule.assign_users')
              break
          }
        })
        break
        
      case 'crew':
        actions.forEach(action => {
          switch (action) {
            case 'view':
              permissions.push('crew_planning')
              break
            case 'manage':
              permissions.push('location.access_all')
              break
            case 'schedule':
              permissions.push('schedule.read')
              break
            case 'assign':
              permissions.push('schedule.assign_users')
              break
          }
        })
        break
        
      case 'financial':
        actions.forEach(action => {
          switch (action) {
            case 'view':
              permissions.push('financial.view')
              break
            case 'edit':
              permissions.push('financial.edit')
              break
            case 'reports':
              permissions.push('financial.reports')
              break
            case 'approve':
              permissions.push('financial.approve')
              break
          }
        })
        break
        
      case 'location':
        actions.forEach(action => {
          switch (action) {
            case 'view':
              permissions.push('location.access_owned')
              break
            case 'edit':
              permissions.push('location.access_managed')
              break
            case 'create':
              permissions.push('location.access_all')
              break
            case 'delete':
              permissions.push('location.access_all')
              break
            case 'manage_users':
              permissions.push('location.access_all')
              break
          }
        })
        break
        
      case 'application':
        actions.forEach(action => {
          switch (action) {
            case 'view':
              permissions.push('user.read')
              break
            case 'hire':
              permissions.push('user.update')
              break
            case 'delete':
              permissions.push('user.delete')
              break
            case 'edit':
              permissions.push('user.update')
              break
            case 'status_update':
              permissions.push('user.update')
              break
          }
        })
        break
    }
    
    return permissions
  }
}