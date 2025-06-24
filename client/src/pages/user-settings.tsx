import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function UserSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Settings</h1>
        <p className="text-gray-600">Manage your personal preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Change your name, email, phone number, and profile picture
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/profile'}>
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure email and push notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Choose what notifications you want to receive and how
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon</p>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Privacy
            </CardTitle>
            <CardDescription>
              Control your privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Manage data sharing and privacy settings
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon</p>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-orange-600" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize your interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Change theme, language, and display preferences
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your current account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span> {user?.name}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user?.email}
            </div>
            <div>
              <span className="font-medium">Role:</span> {user?.role}
            </div>
            <div>
              <span className="font-medium">Username:</span> {user?.username}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}