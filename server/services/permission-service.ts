import { User } from '../../shared/schema'

export class PermissionService {

  // Static methods for batch/simple operations 
  // static mapUserPermissions(user: User, modules: string[]): string[]
  // static canPerformAction(user: User, permission: string): boolean
  // static getDbPermissionsByRole(role: string): string[]
  // static calculateRoleWorkflowIntersection(user: User, modules: string[]): string[]
  // Instance properties for caching interactive workflows
  // private user: User
  // private permissionCache: Map<string, string[]>
  // private moduleCache: Map<string, boolean>
  // private dbPermissionsCache: Map<string, string[]>

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

  // Generic permission mapper for VE30 flow - now uses database permissions
  static async mapUserPermissions(user: User, modules: string[]): Promise<string[]> {
    const permissions = new Set<string>()

    // Get database permissions for user's role
    const rolePermissions = await this.getDatabasePermissions(user.role)
    
    // Filter permissions relevant to requested modules
    modules.forEach(module => {
      const validationPrefix = this.MODULE_MAPPINGS[module]
      if (validationPrefix) {
        // Add permissions that match the module prefix
        const modulePermissions = rolePermissions.filter(perm => 
          perm.startsWith(`${validationPrefix}.`) || 
          perm.startsWith('location.') ||
          perm.startsWith('messaging.') ||
          perm.startsWith('email.') ||
          perm.startsWith('competency.') ||
          perm.startsWith('crew_planning') ||
          perm.startsWith('development.')
        )
        modulePermissions.forEach(p => permissions.add(p))
      }
    })

    // Enhanced permissions with competency system for crew_member
    const enhancedPermissions = await this.enhancePermissionsWithCompetencies(user, Array.from(permissions))
    
    return enhancedPermissions
  }

  // Module-specific workflow mapping
  private static mapModuleWorkflowPermissions(workflows: string[], validationPrefix: string): string[] {
    return workflows.map(workflow => `${validationPrefix}.${workflow}`)
  }

  // Get permissions from database role_permissions junction table
  private static async getDatabasePermissions(role: string): Promise<string[]> {
    try {
      const { db } = await import('../db')
      const { roles, permissions, rolePermissions } = await import('../../shared/schema')
      const { eq } = await import('drizzle-orm')
      
      const result = await db
        .select({ name: permissions.name })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .where(eq(roles.name, role))
      
      return result.map(row => row.name)
    } catch (error) {
      console.error('❌ Error fetching database permissions:', error)
      return []
    }
  }

  // Competency-based permission enhancement for crew_member financial access
  private static async enhancePermissionsWithCompetencies(user: User, basePermissions: string[]): Promise<string[]> {
    if (user.role !== 'crew_member') {
      return basePermissions
    }

    try {
      const { db } = await import('../db')
      const { competencies, userCompetencies } = await import('../../shared/schema')
      const { eq, and } = await import('drizzle-orm')
      
      const competencyResult = await db
        .select({ name: competencies.name, financial_access: competencies.financialAccess })
        .from(competencies)
        .innerJoin(userCompetencies, eq(competencies.id, userCompetencies.competencyId))
        .where(and(
          eq(userCompetencies.userId, user.id),
          eq(competencies.financialAccess, true)
        ))

      if (competencyResult.length > 0) {
        // Crew member with financial competency gets additional financial permissions
        const enhancedPermissions = [...basePermissions]
        enhancedPermissions.push(
          'financial.read',
          'financial.create', 
          'financial.update'
        )
        console.log(`🎯 Enhanced permissions for ${user.username} with financial competency`)
        return enhancedPermissions
      }
    } catch (error) {
      console.error('❌ Error checking competencies:', error)
    }

    return basePermissions
  }
}

// Export wrapper function for backward compatibility with existing VE30 calls
export async function mapWorkflowToValidationPermissions(user: User, modules?: string[]): Promise<string[]> {
  const defaultModules = ['scheduling', 'messaging', 'usermanagement', 'locations', 'email', 'competencies', 'knowledge-base']
  return await PermissionService.mapUserPermissions(user, modules || defaultModules)
}

// constructor(user: User) {
//   this.user = user
//   this.permissionCache = new Map()
//   this.moduleCache = new Map()
//   this.dbPermissionsCache = new Map()
// }