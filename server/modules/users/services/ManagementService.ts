import { Router } from 'express';
import { storage } from '../../../storage';

const managementRoutes = Router();

// Get users with optional role filtering (replaces /api/applicants)
managementRoutes.get("/", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { role } = req.query;
    
    // Get all users from storage
    const allUsers = await storage.getUsers();
    
    // Filter by role if specified
    let filteredUsers = allUsers;
    if (role) {
      filteredUsers = allUsers.filter(user => user.role === role);
    }
    
    // Remove passwords from response
    const users = filteredUsers.map(({ password: _password, ...user }) => user);
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get specific user by ID (replaces /api/applicants/:id)
managementRoutes.get("/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Remove password from response
    const { password: _password, ...userProfile } = user;
    
    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user by ID (replaces PATCH /api/applicants/:id)
managementRoutes.patch("/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const existingUser = await storage.getUser(userId);
    
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update user with provided fields
    const updatedUser = await storage.updateUser(userId, req.body);
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Failed to update user" });
    }
    
    // Remove password from response
    const { password: _password, ...userProfile } = updatedUser;
    
    res.json(userProfile);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default managementRoutes;