import express from 'express';
import { storage } from '../../storage';
import { authenticateUser } from '../../middleware/auth';
import { insertShiftSubscriptionSchema, insertShiftAssignmentSchema } from '@shared/schema';

const router = express.Router();

// === Shift Subscriptions Management ===

// Get shift subscriptions
router.get("/subscriptions", async (req, res) => {
  try {
    const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const subscriptions = await storage.getShiftSubscriptions(shiftId, userId);
    res.json(subscriptions);
  } catch (error) {
    console.error("Error fetching shift subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch shift subscriptions" });
  }
});

// Create shift subscription
router.post("/subscriptions", authenticateUser, async (req: any, res) => {
  try {
    const validatedData = insertShiftSubscriptionSchema.parse({
      ...req.body,
      userId: req.user.id
    });
    const subscription = await storage.createShiftSubscription(validatedData);
    res.status(201).json(subscription);
  } catch (error) {
    console.error("Error creating shift subscription:", error);
    res.status(400).json({ error: "Failed to create shift subscription" });
  }
});

// Update shift subscription
router.put("/subscriptions/:id", authenticateUser, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertShiftSubscriptionSchema.parse(req.body);
    const subscription = await storage.updateShiftSubscription(id, validatedData);
    res.json(subscription);
  } catch (error) {
    console.error("Error updating shift subscription:", error);
    res.status(400).json({ error: "Failed to update shift subscription" });
  }
});

// Delete shift subscription
router.delete("/subscriptions/:id", authenticateUser, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteShiftSubscription(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift subscription:", error);
    res.status(500).json({ error: "Failed to delete shift subscription" });
  }
});

// === Shift Assignments Management ===

// Get shift assignments
router.get("/", async (req, res) => {
  try {
    const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const assignments = await storage.getShiftAssignments(shiftId, userId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching shift assignments:", error);
    res.status(500).json({ error: "Failed to fetch shift assignments" });
  }
});

// Create shift assignment
router.post("/", authenticateUser, async (req: any, res) => {
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
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertShiftAssignmentSchema.parse(req.body);
    const assignment = await storage.updateShiftAssignment(id, validatedData);
    res.json(assignment);
  } catch (error) {
    console.error("Error updating shift assignment:", error);
    res.status(400).json({ error: "Failed to update shift assignment" });
  }
});

// Delete shift assignment
router.delete("/:id", authenticateUser, async (req: any, res) => {
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