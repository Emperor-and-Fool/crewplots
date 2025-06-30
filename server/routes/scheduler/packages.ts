import express from 'express';
import { validationPackageService } from '../../services/validation-package-service';
import { authenticateUser } from '../../middleware/auth';

const router = express.Router();

// GET /api/scheduler/packages/schedule-blocks - Retrieve schedule blocks with creator info
router.get('/schedule-blocks', authenticateUser, async (req: any, res) => {
  try {
    console.log('📊 PACKAGE RETRIEVAL: Fetching schedule blocks with creator names');
    
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    console.log('📊 PACKAGE RETRIEVAL: Location filter:', locationId || 'All locations');
    
    const scheduleBlocksWithCreators = await validationPackageService.getScheduleBlocksWithCreators(locationId);
    
    console.log(`📊 PACKAGE RETRIEVAL: Successfully retrieved ${scheduleBlocksWithCreators.length} schedule blocks`);
    res.json(scheduleBlocksWithCreators);
    
  } catch (error) {
    console.error('📊 PACKAGE RETRIEVAL: Error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedule blocks' });
  }
});

// POST /api/scheduler/packages/validate - Validate schedule package
router.post('/validate', authenticateUser, async (req: any, res) => {
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
router.post('/create', authenticateUser, async (req: any, res) => {
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

// PUT /api/scheduler/packages/update/:id - Update schedule package
router.put('/update/:id', authenticateUser, async (req: any, res) => {
  try {
    console.log('🔄 PACKAGE API: Starting package update for ID:', req.params.id);

    // Thread 1: Package Assembly (with update context)
    const packageData = await validationPackageService.assemblePackageFromRequest(
      { ...req.body, scheduleBlock: { ...req.body.scheduleBlock, id: parseInt(req.params.id) } },
      req.user,
      'update'
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
        error: 'Failed to update schedule package',
        details: saveResult.errors
      });
    }

    console.log('🔄 PACKAGE API: Package updated successfully:', saveResult.createdEntities);
    res.status(200).json({
      success: true,
      package: {
        id: saveResult.createdEntities.scheduleBlockId,
        type: packageData.packageType,
        updatedEntities: saveResult.createdEntities
      }
    });

  } catch (error) {
    console.error('🔄 PACKAGE API: Update failed:', error);
    res.status(500).json({ 
      error: 'Package update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;