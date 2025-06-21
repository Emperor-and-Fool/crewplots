import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin, Calendar, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  role: string;
  phoneNumber?: string;
  locationId?: number;
  status?: string;
  createdAt: string;
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-red-600">Failed to load profile information</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">No profile data found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayName = profile.firstName && profile.lastName 
    ? `${profile.firstName} ${profile.lastName}`
    : profile.name;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'crew_manager':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'crew_member':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'applicant':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status) {
      case 'new':
        return 'bg-slate-200 text-slate-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'interviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'short-listed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hired':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">{displayName}</CardTitle>
                <p className="text-gray-600">@{profile.username}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role and Status */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={getRoleBadgeColor(profile.role)}>
                <Users className="w-3 h-3 mr-1" />
                {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              {profile.status && (
                <Badge variant="outline" className={getStatusBadgeColor(profile.status)}>
                  {profile.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{profile.email}</span>
              </div>
              
              {profile.phoneNumber && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{profile.phoneNumber}</span>
                </div>
              )}
              
              {profile.locationId && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Location ID: {profile.locationId}</span>
                </div>
              )}
            </div>

            {/* Account Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Account Information</h3>
              
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Member since {format(new Date(profile.createdAt), 'MMMM dd, yyyy')}</span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-700">
                <User className="w-4 h-4 text-gray-500" />
                <span>User ID: {profile.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}