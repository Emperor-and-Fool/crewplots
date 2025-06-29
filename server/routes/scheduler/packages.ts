import express from 'express';
import { validationPackageService } from '../../services/validation-package-service';

const router = express.Router();

// Simple authentication middleware for packages routes
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = req.session.passport.user;
  next();
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