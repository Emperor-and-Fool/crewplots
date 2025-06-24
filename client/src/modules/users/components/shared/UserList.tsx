/**
 * User Module - Shared User List Component
 * 
 * Reusable list component for displaying collections of users with filtering,
 * sorting, and bulk operations. Used across user management and applicant views.
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, SortAsc, SortDesc, MoreHorizontal } from 'lucide-react';
import { UserCard } from './UserCard';
import type { User } from '@shared/schema';
import type { UserListFilters } from '../../types';

interface UserListProps {
  users: User[];
  isLoading?: boolean;
  filters?: UserListFilters;
  onFiltersChange?: (filters: UserListFilters) => void;
  showFilters?: boolean;
  showBulkActions?: boolean;
  variant?: 'default' | 'compact';
  onUserView?: (user: User) => void;
  onUserEdit?: (user: User) => void;
  onUserDelete?: (user: User) => void;
  onUserApprove?: (user: User) => void;
  onUserReject?: (user: User) => void;
  onBulkAction?: (action: string, userIds: number[]) => void;
  customActions?: Array<{
    label: string;
    onClick: (user: User) => void;
    variant?: 'default' | 'destructive';
  }>;
  emptyMessage?: string;
}

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'crew_member', label: 'Crew Member' },
  { value: 'applicant', label: 'Applicant' },
];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'createdAt', label: 'Created Date' },
];

export function UserList({
  users,
  isLoading = false,
  filters = {},
  onFiltersChange,
  showFilters = true,
  showBulkActions = false,
  variant = 'default',
  onUserView,
  onUserEdit,
  onUserDelete,
  onUserApprove,
  onUserReject,
  onBulkAction,
  customActions = [],
  emptyMessage = 'No users found.'
}: UserListProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleFilterChange = (key: keyof UserListFilters, value: any) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedUsers.size > 0) {
      onBulkAction(action, Array.from(selectedUsers));
      setSelectedUsers(new Set());
    }
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    handleFilterChange('sortOrder', newOrder);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showFilters && (
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
            <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
            <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
          </div>
        )}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select 
            value={filters.role || 'all'} 
            onValueChange={(value) => handleFilterChange('role', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.sortBy || 'name'} 
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={toggleSortOrder}>
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {showBulkActions && selectedUsers.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedUsers.size === users.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('approve')}
            >
              Approve Selected
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('reject')}
            >
              Reject Selected
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center space-x-3">
              {showBulkActions && (
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                />
              )}
              <div className="flex-1">
                <UserCard
                  user={user}
                  variant={variant}
                  onView={onUserView}
                  onEdit={onUserEdit}
                  onDelete={onUserDelete}
                  onApprove={onUserApprove}
                  onReject={onUserReject}
                  customActions={customActions}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {users.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4">
          <p>Showing {users.length} user{users.length !== 1 ? 's' : ''}</p>
          {selectedUsers.size > 0 && (
            <Badge variant="secondary">
              {selectedUsers.size} selected
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}