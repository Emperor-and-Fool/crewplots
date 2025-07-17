import express from 'express';
import { storage } from '../../../storage';
import { authenticateUser } from '../../../middleware/auth';
import { validationEngine30 } from '../../../services/validation/ValidationEngine30';

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
    
    const validationResult = await validationEngine30.validate({
      entityType: 'shift',
      operation: 'create',
      data: {
        ...req.body,
        createdBy: req.user.id
      },
      context: { 
        userId: req.user.id, 
        userRole: req.user.role,
        permissions: req.user.permissions
      }
    });
    
    if (!validationResult.overall.isValid) {
      console.error("🔄 AUTO-SAVE: Validation error:", validationResult.overall.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.overall.errors 
      });
    }
    
    console.log("🔄 AUTO-SAVE: Validation successful");
    
    const shift = validationResult.result;
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
    
    const validationResult = await validationEngine30.validate({
      entityType: 'shift',
      operation: 'update',
      data: req.body,
      context: { 
        userId: req.user.id, 
        userRole: req.user.role,
        permissions: req.user.permissions
      },
      entityId: shiftId
    });
    
    if (!validationResult.overall.isValid) {
      console.error("🔄 AUTO-SAVE UPDATE: Validation error:", validationResult.overall.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.overall.errors 
      });
    }
    
    console.log("🔄 AUTO-SAVE UPDATE: Validation successful");
    
    const shift = validationResult.result;
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



export default router;