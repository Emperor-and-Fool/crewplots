import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { db } from '../../db';
import { roles, permissions, rolePermissions, competencies, userCompetencies } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

interface PermissionTestResult {
  userId: number;
  username: string;
  role: string;
  baseRolePermissions: string[];
  competencyPermissions: string[];
  finalPermissions: string[];
  totalPermissions: number;
  testTimestamp: string;
  processingTime: number;
}

interface DatabaseStats {
  totalRoles: number;
  totalPermissions: number;
  totalRolePermissions: number;
  totalCompetencies: number;
  totalUserCompetencies: number;
}

// Test endpoint for permission service data assembly
router.get('/permission-test', authenticateUser, async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🧪 PERMISSION TEST: Starting database assembly test for admin user');
    
    // Get current user from auth middleware
    const testUser = req.user;
    if (!testUser) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`🧪 Testing permission assembly for user: ${testUser.username} (${testUser.role})`);

    // Step 1: Get base role permissions from database
    console.log('🧪 Step 1: Loading base role permissions...');
    const baseRoleResult = await db
      .select({ name: permissions.name })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .where(eq(roles.name, testUser.role));
    
    const baseRolePermissions = baseRoleResult.map(row => row.name);
    console.log(`🧪 Found ${baseRolePermissions.length} base role permissions`);

    // Step 2: Get competency-based permissions (if user is crew_member)
    console.log('🧪 Step 2: Loading competency permissions...');
    let competencyPermissions: string[] = [];
    
    if (testUser.role === 'crew_member') {
      const competencyResult = await db
        .select({ name: competencies.name })
        .from(competencies)
        .innerJoin(userCompetencies, eq(competencies.id, userCompetencies.competencyId))
        .where(eq(userCompetencies.userId, testUser.id));

      if (competencyResult.length > 0) {
        competencyPermissions = [
          'financial.read',
          'financial.create', 
          'financial.update'
        ];
        console.log(`🧪 Added ${competencyPermissions.length} financial competency permissions`);
      }
    } else {
      console.log(`🧪 Role ${testUser.role} does not qualify for competency permissions`);
    }

    // Step 3: Assemble final permission set
    console.log('🧪 Step 3: Assembling final permission set...');
    const finalPermissions = Array.from(new Set([...baseRolePermissions, ...competencyPermissions]));
    
    // Get database statistics
    console.log('🧪 Step 4: Gathering database statistics...');
    const [
      rolesCount,
      permissionsCount, 
      rolePermissionsCount,
      competenciesCount,
      userCompetenciesCount
    ] = await Promise.all([
      db.select().from(roles),
      db.select().from(permissions),
      db.select().from(rolePermissions),
      db.select().from(competencies),
      db.select().from(userCompetencies)
    ]);

    const databaseStats: DatabaseStats = {
      totalRoles: rolesCount.length,
      totalPermissions: permissionsCount.length,
      totalRolePermissions: rolePermissionsCount.length,
      totalCompetencies: competenciesCount.length,
      totalUserCompetencies: userCompetenciesCount.length
    };

    const processingTime = Date.now() - startTime;

    const testResult: PermissionTestResult = {
      userId: testUser.id,
      username: testUser.username,
      role: testUser.role,
      baseRolePermissions,
      competencyPermissions,
      finalPermissions,
      totalPermissions: finalPermissions.length,
      testTimestamp: new Date().toISOString(),
      processingTime
    };

    console.log(`🧪 PERMISSION TEST COMPLETE: Assembled ${finalPermissions.length} permissions in ${processingTime}ms`);
    console.log(`🧪 Final permissions: ${finalPermissions.slice(0, 5).join(', ')}...`);

    res.json({
      success: true,
      permissionTest: testResult,
      databaseStats,
      ve30Compatible: true,
      message: 'Permission service database assembly test completed successfully'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('🧪 PERMISSION TEST FAILED:', error);
    
    res.status(500).json({
      success: false,
      error: 'Permission test failed',
      processingTime,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;