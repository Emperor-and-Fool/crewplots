import express from 'express';
import { validationPackageService } from '../../services/validation-package-service';
import { storage } from '../../storage';

const router = express.Router();

// Authentication middleware for packages routes
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    console.log('🔐 PACKAGES AUTH: Checking session authentication');
    console.log('🔐 PACKAGES AUTH: Session ID:', req.sessionID || 'none');
    console.log('🔐 PACKAGES AUTH: Session data:', req.session);
    
    if (!req.session?.passport?.user) {
      console.log('🔐 PACKAGES AUTH: No passport session found');
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    const sessionUser = req.session.passport.user;
    console.log('🔐 PACKAGES AUTH: Found session user:', sessionUser);
    
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      console.log('🔐 PACKAGES AUTH: User not found for session userId:', sessionUser.id);
      return res.status(401).json({ error: 'Invalid session - Please log in again' });
    }

    req.user = user;
    console.log('🔐 PACKAGES AUTH: User authenticated successfully:', user.username, 'Role:', user.role);
    next();
  } catch (error) {
    console.error('🔐 PACKAGES AUTH: Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// POST /api/scheduler/packages/validate - Validate schedule package
router.post('/validate', requireAuth, async (req: any, res) => {
  try {
    console.log('🔍 PACKAGE VALIDATION: Starting validation request');

    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      req.body,
      req.user,
      req.body.packageType || 'create'
    );

    // Thread 2: Integrity Validation
    const integrityResult = await validationPackageService.validatePackageIntegrity(packageData);

    // Thread 3: Permission Authorization
    const authResult = await validationPackageService.validatePackagePermissions(packageData);

    console.log('🔍 PACKAGE VALIDATION: Validation completed:', {
      integrity: integrityResult.isValid,
      permissions: authResult.isAuthorized,
      errors: integrityResult.errors.length,
      warnings: integrityResult.warnings.length
    });

    res.status(200).json({
      isValid: integrityResult.isValid && authResult.isAuthorized,
      integrity: integrityResult,
      permissions: authResult,
      packageData: {
        type: packageData.packageType,
        scheduleBlock: packageData.scheduleBlock.name,
        weekSchedules: packageData.weekSchedules.length,
        shifts: packageData.shifts.length
      }
    });

  } catch (error) {
    console.error('🔍 PACKAGE VALIDATION: Error:', error);
    res.status(500).json({ 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/scheduler/packages/create - Create schedule package
router.post('/create', requireAuth, async (req: any, res) => {
  try {
    console.log('🎁 PACKAGE API: Starting package creation');

    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      req.body,
      req.user,
      'create'
    );

    // Thread 2: Integrity Validation
    const integrityResult = await validationPackageService.validatePackageIntegrity(packageData);
    if (!integrityResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Package validation failed',
        details: integrityResult.errors,
        warnings: integrityResult.warnings
      });
    }

    // Thread 3: Permission Authorization
    const authResult = await validationPackageService.validatePackagePermissions(packageData);
    if (!authResult.isAuthorized) {
      return res.status(403).json({ 
        error: 'Access denied',
        deniedPermissions: authResult.deniedPermissions
      });
    }

    // Thread 4: Storage Transaction
    const saveResult = await validationPackageService.executeStorageTransaction(packageData);
    if (!saveResult.success) {
      return res.status(500).json({ 
        error: 'Failed to save schedule package',
        details: saveResult.errors
      });
    }

    console.log('🎁 PACKAGE API: Package created successfully:', saveResult.createdEntities);
    res.status(201).json({
      success: true,
      package: {
        id: saveResult.createdEntities.scheduleBlockId,
        type: packageData.packageType,
        createdEntities: saveResult.createdEntities
      }
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Creation failed:', error);
    res.status(500).json({ 
      error: 'Package creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;