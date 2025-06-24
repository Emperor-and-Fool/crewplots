import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Shield, Database, Cog } from 'lucide-react';
import { Link } from 'wouter';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage system configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Email Configuration */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/settings/email">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure SMTP server and email notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Set up email delivery, test connections, and manage email templates
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Security Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/settings/security">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Location deletion security and access control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Configure location deletion security, audit trails, and verification methods
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Database Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Database
            </CardTitle>
            <CardDescription>
              Database connections and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Monitor database performance and configure connections
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon</p>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5 text-gray-600" />
              General
            </CardTitle>
            <CardDescription>
              Application preferences and defaults
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Configure timezone, language, and default application behavior
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/settings/email">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Configure Email
              </Button>
            </Link>
            <Link href="/settings/security">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
            </Link>
            <Button variant="outline" size="sm" disabled>
              <Database className="h-4 w-4 mr-2" />
              Database Backup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}