import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Building2, 
  Edit, 
  ArrowLeft,
  Users,
  Calendar,
  Settings
} from 'lucide-react';
import type { Location } from '@shared/schema';

export default function LocationDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/locations/:id');

  const { data: location, isLoading } = useQuery({
    queryKey: ['/api/locations', params?.id],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${params?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch location');
      }
      return response.json() as Location;
    },
    enabled: !!params?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Location not found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested location could not be found.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/locations')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Locations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/locations')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Locations
          </Button>
          <div className="flex items-center gap-3">
            {location.logoUrl ? (
              <img 
                src={location.logoUrl} 
                alt={`${location.name} logo`}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{location.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusBadge(location.status || 'active')}>
                  {location.status || 'active'}
                </Badge>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{location.timezone}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              localStorage.setItem('selectedLocationId', location.id.toString());
              navigate('/dashboard');
            }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            View Dashboard
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Location
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {location.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">{location.address}</p>
                  </div>
                </div>
              )}
              
              {location.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">{location.phoneNumber}</p>
                  </div>
                </div>
              )}
              
              {location.emailAddress && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">{location.emailAddress}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Timezone</p>
                  <p className="text-gray-600">{location.timezone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings & Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-sm">Location ID</p>
                  <p className="text-gray-600 text-sm">{location.id}</p>
                </div>
                {location.public_id && (
                  <div>
                    <p className="font-medium text-sm">Public ID</p>
                    <p className="text-gray-600 text-sm">{location.public_id}</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <p className="font-medium text-sm mb-2">Location Settings</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Crew scheduling enabled</p>
                  <p>• Application processing active</p>
                  <p>• Financial reporting available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge className={getStatusBadge(location.status || 'active')}>
                    {location.status || 'active'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Timezone</span>
                  <span className="text-sm font-medium">{location.timezone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium">
                    {location.createdAt ? new Date(location.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.setItem('selectedLocationId', location.id.toString());
                  navigate('/dashboard');
                }}
              >
                <Building2 className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.setItem('selectedLocationId', location.id.toString());
                  navigate('/staff-management');
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Crew
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.setItem('selectedLocationId', location.id.toString());
                  navigate('/scheduling');
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}