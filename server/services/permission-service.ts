import { User } from '../../shared/schema'

export class PermissionService {

  // Static methods for batch/simple operations 
  static mapUserPermissions(user: User, modules: string[]): string[]
  static canPerformAction(user: User, permission: string): boolean
  static getDbPermissionsByRole(role: string): string[]
  static calculateRoleWorkflowIntersection(user: User, modules: string[]): string[]
  // Instance properties for caching interactive workflows
  private user: User
  private permissionCache: Map<string, string[]>
  private moduleCache: Map<string, boolean>
  private dbPermissionsCache: Map<string, string[]>

private static readonly MODULE_MAPPINGS: Record<string, string> = {
  // Users Module
  user: 'user',
  userList: 'user', 
  userManagement: 'user',
  userBulk: 'user',
  userSingle: 'user',
  
  // Locations Module  
  location: 'location',
  
  // Competencies Module
  competency: 'competency',
  
  // Scheduler Module
  scheduleBlock: 'schedule',
  weekSchedule: 'schedule', 
  shift: 'schedule',
  
  // Knowledge Base Module
  kbCategory: 'kb',
  kbArticle: 'kb',
  
  // Messaging Module (from packageRegistry30.ts)
  messaging: 'message',
  motivationNote: 'message',
  
  // Email Module (from packageRegistry30.ts)
  emailConfig: 'email',
  emailSent: 'email',
  emailVerification: 'email',
  emailVerificationStatus: 'email',
  emailTemplateInitialization: 'email',
  emailTokenValidation: 'email',
  emailTest: 'email',
  
  // Auth Module (from ValidationEngine30.ts)
  userProfile: 'user',
  authProfile: 'user',
  userRegistration: 'user'
}

  // Generic permission mapper for VE30 flow
  static mapUserPermissions(user: User, modules: string[]): string[] {
    const permissions = new Set<string>()

    // 1. Add database permissions
    user.permissions?.forEach((p: string) => permissions.add(p))

    // 2. Add role-based permissions  
    this.getRolePermissions(user.role).forEach((p: string) => permissions.add(p))

    // 3. Map workflow permissions by module
    modules.forEach(module => {
      const validationPrefix = this.MODULE_MAPPINGS[module]
      if (validationPrefix && user.workflowPermissions?.[module]) {
        const modulePerms = this.mapModuleWorkflowPermissions(
          user.workflowPermissions[module],
          validationPrefix
        )
        modulePerms.forEach((p: string) => permissions.add(p))
      }
    })

    return Array.from(permissions)
  }

  // Module-specific workflow mapping
  private static mapModuleWorkflowPermissions(workflows: string[], validationPrefix: string): string[] {
    return workflows.map(workflow => `${validationPrefix}.${workflow}`)
  }

  // Role-based permission mapping
  private static getRolePermissions(userRole: string): string[] {
    switch (userRole) {
      case 'administrator':
        return [
          'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete',
          'message.create', 'message.read', 'message.update', 'message.delete',
          'user.create', 'user.read', 'user.update', 'user.delete',
          'location.create', 'location.read', 'location.update', 'location.delete',
          'email.send', 'email.read', 'email.admin', 'email.verify',
          'competency.create', 'competency.read', 'competency.update', 'competency.delete',
          'kb.create', 'kb.read', 'kb.update', 'kb.delete',
          'development.testing'
        ]
      case 'owner':
        return [
          'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete',
          'message.create', 'message.read', 'message.update',
          'user.create', 'user.read', 'user.update',
          'location.read', 'location.update',
          'competency.read', 'competency.update',
          'kb.read', 'kb.update'
        ]
      case 'app_manager':
        return [
          'schedule.create', 'schedule.read', 'schedule.update',
          'message.create', 'message.read', 'message.update',
          'user.read', 'user.update',
          'location.read',
          'competency.read',
          'kb.read'
        ]
      case 'crew_chief':
        return [
          'schedule.read', 'schedule.update',
          'message.create', 'message.read',
          'user.read',
          'competency.read',
          'kb.read'
        ]
      case 'crew_member':
        return [
          'schedule.read',
          'message.read',
          'user.read',
          'kb.read'
        ]
      default:
        return ['schedule.read', 'message.read', 'kb.read']
    }
  }
}

// Export wrapper function for backward compatibility with existing VE30 calls
export function mapWorkflowToValidationPermissions(user: User, modules?: string[]): string[] {
  const defaultModules = ['scheduling', 'messaging', 'usermanagement', 'locations', 'email', 'competencies', 'knowledge-base']
  return PermissionService.mapUserPermissions(user, modules || defaultModules)
}

constructor(user: User) {
  this.user = user
  this.permissionCache = new Map()
  this.moduleCache = new Map()
  this.dbPermissionsCache = new Map()
}