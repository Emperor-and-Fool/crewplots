import express from 'express';
import { authenticateUser } from '../../middleware/auth';
import { ValidationPackageService } from '../../services/validation-package-service';

const router = express.Router();

function hasPermission(userRole: string, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    administrator: ['scheduler_development', 'create', 'update', 'delete'],
    owner: ['scheduler_development', 'create', 'update', 'delete'],
    app_manager: ['scheduler_development', 'create', 'update', 'delete'],
    crew_chief: ['update'],
    crew_member: [],
    applicant: []
  };
  
  return rolePermissions[userRole]?.includes(permission) || false;
}

// Create complete schedule package
router.post("/", authenticateUser, async (req: any, res) => {
  console.log("📦 PACKAGE CREATE - Request received");
  console.log("User:", req.user.username, "Role:", req.user.role);
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ PACKAGE CREATE - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    console.log("📦 PACKAGE CREATE - Starting 4-thread validation");
    
    // Thread 1: Package Assembly
    const validatedPackage = await ValidationPackageService.assemblePackageFromRequest(
      req.body,
      req.user.id,
      'create'
    );
    console.log("✅ Thread 1 Complete - Package assembled and validated");

    // Thread 2: Integrity Validation
    const integrityCheck = await ValidationPackageService.validatePackageIntegrity(validatedPackage);
    if (!integrityCheck.valid) {
      console.log("❌ Thread 2 Failed - Integrity errors:", integrityCheck.errors);
      return res.status(400).json({ 
        error: "Package integrity validation failed", 
        details: integrityCheck.errors 
      });
    }
    console.log("✅ Thread 2 Complete - Package integrity validated");

    // Thread 3: Permission Authorization
    const authCheck = await ValidationPackageService.validatePackagePermissions(
      req.user.id,
      validatedPackage,
      'create'
    );
    if (!authCheck.authorized) {
      console.log("❌ Thread 3 Failed - Authorization denied:", authCheck.reason);
      return res.status(403).json({ 
        error: "Package authorization failed", 
        reason: authCheck.reason 
      });
    }
    console.log("✅ Thread 3 Complete - Package authorization validated");

    // Thread 4: Storage Transaction
    const saveResult = await ValidationPackageService.saveValidatedPackage(validatedPackage);
    console.log("✅ Thread 4 Complete - Package saved atomically");
    console.log("📦 PACKAGE CREATE - Success:", saveResult);

    res.status(201).json({
      success: true,
      message: "Schedule package created successfully",
      data: saveResult
    });

  } catch (error) {
    console.error("❌ PACKAGE CREATE - Error:", error);
    res.status(400).json({ 
      error: "Failed to create schedule package",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Update existing schedule package
router.put("/:id", authenticateUser, async (req: any, res) => {
  console.log("📦 PACKAGE UPDATE - Request received for package:", req.params.id);
  console.log("User:", req.user.username, "Role:", req.user.role);
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ PACKAGE UPDATE - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    // Thread 1: Package Assembly for update
    const validatedPackage = await ValidationPackageService.assemblePackageFromRequest(
      req.body,
      req.user.id,
      'update'
    );
    console.log("✅ Thread 1 Complete - Update package assembled");

    // Thread 2: Integrity Validation
    const integrityCheck = await ValidationPackageService.validatePackageIntegrity(validatedPackage);
    if (!integrityCheck.valid) {
      console.log("❌ Thread 2 Failed - Integrity errors:", integrityCheck.errors);
      return res.status(400).json({ 
        error: "Package integrity validation failed", 
        details: integrityCheck.errors 
      });
    }
    console.log("✅ Thread 2 Complete - Update package integrity validated");

    // Thread 3: Permission Authorization for update
    const authCheck = await ValidationPackageService.validatePackagePermissions(
      req.user.id,
      validatedPackage,
      'update'
    );
    if (!authCheck.authorized) {
      console.log("❌ Thread 3 Failed - Update authorization denied:", authCheck.reason);
      return res.status(403).json({ 
        error: "Package update authorization failed", 
        reason: authCheck.reason 
      });
    }
    console.log("✅ Thread 3 Complete - Update package authorization validated");

    // For updates, we would implement updateValidatedPackage method
    // For now, return success to establish the endpoint
    console.log("📦 PACKAGE UPDATE - Update functionality ready for implementation");

    res.json({
      success: true,
      message: "Package update validation completed",
      packageId: req.params.id
    });

  } catch (error) {
    console.error("❌ PACKAGE UPDATE - Error:", error);
    res.status(400).json({ 
      error: "Failed to update schedule package",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get calendar data for package
router.get("/:id/calendar", authenticateUser, async (req: any, res) => {
  console.log("📅 PACKAGE CALENDAR - Request for package:", req.params.id);
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: "startDate and endDate query parameters required" 
      });
    }

    const calendarData = await ValidationPackageService.assembleCalendarData(
      parseInt(req.params.id),
      startDate as string,
      endDate as string
    );

    console.log("📅 PACKAGE CALENDAR - Calendar data assembled");
    res.json(calendarData);

  } catch (error) {
    console.error("❌ PACKAGE CALENDAR - Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch calendar data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;