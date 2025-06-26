import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { User } from '@shared/schema';

interface NotesMetadata {
  exists: boolean;
  documentId: string | null;
  wordCount: number;
  characterCount: number;
  lastUpdated: string | null;
  workflow: string | null;
}

interface ProfileResponse extends Omit<User, 'notes'> {
  notes?: NotesMetadata;
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: profile, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-36 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">Failed to load profile information</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">No profile data found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      case 'crew_member':
        return 'bg-blue-100 text-blue-800';
      case 'applicant':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">My Profile</h1>
          </div>
          <Button 
            onClick={() => navigate('/profile/edit')}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserIcon className="h-6 w-6" />
                  {profile.name}
                </CardTitle>
                <p className="text-lg text-gray-600 mt-1">{profile.email}</p>
              </div>
              <Badge className={getRoleBadgeColor(profile.role)}>
                {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </div>
                  </div>
                  
                  {profile.phoneNumber && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        {profile.phoneNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Role</p>
                    <p className="text-gray-600 capitalize">
                      {profile.role.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">Member Since</p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM d, yyyy') : 'Unknown'}
                    </div>
                  </div>

                  {profile.locationId && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Primary Location</p>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        Location {profile.locationId}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {profile.notes && typeof profile.notes === 'object' && profile.notes.exists && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Word count: {profile.notes.wordCount || 0}
                    </p>
                    {profile.notes.lastUpdated && (
                      <p className="text-sm text-gray-600">
                        Last updated: {format(new Date(profile.notes.lastUpdated), 'MMM d, yyyy')}
                      </p>
                    )}
                    {profile.notes.workflow && (
                      <p className="text-sm text-gray-600">
                        Status: {profile.notes.workflow}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {profile.notes && typeof profile.notes === 'string' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{profile.notes}</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                onClick={() => navigate('/user-settings')}
                className="w-full sm:w-auto"
              >
                Edit Profile Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}