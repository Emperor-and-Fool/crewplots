import { storage } from '../storage';
import { messageStorageService } from './message-storage-service';
import { hybridCacheService } from './hybrid-cache-service-v2';

export interface ProfileData {
  id: number;
  public_id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  locationId: number | null;
  phoneNumber: string;
  status: string;
  resumeUrl: string | null;
  createdAt: string;
  notes: {
    exists: boolean;
    documentId: string | null;
    wordCount: number;
    characterCount: number;
    lastUpdated: string | null;
    workflow: string | null;
  };
}

export class ProfileFetcherService {
  private cacheKeyPrefix = 'user';
  private cacheTTL = 3600; // 1 hour

  /**
   * Get complete profile data with Redis-first caching
   */
  async getProfileData(userId: number): Promise<ProfileData | null> {
    const cacheKey = `${this.cacheKeyPrefix}:${userId}:profile`;
    
    try {
      // Try Redis cache first (DISABLED FOR FALLBACK TESTING)
      console.log(`[ProfileFetcher] Redis DISABLED - Testing fallback behavior for user ${userId}`);
      const cachedProfile = await hybridCacheService.get<ProfileData>(cacheKey, {
        category: 'user-profile',
        connectionId: `profile-${userId}`,
        ttl: this.cacheTTL,
        skipInDocker: true  // FORCE DISABLE REDIS FOR TESTING
      });

      if (cachedProfile) {
        console.log(`⚡ REDIS SUCCESS: Profile loaded from cache for user ${userId}`);
        return cachedProfile;
      }

      console.log(`[ProfileFetcher] Cache miss, fetching fresh data for user ${userId}`);
      
      // Fallback: Fetch fresh data from storage
      const profileData = await this.fetchFreshProfileData(userId);
      
      if (profileData) {
        // Cache the result in Redis
        await this.cacheProfileData(userId, profileData);
      }
      
      return profileData;
    } catch (error) {
      console.error(`[ProfileFetcher] Error fetching profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch fresh profile data from storage (with MongoDB fallback)
   */
  private async fetchFreshProfileData(userId: number): Promise<ProfileData | null> {
    console.log(`[ProfileFetcher] Fetching fresh profile data for user ${userId}`);
    
    // Get basic user data
    const applicant = await storage.getUser(userId);
    
    if (!applicant || applicant.role !== 'applicant') {
      console.log(`[ProfileFetcher] No applicant profile found for user ${userId}`);
      return null;
    }

    // Get notes metadata using the same method as messaging system
    let notesMetadata;
    try {
      const notes = await messageStorageService.getNoteRefsByUser(userId);
      notesMetadata = notes.length > 0 ? {
        exists: true,
        documentId: notes[0].noteId,
        wordCount: notes[0].wordCount || 0,
        characterCount: notes[0].characterCount || 0,
        lastUpdated: notes[0].updatedAt?.toISOString() || null,
        workflow: notes[0].workflow
      } : {
        exists: false,
        documentId: null,
        wordCount: 0,
        characterCount: 0,
        lastUpdated: null,
        workflow: null
      };
    } catch (error) {
      console.warn(`[ProfileFetcher] Failed to fetch notes for user ${userId}, using empty metadata:`, error);
      notesMetadata = {
        exists: false,
        documentId: null,
        wordCount: 0,
        characterCount: 0,
        lastUpdated: null,
        workflow: null
      };
    }

    // Check if resume file exists
    let validResumeUrl = null;
    if (applicant.resumeUrl) {
      const fs = require('fs');
      const path = require('path');
      const resumePath = path.join(process.cwd(), applicant.resumeUrl);
      if (fs.existsSync(resumePath)) {
        validResumeUrl = applicant.resumeUrl;
      } else {
        console.warn(`[ProfileFetcher] Resume file not found: ${resumePath}`);
      }
    }

    const profileData: ProfileData = {
      ...applicant,
      notes: notesMetadata,
      resumeUrl: validResumeUrl
    };

    console.log(`[ProfileFetcher] Successfully compiled profile data for user ${userId}`);
    return profileData;
  }

  /**
   * Cache profile data in Redis
   */
  private async cacheProfileData(userId: number, profileData: ProfileData): Promise<void> {
    const cacheKey = `${this.cacheKeyPrefix}:${userId}:profile`;
    
    try {
      console.log(`[ProfileFetcher] Caching profile data for user ${userId}`);
      await hybridCacheService.set(cacheKey, profileData, {
        ttl: this.cacheTTL,
        category: 'user-profile',
        connectionId: `profile-${userId}`
      });
      console.log(`[ProfileFetcher] Profile cached successfully for user ${userId}`);
    } catch (error) {
      console.warn(`[ProfileFetcher] Failed to cache profile for user ${userId}:`, error);
      // Don't throw - caching failure shouldn't break the response
    }
  }

  /**
   * Clear cached profile data
   */
  async clearProfileCache(userId: number): Promise<void> {
    const cacheKey = `${this.cacheKeyPrefix}:${userId}:profile`;
    
    try {
      await hybridCacheService.delete(cacheKey, {
        category: 'user-profile',
        connectionId: `profile-${userId}`
      });
      console.log(`[ProfileFetcher] Cleared profile cache for user ${userId}`);
    } catch (error) {
      console.warn(`[ProfileFetcher] Failed to clear profile cache for user ${userId}:`, error);
    }
  }
}

// Export singleton instance
export const profileFetcherService = new ProfileFetcherService();