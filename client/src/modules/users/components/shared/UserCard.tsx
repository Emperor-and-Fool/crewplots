/**
 * User Module - Shared User Card Component
 * 
 * Reusable card component for displaying user information across different contexts.
 * Used in user lists, applicant management, and staff overviews.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Mail, Phone, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@shared/schema';

interface UserCardProps {
  user: User;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
  customActions?: Array<{
    label: string;
    onClick: (user: User) => void;
    variant?: 'default' | 'destructive';
  }>;
}

const roleColors = {
  administrator: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  crew_member: 'bg-green-100 text-green-800',
  applicant: 'bg-yellow-100 text-yellow-800',
};

const roleLabels = {
  administrator: 'Administrator',
  manager: 'Manager', 
  crew_member: 'Crew Member',
  applicant: 'Applicant',
};

export function UserCard({ 
  user, 
  variant = 'default',
  showActions = true,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  customActions = []
}: UserCardProps) {
  const userInitials = user.name?.split(' ').map(n => n[0]).join('') || user.username?.[0]?.toUpperCase() || 'U';
  const roleColor = roleColors[user.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800';
  const roleLabel = roleLabels[user.role as keyof typeof roleLabels] || user.role;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}`} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`text-xs ${roleColor}`}>
            {roleLabel}
          </Badge>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(user)}>
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {customActions.map((action, index) => (
                  <DropdownMenuItem 
                    key={index}
                    onClick={() => action.onClick(user)}
                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}`} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.username}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={roleColor}>
            {roleLabel}
          </Badge>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(user)}>
                    View Profile
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    Edit User
                  </DropdownMenuItem>
                )}
                {user.role === 'applicant' && onApprove && (
                  <DropdownMenuItem onClick={() => onApprove(user)}>
                    Approve Application
                  </DropdownMenuItem>
                )}
                {user.role === 'applicant' && onReject && (
                  <DropdownMenuItem onClick={() => onReject(user)}>
                    Reject Application
                  </DropdownMenuItem>
                )}
                {customActions.map((action, index) => (
                  <DropdownMenuItem 
                    key={index}
                    onClick={() => action.onClick(user)}
                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(user)}
                    className="text-red-600"
                  >
                    Delete User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2" />
            {user.email}
          </div>
          {user.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2" />
              {user.phone}
            </div>
          )}
          {user.locationId && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              Location ID: {user.locationId}
            </div>
          )}
          {variant === 'detailed' && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">First Name</p>
                  <p className="font-medium">{user.firstName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Name</p>
                  <p className="font-medium">{user.lastName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}