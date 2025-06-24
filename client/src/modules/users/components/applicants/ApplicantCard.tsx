/**
 * User Module - Applicant-Specific Card Component
 * 
 * Specialized card component for applicant management with application-specific
 * actions and status indicators.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  MessageSquare,
  Calendar,
  Mail,
  Phone 
} from 'lucide-react';
import type { User } from '@shared/schema';

interface ApplicantCardProps {
  applicant: User;
  showNotes?: boolean;
  showActions?: boolean;
  onClick?: (id: number) => void;
  onView?: (applicant: User) => void;
  onApprove?: (applicant: User) => void;
  onReject?: (applicant: User) => void;
  onScheduleInterview?: (applicant: User) => void;
  onAddNote?: (applicant: User) => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Pending Review'
  },
  approved: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    label: 'Approved'
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    label: 'Rejected'
  },
  interview: {
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800',
    label: 'Interview Scheduled'
  }
};

export function ApplicantCard({
  applicant,
  showNotes = true,
  showActions = true,
  onClick,
  onView,
  onApprove,
  onReject,
  onScheduleInterview,
  onAddNote
}: ApplicantCardProps) {
  const applicantInitials = applicant.name?.split(' ').map(n => n[0]).join('') || 
                           applicant.username?.[0]?.toUpperCase() || 'A';
  
  // For now, we'll use a default status since it's not in the schema yet
  const status = 'pending';
  const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const applicationDate = applicant.createdAt ? new Date(applicant.createdAt) : new Date();
  const daysSinceApplication = Math.floor((Date.now() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card 
      className="w-full hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => onClick?.(applicant.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${applicant.name}`} />
            <AvatarFallback>{applicantInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{applicant.name}</h3>
            <p className="text-sm text-gray-500">Applied {daysSinceApplication} days ago</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusInfo.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{applicant.email}</span>
          </div>
          {applicant.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{applicant.phone}</span>
            </div>
          )}
        </div>

        {/* Application Details */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Position</p>
              <p className="font-medium">General Staff</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Experience</p>
              <p className="font-medium">Entry Level</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Availability</p>
              <p className="font-medium">Flexible</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Location</p>
              <p className="font-medium">
                {applicant.locationId ? `Location ${applicant.locationId}` : 'Any Location'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {showNotes && (
              <div className="flex items-center text-gray-500">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>Notes available</span>
              </div>
            )}
            <div className="flex items-center text-gray-500">
              <FileText className="h-4 w-4 mr-1" />
              <span>Documents: 2</span>
            </div>
          </div>
          <div className="text-gray-500">
            ID: {applicant.id}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {onView && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onView(applicant)}
              >
                View Details
              </Button>
            )}
            
            {status === 'pending' && (
              <>
                {onApprove && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => onApprove(applicant)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                )}
                
                {onScheduleInterview && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onScheduleInterview(applicant)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Interview
                  </Button>
                )}
                
                {onReject && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onReject(applicant)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            )}
            
            {onAddNote && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onAddNote(applicant)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}