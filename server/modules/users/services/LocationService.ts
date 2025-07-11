import { Router } from 'express';
import { z } from 'zod';
import { insertUserLocationSchema } from '@shared/schema';
import { storage } from '../../../storage';
import { fromZodError } from 'zod-validation-error';

const locationRoutes = Router();

// Get all user-location assignments
locationRoutes.get('/', async (req, res) => {
  try {
    console.log('🔍 API: Fetching user-location assignments (modular)');
    const userLocations = await storage.getUserLocations(0); // Get all assignments
    console.log(`🔍 API: Retrieved ${userLocations.length} user-location assignments`);
    res.json(userLocations);
  } catch (error) {
    console.error('Error fetching user-location assignments:', error);
    res.status(500).json({ error: "Failed to fetch user-location assignments" });
  }
});

// Get user-location assignments for a specific user
locationRoutes.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log(`🔍 API DEBUG: /api/users/locations/${userId} request received`);
    
    if (isNaN(userId)) {
      console.log(`🔍 API DEBUG: Invalid user ID: ${req.params.userId}`);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const userLocations = await storage.getUserLocations(userId);
    console.log(`🔍 API DEBUG: Found ${userLocations.length} location assignments for user ${userId}`);
    res.json(userLocations);
  } catch (error) {
    console.error('🔍 API DEBUG: Error in /api/users/locations/:userId:', error);
    res.status(500).json({ error: "Failed to fetch user location assignments" });
  }
});

// Create user-location assignment
locationRoutes.post('/', async (req, res) => {
  try {
    console.log(`🔍 API DEBUG: POST /api/users/locations - Request body:`, req.body);
    const result = insertUserLocationSchema.safeParse(req.body);
    if (!result.success) {
      console.log(`🔍 API DEBUG: Schema validation failed:`, fromZodError(result.error).toString());
      return res.status(400).json({ 
        error: "Invalid user location data", 
        details: fromZodError(result.error).toString() 
      });
    }

    const userLocation = await storage.assignUserToLocation(result.data);
    console.log('🔍 API: Created user-location assignment:', userLocation.id);
    res.status(201).json(userLocation);
  } catch (error) {
    console.error('Error creating user-location assignment:', error);
    res.status(500).json({ error: "Failed to create user-location assignment" });
  }
});

// Delete user-location assignment
locationRoutes.delete('/:userId/:locationId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const locationId = parseInt(req.params.locationId);
    
    if (isNaN(userId) || isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid user ID or location ID" });
    }

    const success = await storage.removeUserFromLocation(userId, locationId);
    if (!success) {
      return res.status(404).json({ error: "User-location assignment not found" });
    }

    console.log(`🔍 API: Removed user ${userId} from location ${locationId}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing user-location assignment:', error);
    res.status(500).json({ error: "Failed to remove user-location assignment" });
  }
});

export default locationRoutes;