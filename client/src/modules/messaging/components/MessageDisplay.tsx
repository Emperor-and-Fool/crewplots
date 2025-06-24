// Phase 4: MessageDisplay component - Extracted from messaging-system.tsx
// Component for displaying messages with permissions and actions

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash, MoreVertical, Lock, AlertTriangle } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import type { ExtendedMessage, WorkflowType } from '../types/messaging.types';
import { useMessagePermissions } from '../hooks/useMessagePermissions';

interface MessageDisplayProps {
  message: ExtendedMessage;
  currentUserId: number;
  currentUserRole: string;
  workflow: WorkflowType;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  isUpdating?: boolean;
  compactMode?: boolean;
}

export function MessageDisplay({
  message,
  currentUserId,
  currentUserRole,
  workflow,
  onEdit,
  onDelete,
  isEditing = false,
  editContent = '',
  onEditContentChange,
  onCancelEdit,
  onSaveEdit,
  isUpdating = false,
  compactMode = false
}: MessageDisplayProps) {
  const permissions = useMessagePermissions({
    userId: currentUserId,
    userRole: currentUserRole,
    workflow,
    messageOwnerId: message.userId
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'orange';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return null;
  };

  if (compactMode) {
    return (
      <div className="flex items-start gap-3 p-3 border rounded-lg">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {message.sender?.username?.slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{message.sender?.username || 'Unknown'}</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {message.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <RichTextEditor
                content={editContent}
                onChange={onEditContentChange || (() => {})}
                workflow={workflow}
                minHeight="80px"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="mt-1 text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
          )}
        </div>

        {/* Actions Menu */}
        {(permissions.canEdit || permissions.canDelete) && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permissions.canEdit && (
                <DropdownMenuItem onClick={() => onEdit?.(message.id, message.content)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {permissions.canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete?.(message.id)}
                  className="text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {message.sender?.username?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{message.sender?.username || 'Unknown'}</span>
                <Badge variant="outline" className="text-xs">
                  {message.sender?.role || 'User'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                {message.isPrivate && (
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Private</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority Badge */}
            <Badge variant={getPriorityColor(message.priority)} className="text-xs">
              {getPriorityIcon(message.priority)}
              {message.priority}
            </Badge>

            {/* Actions Menu */}
            {(permissions.canEdit || permissions.canDelete) && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {permissions.canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(message.id, message.content)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {permissions.canDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(message.id)}
                      className="text-destructive"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <RichTextEditor
              content={editContent}
              onChange={onEditContentChange || (() => {})}
              workflow={workflow}
            />
            <div className="flex gap-2">
              <Button onClick={onSaveEdit} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        )}
      </CardContent>
    </Card>
  );
}