// server/services/PermissionService.ts
export class PermissionService {

  // Module workflow → validation permission mappings
  private static readonly MODULE_MAPPINGS = {
    scheduling: 'schedule',
    messaging: 'message', 
    usermanagement: 'user',
    locations: 'location',
    email: 'email'
  }

  // Generic permission mapper
  static mapUserPermissions(user: User, modules: string[]): string[] {
    const permissions = new Set<string>()

    // 1. Add database permissions
    user.permissions?.forEach(p => permissions.add(p))

    // 2. Add role-based permissions  
    this.getRolePermissions(user.role).forEach(p => permissions.add(p))

    // 3. Map workflow permissions by module
    modules.forEach(module => {
      const validationPrefix = this.MODULE_MAPPINGS[module]
      if (validationPrefix) {
        const modulePerms = this.mapWorkflowToValidationPermissions(
          user.workflowPermissions?.[module] || [],
          validationPrefix  // ← Uses mapping table
        )
        modulePerms.forEach(p => permissions.add(p))
      }
    })

    return Array.from(permissions)
  }

  // Module-specific workflow mapping
  private static mapWorkflowToValidationPermissions(workflows: string[], validationPrefix: string): string[] {
    return workflows.map(workflow => `${validationPrefix}.${workflow}`)
  }
} I am sure you