import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { validationPackageService } from '../../services/validation-package-service';
import type { User } from '@shared/schema';

const router = Router();

// All routes use the new authentication middleware
router.use(authenticateUser);

// POST /api/scheduler/packages - Create new schedule package
router.post('/', async (req, res) => {
  console.log('🎁 PACKAGE API: Creating new schedule package');
  
  try {
    const user = req.user as User;
    
    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      req.body,
      user,
      'create'
    );

    // Thread 2: Integrity Validation
    const integrityResult = await validationPackageService.validatePackageIntegrity(packageData);
    if (!integrityResult.isValid) {
      console.log('🎁 PACKAGE API: Integrity validation failed:', integrityResult.errors);
      return res.status(400).json({ 
        error: 'Package validation failed',
        details: integrityResult.errors,
        warnings: integrityResult.warnings
      });
    }

    // Thread 3: Permission Authorization
    const authResult = await validationPackageService.validatePackagePermissions(packageData);
    if (!authResult.isAuthorized) {
      console.log('🎁 PACKAGE API: Permission authorization failed:', authResult.deniedPermissions);
      return res.status(403).json({ 
        error: 'Access denied',
        deniedPermissions: authResult.deniedPermissions,
        securityViolations: authResult.securityViolations
      });
    }

    // Thread 4: Storage Transaction
    const saveResult = await validationPackageService.savePackageTransaction(packageData);
    if (!saveResult.success) {
      console.log('🎁 PACKAGE API: Storage transaction failed:', saveResult.errors);
      return res.status(500).json({ 
        error: 'Failed to save schedule package',
        details: saveResult.errors
      });
    }

    console.log('🎁 PACKAGE API: Package created successfully:', saveResult.createdEntities);
    res.status(201).json({
      success: true,
      package: {
        scheduleBlockId: saveResult.createdEntities.scheduleBlockId,
        weekScheduleIds: saveResult.createdEntities.weekScheduleIds,
        shiftIds: saveResult.createdEntities.shiftIds
      },
      metadata: packageData.metadata,
      warnings: integrityResult.warnings
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Package creation failed:', error);
    res.status(500).json({ 
      error: 'Internal server error during package creation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/scheduler/packages/:id - Update existing schedule package
router.put('/:id', async (req, res) => {
  console.log('🎁 PACKAGE API: Updating schedule package:', req.params.id);
  
  try {
    const user = req.user as User;
    const scheduleBlockId = parseInt(req.params.id);
    
    // Add the schedule block ID to the request body for validation
    const requestData = {
      ...req.body,
      scheduleBlock: {
        ...req.body.scheduleBlock,
        id: scheduleBlockId
      }
    };

    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      requestData,
      user,
      'update'
    );

    // Thread 2: Integrity Validation
    const integrityResult = await validationPackageService.validatePackageIntegrity(packageData);
    if (!integrityResult.isValid) {
      console.log('🎁 PACKAGE API: Integrity validation failed:', integrityResult.errors);
      return res.status(400).json({ 
        error: 'Package validation failed',
        details: integrityResult.errors,
        warnings: integrityResult.warnings
      });
    }

    // Thread 3: Permission Authorization
    const authResult = await validationPackageService.validatePackagePermissions(packageData);
    if (!authResult.isAuthorized) {
      console.log('🎁 PACKAGE API: Permission authorization failed:', authResult.deniedPermissions);
      return res.status(403).json({ 
        error: 'Access denied',
        deniedPermissions: authResult.deniedPermissions,
        securityViolations: authResult.securityViolations
      });
    }

    // Thread 4: Storage Transaction
    const saveResult = await validationPackageService.savePackageTransaction(packageData);
    if (!saveResult.success) {
      console.log('🎁 PACKAGE API: Storage transaction failed:', saveResult.errors);
      return res.status(500).json({ 
        error: 'Failed to update schedule package',
        details: saveResult.errors
      });
    }

    console.log('🎁 PACKAGE API: Package updated successfully:', saveResult.createdEntities);
    res.json({
      success: true,
      package: {
        scheduleBlockId: saveResult.createdEntities.scheduleBlockId,
        weekScheduleIds: saveResult.createdEntities.weekScheduleIds,
        shiftIds: saveResult.createdEntities.shiftIds
      },
      metadata: packageData.metadata,
      warnings: integrityResult.warnings
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Package update failed:', error);
    res.status(500).json({ 
      error: 'Internal server error during package update',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/scheduler/packages/validate - Validate schedule package (Phase 1 Verification)
router.post('/validate', async (req, res) => {
  console.log('🔍 PACKAGE VALIDATION: Starting validation request');
  
  try {
    const user = req.user as User;
    
    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      req.body,
      user,
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

    res.json({
      isValid: integrityResult.isValid && authResult.isAuthorized,
      integrity: {
        isValid: integrityResult.isValid,
        errors: integrityResult.errors,
        warnings: integrityResult.warnings
      },
      permissions: {
        isAuthorized: authResult.isAuthorized,
        deniedPermissions: authResult.deniedPermissions,
        securityViolations: authResult.securityViolations
      },
      packageData: {
        type: packageData.packageType,
        scheduleBlock: packageData.scheduleBlock.name,
        weekSchedules: packageData.weekSchedules.length,
        shifts: packageData.shifts.length
      }
    });

  } catch (error) {
    console.error('🔍 PACKAGE VALIDATION: Validation failed:', error);
    res.status(400).json({ 
      error: 'Validation request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/scheduler/packages/:id - Delete schedule package
router.delete('/:id', async (req, res) => {
  console.log('🎁 PACKAGE API: Deleting schedule package:', req.params.id);
  
  try {
    const user = req.user as User;
    const scheduleBlockId = parseInt(req.params.id);
    
    // Create minimal package for deletion validation
    const requestData = {
      scheduleBlock: { id: scheduleBlockId },
      weekSchedules: [],
      shifts: []
    };

    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      requestData,
      user,
      'delete'
    );

    // Thread 3: Permission Authorization (skip integrity for deletion)
    const authResult = await validationPackageService.validatePackagePermissions(packageData);
    if (!authResult.isAuthorized) {
      console.log('🎁 PACKAGE API: Permission authorization failed:', authResult.deniedPermissions);
      return res.status(403).json({ 
        error: 'Access denied',
        deniedPermissions: authResult.deniedPermissions,
        securityViolations: authResult.securityViolations
      });
    }

    // Delete in reverse Russian doll order: shifts -> week schedules -> schedule block
    // TODO: Implement deletion logic when needed
    
    console.log('🎁 PACKAGE API: Package deletion authorized');
    res.json({
      success: true,
      message: 'Package deletion authorized',
      metadata: packageData.metadata
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Package deletion failed:', error);
    res.status(500).json({ 
      error: 'Internal server error during package deletion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/scheduler/packages/:id/duplicate - Duplicate schedule package
router.post('/:id/duplicate', async (req, res) => {
  console.log('🎁 PACKAGE API: Duplicating schedule package:', req.params.id);
  
  try {
    const user = req.user as User;
    const sourceScheduleBlockId = parseInt(req.params.id);
    
    // TODO: Implement package duplication logic
    // This would fetch existing package, modify IDs, and create new package
    
    res.json({
      success: true,
      message: 'Package duplication endpoint ready for implementation',
      sourceId: sourceScheduleBlockId
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Package duplication failed:', error);
    res.status(500).json({ 
      error: 'Internal server error during package duplication',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/scheduler/packages/validate - Validate package without saving
router.post('/validate', async (req, res) => {
  console.log('🎁 PACKAGE API: Validating schedule package (dry run)');
  
  try {
    const user = req.user as User;
    
    // Thread 1: Package Assembly
    const packageData = await validationPackageService.assemblePackageFromRequest(
      req.body,
      user,
      req.body.packageType || 'create'
    );

    // Thread 2: Integrity Validation
    const integrityResult = await validationPackageService.validatePackageIntegrity(packageData);

    // Thread 3: Permission Authorization
    const authResult = await validationPackageService.validatePackagePermissions(packageData);

    console.log('🎁 PACKAGE API: Validation completed (dry run)');
    res.json({
      validation: {
        integrity: integrityResult,
        authorization: authResult,
        overallValid: integrityResult.isValid && authResult.isAuthorized
      },
      metadata: packageData.metadata
    });

  } catch (error) {
    console.error('🎁 PACKAGE API: Package validation failed:', error);
    res.status(500).json({ 
      error: 'Internal server error during package validation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;