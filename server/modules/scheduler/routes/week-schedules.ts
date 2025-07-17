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

// Get week schedules with optional location filtering and frameId support
router.get("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const frameId = req.query.frameId ? parseInt(req.query.frameId as string) : undefined;
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    
    if (frameId) {
      // Schedule block mode - fetch schedule block with its week schedules
      console.log(`🔍 SCHEDULE BLOCK QUERY - Fetching block ID: ${frameId}`);
      
      const scheduleBlock = await storage.getScheduleBlock(frameId);
      if (!scheduleBlock) {
        return res.status(404).json({ error: "Schedule block not found" });
      }
      
      const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(frameId);
      console.log(`🔍 SCHEDULE BLOCK QUERY - Found ${weekSchedules.length} schedules in block`);
      
      res.json({
        scheduleBlock,
        weekSchedules,
        isScheduleBlockMode: true
      });
    } else {
      // Standard location-based query
      console.log(`✅ WEEK SCHEDULES FETCH - Location filter:`, locationId || 'All locations');
      const weekSchedules = await storage.getWeekSchedules(locationId);
      console.log(`✅ WEEK SCHEDULES FETCH - Found ${weekSchedules.length} schedules`);
      res.json(weekSchedules);
    }
  } catch (error) {
    console.error("❌ WEEK SCHEDULES FETCH - Error:", error);
    res.status(500).json({ error: "Failed to fetch week schedules" });
  }
});

// Get single week schedule by ID
router.get("/:id", authenticateUser, async (req: any, res) => {
  console.log("🔍 WEEK SCHEDULE FETCH - Single schedule request");
  console.log("User:", req.user.username, "Role:", req.user.role);
  console.log("Schedule ID:", req.params.id);
  console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ WEEK SCHEDULE FETCH - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    console.log("✅ WEEK SCHEDULE FETCH - Fetching schedule with ID:", id);
    console.log("✅ WEEK SCHEDULE FETCH - Calling storage.getWeekScheduleById...");
    const weekSchedule = await storage.getWeekScheduleById(id);
    console.log("✅ WEEK SCHEDULE FETCH - Raw result from storage:", JSON.stringify(weekSchedule, null, 2));
    console.log("✅ WEEK SCHEDULE FETCH - Found schedule:", weekSchedule ? "Yes" : "No");
    
    if (!weekSchedule) {
      console.log("❌ WEEK SCHEDULE FETCH - Schedule not found in database");
      return res.status(404).json({ error: "Week schedule not found" });
    }
    
    console.log("✅ WEEK SCHEDULE FETCH - Returning schedule data to frontend");
    res.json(weekSchedule);
  } catch (error) {
    console.error("❌ WEEK SCHEDULE FETCH - Database error:", error);
    res.status(500).json({ error: "Failed to fetch week schedule" });
  }
});

// Create week schedule
router.post("/", authenticateUser, async (req: any, res) => {
  console.log("✅ WEEK SCHEDULE CREATE - Request received");
  console.log("User:", req.user.username, "Role:", req.user.role);
  console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ WEEK SCHEDULE CREATE - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    console.log("✅ WEEK SCHEDULE CREATE - Permission granted, validating data");
    
    const validationResult = await validationEngine30.validate({
      entityType: 'weekSchedule',
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
      console.error("❌ WEEK SCHEDULE CREATE - Validation error:", validationResult.overall.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.overall.errors 
      });
    }
    
    console.log("✅ WEEK SCHEDULE CREATE - Validation successful");
    
    const weekSchedule = validationResult.result;
    console.log("✅ WEEK SCHEDULE CREATE - Saved successfully:", weekSchedule);
    res.status(201).json(weekSchedule);
  } catch (error) {
    console.error("❌ WEEK SCHEDULE CREATE - Error:", error);
    res.status(400).json({ error: "Failed to create week schedule" });
  }
});

// Update week schedule
router.put("/:id", authenticateUser, async (req: any, res) => {
  console.log("🔄 WEEK SCHEDULE UPDATE - Start");
  console.log("User:", req.user.username, "Role:", req.user.role);
  console.log("Schedule ID:", req.params.id);
  console.log("Request body:", req.body);
  console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  
  if (!hasPermission(req.user.role, "scheduler_development")) {
    console.log("❌ WEEK SCHEDULE UPDATE - Permission denied");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    console.log("✅ WEEK SCHEDULE UPDATE - Permission granted, validating data");
    
    const validationResult = await validationEngine30.validate({
      entityType: 'weekSchedule',
      operation: 'update',
      data: req.body,
      context: { 
        userId: req.user.id, 
        userRole: req.user.role,
        permissions: req.user.permissions
      },
      entityId: id
    });
    
    if (!validationResult.overall.isValid) {
      console.error("❌ WEEK SCHEDULE UPDATE - Validation error:", validationResult.overall.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.overall.errors 
      });
    }
    
    console.log("✅ WEEK SCHEDULE UPDATE - Validation successful");
    
    const weekSchedule = validationResult.result;
    console.log("✅ WEEK SCHEDULE UPDATE - Updated successfully:", weekSchedule);
    res.json(weekSchedule);
  } catch (error) {
    console.error("❌ WEEK SCHEDULE UPDATE - Error:", error);
    res.status(400).json({ error: "Failed to update week schedule" });
  }
});

// Delete week schedule
router.delete("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteWeekSchedule(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting week schedule:", error);
    res.status(500).json({ error: "Failed to delete week schedule" });
  }
});

// Get shifts for a specific week schedule
router.get("/:id/shifts", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const weekScheduleId = parseInt(req.params.id);
    const shifts = await storage.getShiftsByWeekSchedule(weekScheduleId);
    res.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts for week schedule:", error);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// Create shift for a specific week schedule
router.post("/:id/shifts", authenticateUser, async (req: any, res) => {
  // req.user is populated by authenticateUser middleware
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const weekScheduleId = parseInt(req.params.id);
    console.log("🔄 AUTO-SAVE: Creating shift for week schedule:", weekScheduleId, "with data:", req.body);
    
    const validatedData = insertShiftSchema.parse({
      ...req.body,
      weekScheduleId: weekScheduleId,
      createdBy: req.user.id
    });
    
    const shift = await storage.createShift(validatedData);
    console.log("🔄 AUTO-SAVE: Created shift successfully for week schedule:", shift);
    res.status(201).json(shift);
  } catch (error) {
    console.error("🔄 AUTO-SAVE: Error creating shift for week schedule:", error);
    res.status(400).json({ error: "Failed to create shift" });
  }
});

// Update shift for a specific week schedule
router.put("/:scheduleId/shifts/:shiftId", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const shiftId = parseInt(req.params.shiftId);
    const validatedData = updateShiftSchema.parse(req.body);
    const shift = await storage.updateShift(shiftId, validatedData);
    res.json(shift);
  } catch (error) {
    console.error("Error updating shift:", error);
    res.status(400).json({ error: "Failed to update shift" });
  }
});

// Delete shift for a specific week schedule
router.delete("/:scheduleId/shifts/:shiftId", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "schedule")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const shiftId = parseInt(req.params.shiftId);
    await storage.deleteShift(shiftId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ error: "Failed to delete shift" });
  }
});

export default router;