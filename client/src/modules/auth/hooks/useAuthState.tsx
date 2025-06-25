import { useAuth } from '@/hooks/use-auth';

export const useAuthState = () => {
  // TODO: Will wrap existing useAuth for module consistency
  const authContext = useAuth();
  
  return {
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading,
    // Additional state management can be added here
  };
};