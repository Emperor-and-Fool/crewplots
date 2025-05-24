import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Persist profile in sessionStorage to survive navigation
  useEffect(() => {
    const savedProfile = sessionStorage.getItem('applicant-profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
        sessionStorage.removeItem('applicant-profile');
      }
    }
  }, []);

  // Save profile to sessionStorage whenever it changes
  useEffect(() => {
    if (profile) {
      sessionStorage.setItem('applicant-profile', JSON.stringify(profile));
    }
  }, [profile]);

  const clearProfile = () => {
    setProfile(null);
    sessionStorage.removeItem('applicant-profile');
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      setProfile,
      isLoading,
      setIsLoading,
      clearProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}