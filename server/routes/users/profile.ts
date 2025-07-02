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
    
    // For applicants, use the ProfileFetcher service with Redis caching
    if ((req.user as any)?.role === 'applicant') {
      const { profileFetcherService } = await import('../../services/profile-fetcher-service');
      const profileData = await profileFetcherService.getProfileData(userId);
      
      if (!profileData) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      return res.json(profileData);
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