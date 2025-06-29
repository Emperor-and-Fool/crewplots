import express from 'express';
import { storage } from '../../storage';
import { authenticateUser } from '../../middleware/auth';
import { insertShiftSchema, updateShiftSchema } from '@shared/schema';
import { ValidationPackageService } from '../../services/validation-package-service';

const router = express.Router();

function hasPermission(userRole: string, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    administrator: ['schedule', 'scheduler_development', 'manage', 'view', 'edit', 'delete', 'create'],
    owner: ['schedule', 'scheduler_development', 'manage', 'view', 'edit', 'delete', 'create'],
    app_manager: ['schedule', 'scheduler_development', 'manage', 'view', 'edit', 'delete', 'create'],
    crew_chief: ['view', 'edit'],
    crew_member: ['view'],
    applicant: ['view']
  };
  
  return rolePermissions[userRole]?.includes(permission) || false;
}

// Get all shifts or shifts by week schedule
router.get("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development.read")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const weekScheduleId = req.query.weekScheduleId ? parseInt(req.query.weekScheduleId as string) : undefined;
    
    if (weekScheduleId) {
      console.log(`🔍 SHIFTS API: Fetching shifts for week schedule ID: ${weekScheduleId}`);
      const shifts = await storage.getShiftsByWeekSchedule(weekScheduleId);
      console.log(`🔍 SHIFTS API: Found ${shifts.length} shifts for week schedule ${weekScheduleId}`);
      res.json(shifts);
    } else {
      console.log(`🔍 SHIFTS API: Fetching all shifts`);
      const shifts = await storage.getShifts();
      console.log(`🔍 SHIFTS API: Found ${shifts.length} total shifts`);
      res.json(shifts);
    }
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// Create shift
router.post("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    console.log("🔄 AUTO-SAVE: Creating shift with data:", req.body);
    const validatedData = insertShiftSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    console.log("🔄 AUTO-SAVE: Validated data:", validatedData);
    
    const shift = await storage.createShift(validatedData);
    console.log("🔄 AUTO-SAVE: Created shift successfully:", shift);
    res.status(201).json(shift);
  } catch (error) {
    console.error("🔄 AUTO-SAVE: Error creating shift:", error);
    res.status(400).json({ error: "Failed to create shift" });
  }
});

// Update shift
router.put("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("🔄 AUTO-SAVE UPDATE: Permission denied for user:", req.user.username, "role:", req.user.role);
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const shiftId = parseInt(req.params.id);
    console.log("🔄 AUTO-SAVE UPDATE: Updating shift:", shiftId);
    console.log("🔄 AUTO-SAVE UPDATE: Request body:", req.body);
    
    const validatedData = updateShiftSchema.parse(req.body);
    console.log("🔄 AUTO-SAVE UPDATE: Validated data:", validatedData);
    
    const shift = await storage.updateShift(shiftId, validatedData);
    console.log("🔄 AUTO-SAVE UPDATE: Updated shift successfully:", shift);
    res.json(shift);
  } catch (error) {
    console.error("🔄 AUTO-SAVE UPDATE: Error updating shift:", error);
    res.status(400).json({ error: "Failed to update shift" });
  }
});

// Delete shift
router.delete("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteShift(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ error: "Failed to delete shift" });
  }
});

// Finalize shifts using validation package framework
router.post("/finalize", authenticateUser, async (req: any, res) => {
  console.log("🔥 FINALIZE SHIFTS - Request received");
  console.log("User:", req.user.username, "Role:", req.user.role);
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ FINALIZE SHIFTS - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const { shiftIds, weekScheduleId } = req.body;
    
    if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({ error: "shiftIds array is required" });
    }

    console.log("🔥 FINALIZE SHIFTS - Starting validation framework for shifts:", shiftIds);
    
    // Build package from existing shifts for validation
    const shifts = [];
    for (const shiftId of shiftIds) {
      const shiftsData = await storage.getShiftsByWeekSchedule(weekScheduleId);
      const shift = shiftsData.find(s => s.id === shiftId);
      if (shift) {
        shifts.push({
          id: shift.id,
          dayOfWeek: shift.dayOfWeek || 'monday',
          startTime: shift.startTime,
          endTime: shift.endTime,
          position: shift.position || 'Staff',
          title: shift.title,
          maxSlots: shift.maxSlots,
          status: 'open', // Finalizing means transitioning to open
          subscriptionDeadline: shift.subscriptionDeadline?.toISOString() || undefined
        });
      }
    }

    // Get week schedule for package context
    const weekSchedule = await storage.getWeekSchedule(weekScheduleId);
    if (!weekSchedule) {
      return res.status(404).json({ error: "Week schedule not found" });
    }

    // Get schedule block for full context
    const scheduleBlock = await storage.getScheduleBlock(weekSchedule.scheduleBlockId);
    if (!scheduleBlock) {
      return res.status(404).json({ error: "Schedule block not found" });
    }

    // Create validation package for finalization
    const finalizationPackage = {
      userId: req.user.id,
      packageType: 'update' as const,
      scheduleBlock: {
        id: scheduleBlock.id,
        name: scheduleBlock.name,
        description: scheduleBlock.description,
        locationId: scheduleBlock.locationId,
        isActive: scheduleBlock.isActive
      },
      weekSchedules: [{
        id: weekSchedule.id,
        weekNumber: weekSchedule.weekNumber,
        templateId: weekSchedule.templateId || 1
      }],
      shifts: shifts
    };

    console.log("📦 FINALIZE SHIFTS - Package assembled, starting 4-thread validation");

    // Thread 2: Integrity Validation
    const integrityCheck = await ValidationPackageService.validatePackageIntegrity(finalizationPackage);
    if (!integrityCheck.valid) {
      console.log("❌ FINALIZE SHIFTS - Integrity validation failed:", integrityCheck.errors);
      return res.status(400).json({ 
        error: "Shift finalization integrity validation failed", 
        details: integrityCheck.errors 
      });
    }
    console.log("✅ FINALIZE SHIFTS - Integrity validation passed");

    // Thread 3: Permission Authorization
    const authCheck = await ValidationPackageService.validatePackagePermissions(
      finalizationPackage,
      req.user
    );
    if (!authCheck.authorized) {
      console.log("❌ FINALIZE SHIFTS - Authorization failed:", authCheck.reason);
      return res.status(403).json({ 
        error: "Shift finalization authorization failed", 
        reason: authCheck.reason 
      });
    }
    console.log("✅ FINALIZE SHIFTS - Authorization validation passed");

    // Execute finalization - update shift statuses to 'open'
    const finalizedShifts = [];
    for (const shiftId of shiftIds) {
      const updatedShift = await storage.updateShift(shiftId, { status: 'open' });
      finalizedShifts.push(updatedShift);
    }

    console.log("🔥 FINALIZE SHIFTS - Successfully finalized", finalizedShifts.length, "shifts");

    res.json({
      success: true,
      message: "Shifts finalized successfully using validation framework",
      finalizedShifts: finalizedShifts,
      validationFrameworkUsed: true
    });

  } catch (error) {
    console.error("❌ FINALIZE SHIFTS - Error:", error);
    res.status(400).json({ 
      error: "Failed to finalize shifts",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;