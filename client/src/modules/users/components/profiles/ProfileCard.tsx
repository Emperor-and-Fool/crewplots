import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortalProfileSkeleton } from './PortalProfileSkeleton';
import { User } from '@shared/schema';
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileCardProps {
  userId: number;
  className?: string;
}

export function ProfileCard({ userId, className }: ProfileCardProps) {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['/api/validation/v3/auth-profile', userId],
    queryFn: async () => {
      // Use ValidationEngine30 direct validation for profile data
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'read',
          entityType: 'authProfile',
          data: { userId },
          context: {
            userId: userId,
            userRole: 'authenticated', // Basic role for auth validation
            permissions: ['user.read'] // Basic permission for profile access
          }
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const result = await response.json();
      
      // Extract user data from ValidationEngine30 response structure
      if (result.threads?.transaction?.success && result.threads.transaction.data?.user) {
        return result.threads.transaction.data.user;
      }
      throw new Error('Invalid profile data structure');
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return <PortalProfileSkeleton />;
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-red-600 ${className}`}>
        Error loading profile: {error.message}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`p-4 text-center text-gray-600 ${className}`}>
        Profile not found
      </div>
    );
  }

  // Handle name display with priority: firstName/lastName > name > username
  const displayName = profile.firstName && profile.lastName 
    ? `${profile.firstName} ${profile.lastName}`
    : profile.name || profile.username;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      case 'owner':
        return 'bg-red-100 text-red-800';
      case 'app_manager':
        return 'bg-blue-100 text-blue-800';
      case 'crew_chief':
        return 'bg-green-100 text-green-800';
      case 'crew_member':
        return 'bg-yellow-100 text-yellow-800';
      case 'applicant':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRoleDisplay = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            {displayName}
          </CardTitle>
          <Badge className={getRoleBadgeColor(profile.role)}>
            {formatRoleDisplay(profile.role)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Username:</span>
              <span>@{profile.username}</span>
            </div>
            
            {profile.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Email:</span>
                <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                  {profile.email}
                </a>
              </div>
            )}
            
            {profile.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Phone:</span>
                <a href={`tel:${profile.phone}`} className="text-blue-600 hover:underline">
                  {profile.phone}
                </a>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {profile.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Member since:</span>
                <span>{format(new Date(profile.createdAt), 'MMM dd, yyyy')}</span>
              </div>
            )}
            
            {profile.notes && profile.notes.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Notes:</span>
                <span>{profile.notes.length} note{profile.notes.length === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </div>
        
        {profile.notes && profile.notes.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Recent Notes</h4>
            <div className="space-y-2">
              {profile.notes.slice(0, 3).map((note: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: note.compiledContent || note.content }} />
                    </div>
                    <div className="text-xs text-gray-500 ml-2">
                      {note.wordCount} words
                    </div>
                  </div>
                  {note.updatedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      Updated: {format(new Date(note.updatedAt), 'MMM dd, HH:mm')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}