import { BaseConsolidationService } from '../core/base-consolidation-service';
import { AuthenticationWrapper } from '../core/authentication-wrapper';
import { storage } from '../../storage';
import { messageStorageService } from '../../message-storage-service';
import { Request } from 'express';

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

export class ProfileConsolidationService extends BaseConsolidationService<ProfileData> {
  constructor() {
    super({
      cachePrefix: 'profile-consolidation',
      cacheTTL: 3600, // 1 hour
      category: 'user-profile'
    });
  }

  async getProfileData(req: Request, targetUserId?: number): Promise<ProfileData | null> {
    const user = AuthenticationWrapper.validateAuthentication(req);
    const userId = targetUserId || user.id;
    const cacheKey = `${this.config.cachePrefix}:${userId}:data`;
    
    return this.getConsolidatedData(
      userId,
      cacheKey,
      () => this.fetchFreshProfileData(userId),
      `profile-${userId}`
    );
  }

  private async fetchFreshProfileData(userId: number): Promise<ProfileData | null> {
    console.log(`[ProfileConsolidation] Fetching fresh profile data for user ${userId}`);
    
    try {
      // Get user data
      const user = await storage.getUserById(userId);
      if (!user) {
        console.warn(`[ProfileConsolidation] User ${userId} not found`);
        return null;
      }

      // Get notes metadata
      const noteRefs = await messageStorageService.getNoteRefsByUser(userId);
      const latestNote = noteRefs.length > 0 ? noteRefs[0] : null;
      
      const notesData = {
        exists: noteRefs.length > 0,
        documentId: latestNote?.mongoDocumentId || null,
        wordCount: latestNote?.wordCount || 0,
        characterCount: latestNote?.characterCount || 0,
        lastUpdated: latestNote?.lastUpdated || null,
        workflow: latestNote?.workflow || null
      };

      const profileData: ProfileData = {
        id: user.id,
        public_id: user.public_id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name || user.username,
        role: user.role,
        locationId: user.locationId,
        phoneNumber: user.phoneNumber || '',
        status: user.status || 'active',
        resumeUrl: user.resumeUrl,
        createdAt: user.createdAt.toISOString(),
        notes: notesData
      };

      console.log(`[ProfileConsolidation] Successfully compiled profile data for user ${userId}`);
      return profileData;
    } catch (error) {
      console.error(`[ProfileConsolidation] Error fetching profile for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const profileConsolidationService = new ProfileConsolidationService();