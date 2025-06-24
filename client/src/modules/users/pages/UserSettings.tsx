import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Shield, Bell, Palette, Database, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function UserSettings() {
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            User Settings
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Change your name, email, phone number, and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Update your personal information and contact details.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/profile'}>
                View Profile
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Manage your password, two-factor authentication, and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-gray-600">Change your account password</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Password
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Setup 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive updates about your applications and messages</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Configure Email
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Push Notifications</h4>
                  <p className="text-sm text-gray-600">Get instant notifications on your device</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Setup Push
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Theme</h4>
                  <p className="text-sm text-gray-600">Choose between light and dark mode</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Theme
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Language</h4>
                  <p className="text-sm text-gray-600">Select your preferred language</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Language
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>
                Manage your data and privacy preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Export Data</h4>
                  <p className="text-sm text-gray-600">Download a copy of your data</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Export Data
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Delete Account</h4>
                  <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
                  <Button variant="destructive" size="sm" className="mt-2">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}