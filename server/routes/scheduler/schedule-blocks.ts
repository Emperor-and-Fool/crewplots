import express from 'express';
import { storage } from '../../storage';
import { authenticateUser } from '../../middleware/auth';
import { insertScheduleBlockSchema } from '@shared/schema';

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

// Get schedule blocks with optional location filtering
router.get("/", async (req, res) => {
  try {
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    console.log(`✅ SCHEDULE BLOCKS FETCH - Location filter:`, locationId || 'All locations');
    
    const scheduleBlocks = await storage.getScheduleBlocks(locationId);
    console.log(`✅ SCHEDULE BLOCKS FETCH - Found ${scheduleBlocks.length} schedule blocks`);
    res.json(scheduleBlocks);
  } catch (error) {
    console.error("❌ SCHEDULE BLOCKS FETCH - Error:", error);
    res.status(500).json({ error: "Failed to fetch schedule blocks" });
  }
});

// Get single schedule block by ID
router.get("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    const scheduleBlock = await storage.getScheduleBlock(id);
    
    if (!scheduleBlock) {
      return res.status(404).json({ error: "Schedule block not found" });
    }
    
    res.json(scheduleBlock);
  } catch (error) {
    console.error("Error fetching schedule block:", error);
    res.status(500).json({ error: "Failed to fetch schedule block" });
  }
});

// Create schedule block
router.post("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const validatedData = insertScheduleBlockSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    
    const scheduleBlock = await storage.createScheduleBlock(validatedData);
    res.status(201).json(scheduleBlock);
  } catch (error) {
    console.error("Error creating schedule block:", error);
    res.status(400).json({ error: "Failed to create schedule block" });
  }
});

// Update schedule block
router.put("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    const validatedData = insertScheduleBlockSchema.omit({ createdBy: true }).partial().parse(req.body);
    
    const scheduleBlock = await storage.updateScheduleBlock(id, validatedData);
    res.json(scheduleBlock);
  } catch (error) {
    console.error("Error updating schedule block:", error);
    res.status(400).json({ error: "Failed to update schedule block" });
  }
});

// Delete schedule block
router.delete("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteScheduleBlock(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting schedule block:", error);
    res.status(500).json({ error: "Failed to delete schedule block" });
  }
});

export default router;