import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  resumeUrl: string | null;
  notes: string | null;
  extraMessage: string | null;
  userId: number;
  locationId: number | null;
  createdAt: string;
}

interface ProfileContextType {
  profile: ApplicantProfile | null;
  setProfile: (profile: ApplicantProfile | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  clearProfile: () => void;
  error: Error | null;
  refetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileScraperInit({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch profile data from API
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/applicant-portal/my-profile');
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      const profileData = await response.json();
      setProfile(profileData);
      sessionStorage.setItem('applicant-profile', JSON.stringify(profileData));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Always fetch fresh profile data to ensure status is up-to-date
  useEffect(() => {
    console.log('ProfileScraperInit: Fetching fresh profile from server');
    fetchProfile();
  }, [fetchProfile]);

  // Save profile to sessionStorage whenever it changes
  useEffect(() => {
    if (profile) {
      sessionStorage.setItem('applicant-profile', JSON.stringify(profile));
    }
  }, [profile]);

  const clearProfile = () => {
    setProfile(null);
    setError(null);
    sessionStorage.removeItem('applicant-profile');
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      setProfile,
      isLoading,
      setIsLoading,
      clearProfile,
      error,
      refetchProfile: fetchProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileScraperInit');
  }
  return context;
}