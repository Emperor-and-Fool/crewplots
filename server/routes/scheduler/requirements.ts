import express from 'express';
import { storage } from '../../storage';
import { authenticateUser } from '../../middleware/auth';
import { insertShiftRequirementSchema } from '@shared/schema';

const router = express.Router();

function hasPermission(userRole: string, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    administrator: ['schedule', 'manage', 'view', 'edit', 'delete', 'create'],
    owner: ['schedule', 'manage', 'view', 'edit', 'delete', 'create'],
    app_manager: ['schedule', 'manage', 'view', 'edit', 'delete', 'create'],
    crew_chief: ['view', 'edit'],
    crew_member: ['view'],
    applicant: ['view']
  };
  
  return rolePermissions[userRole]?.includes(permission) || false;
}

// Get shift requirements
router.get("/", async (req, res) => {
  try {
    const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
    const requirements = await storage.getShiftRequirements(shiftId);
    res.json(requirements);
  } catch (error) {
    console.error("Error fetching shift requirements:", error);
    res.status(500).json({ error: "Failed to fetch shift requirements" });
  }
});

// Create shift requirement
router.post("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "schedule")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const validatedData = insertShiftRequirementSchema.parse(req.body);
    const requirement = await storage.createShiftRequirement(validatedData);
    res.status(201).json(requirement);
  } catch (error) {
    console.error("Error creating shift requirement:", error);
    res.status(400).json({ error: "Failed to create shift requirement" });
  }
});

// Update shift requirement
router.put("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "schedule")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    const validatedData = insertShiftRequirementSchema.parse(req.body);
    const requirement = await storage.updateShiftRequirement(id, validatedData);
    res.json(requirement);
  } catch (error) {
    console.error("Error updating shift requirement:", error);
    res.status(400).json({ error: "Failed to update shift requirement" });
  }
});

// Delete shift requirement
router.delete("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "schedule")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteShiftRequirement(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift requirement:", error);
    res.status(500).json({ error: "Failed to delete shift requirement" });
  }
});

export default router;