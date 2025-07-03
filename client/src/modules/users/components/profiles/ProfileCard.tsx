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
  const { data: validationResult, isLoading, error } = useQuery({
    queryKey: ['/api/validation/v3/validate', 'userProfile', userId],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          packageType: 'userProfile',
          data: {
            targetUserId: userId
          }
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (ValidationEngine30 with HybridCache)
  });

  // Extract profile data from ValidationResult30 structure
  const profile = validationResult?.isValid && validationResult?.data ? {
    id: validationResult.data.id,
    username: validationResult.data.username,
    email: validationResult.data.email,
    firstName: validationResult.data.firstName,
    lastName: validationResult.data.lastName,
    name: validationResult.data.firstName && validationResult.data.lastName 
      ? `${validationResult.data.firstName} ${validationResult.data.lastName}`
      : validationResult.data.username,
    phoneNumber: validationResult.data.phoneNumber,
    role: validationResult.data.role,
    status: validationResult.data.status,
    createdAt: validationResult.data.createdAt,
    locationId: validationResult.data.locationId
  } : null;

  if (isLoading) {
    return <PortalProfileSkeleton />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load profile information</p>
        </CardContent>
      </Card>
    );
  }

  // Handle ValidationEngine30 validation errors
  if (validationResult && !validationResult.isValid) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-red-600">
            Access denied: {validationResult.errors?.[0] || 'Profile access not authorized'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-gray-600">No profile data found</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-slate-200 text-slate-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'interviewed':
        return 'bg-blue-500 text-white';
      case 'short-listed':
        return 'bg-green-500 text-white';
      case 'hired':
        return 'bg-purple-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              {profile.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{profile.email}</p>
          </div>
          <Badge className={getStatusBadge(profile.status || 'new')}>
            {profile.status || 'new'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Role</p>
          <p className="text-sm text-gray-600 capitalize">{profile.role}</p>
        </div>
        
        {profile.phoneNumber && (
          <div>
            <p className="text-sm font-medium text-gray-900">Phone</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <a 
                href={`tel:${profile.phoneNumber}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {profile.phoneNumber}
              </a>
            </div>
          </div>
        )}
        
        {profile.locationId && (
          <div>
            <p className="text-sm font-medium text-gray-900">Location</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              Location {profile.locationId}
            </div>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-gray-900">Member Since</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM d, yyyy') : 'Unknown'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}