import { Router } from 'express';
import { storage } from '../../storage';

const profileRoutes = Router();

// Get current user profile (detailed view) - uses Redis cache via ProfileFetcher
profileRoutes.get("/", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = (req.user as any)?.id || 0;
    
    // For applicants, use DataAggregationEngine 3.0 for comprehensive profile data
    if ((req.user as any)?.role === 'applicant') {
      const { dataAggregationEngine } = await import('../../services/validation/DataAggregationEngine');
      const { createUserProfileAggregationTask } = await import('./aggregation/user-profile-task');
      
      const aggregationTask = createUserProfileAggregationTask(userId);
      const result = await dataAggregationEngine.aggregate(aggregationTask);
      
      if (!result) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      return res.json(result);
    }
    
    // For managers, crew members, and administrators, get basic user data and cache it using the same pattern
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response and format for consistency
    const { password: _password, ...userProfile } = user;
    
    // Add notes metadata (empty for non-applicants)
    const profileData = {
      ...userProfile,
      notes: {
        exists: false,
        documentId: null,
        wordCount: 0,
        characterCount: 0,
        lastUpdated: null,
        workflow: null
      }
    };
    
    res.json(profileData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default profileRoutes;