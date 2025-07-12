import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth';
import { Badge } from '@/components/ui/badge';

export const SessionSyncIndicator = () => {
  const { user: frontendUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'checking' | 'synced' | 'out-of-sync'>('checking');
  const [backendUser, setBackendUser] = useState<any>(null);

  useEffect(() => {
    const checkSessionSync = async () => {
      if (!frontendUser) {
        setSyncStatus('out-of-sync');
        return;
      }

      try {
        // Check backend session
        const response = await fetch('/api/auth/login-session', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBackendUser(data.user);
          
          // Compare frontend and backend user data
          if (data.user && frontendUser.id === data.user.id && frontendUser.username === data.user.username) {
            setSyncStatus('synced');
          } else {
            setSyncStatus('out-of-sync');
          }
        } else {
          setSyncStatus('out-of-sync');
        }
      } catch (error) {
        console.error('Session sync check failed:', error);
        setSyncStatus('out-of-sync');
      }
    };

    // Check immediately and then every 5 seconds
    checkSessionSync();
    const interval = setInterval(checkSessionSync, 5000);

    return () => clearInterval(interval);
  }, [frontendUser]);

  if (!frontendUser) {
    return null; // Don't show indicator when not logged in
  }

  const getVariant = () => {
    switch (syncStatus) {
      case 'synced': return 'default';
      case 'out-of-sync': return 'destructive';
      case 'checking': return 'secondary';
      default: return 'secondary';
    }
  };

  const getLabel = () => {
    switch (syncStatus) {
      case 'synced': return 'Session Synced';
      case 'out-of-sync': return 'Session Out of Sync';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  const getDetails = () => {
    if (syncStatus === 'synced') {
      return `Frontend: ${frontendUser.username} | Backend: ${backendUser?.username || 'N/A'}`;
    }
    if (syncStatus === 'out-of-sync') {
      return `Frontend: ${frontendUser?.username || 'None'} | Backend: ${backendUser?.username || 'None'}`;
    }
    return '';
  };

  return (
    <div className="flex flex-col gap-1 text-xs">
      <Badge variant={getVariant()} className="text-[10px] py-0.5">
        {getLabel()}
      </Badge>
      {syncStatus !== 'checking' && (
        <div className="text-[9px] text-muted-foreground opacity-70 max-w-[180px] truncate">
          {getDetails()}
        </div>
      )}
    </div>
  );
};