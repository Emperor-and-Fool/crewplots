import express from 'express';
import { storage } from '../../../storage';
import { authenticateUser } from '../../../middleware/auth';
import { insertShiftAssignmentSchema } from '@shared/schema';

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

// Get shift assignments
router.get("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    
    if (shiftId) {
      const assignments = await storage.getShiftAssignmentsByShift(shiftId);
      res.json(assignments);
    } else if (userId) {
      const assignments = await storage.getShiftAssignmentsByUser(userId);
      res.json(assignments);
    } else {
      const assignments = await storage.getShiftAssignments();
      res.json(assignments);
    }
  } catch (error) {
    console.error("Error fetching shift assignments:", error);
    res.status(500).json({ error: "Failed to fetch shift assignments" });
  }
});

// Create shift assignment
router.post("/", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const validatedData = insertShiftAssignmentSchema.parse({
      ...req.body,
      assignedBy: req.user.id
    });
    const assignment = await storage.createShiftAssignment(validatedData);
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating shift assignment:", error);
    res.status(400).json({ error: "Failed to create shift assignment" });
  }
});

// Update shift assignment
router.put("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    const validatedData = insertShiftAssignmentSchema.omit({ assignedBy: true }).partial().parse(req.body);
    const assignment = await storage.updateShiftAssignment(id, validatedData);
    res.json(assignment);
  } catch (error) {
    console.error("Error updating shift assignment:", error);
    res.status(400).json({ error: "Failed to update shift assignment" });
  }
});

// Delete shift assignment
router.delete("/:id", authenticateUser, async (req: any, res) => {
  if (!hasPermission(req.user.role, "scheduler_development")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteShiftAssignment(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift assignment:", error);
    res.status(500).json({ error: "Failed to delete shift assignment" });
  }
});

export default router;