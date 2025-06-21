import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from '@shared/schema';
import { Phone, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ApplicantCardProps {
  applicant: User;
  onClick?: (id: number) => void;
  className?: string;
}

// Status badge styling helper
const getStatusBadge = (status: string | undefined) => {
  if (!status) return 'bg-gray-200 text-gray-800';
  
  switch (status) {
    case 'new':
      return 'bg-slate-200 text-slate-800';
    case 'contacted':
      return 'bg-blue-100 text-blue-800';
    case 'interviewed':
      return 'bg-blue-500 text-white';
    case 'short-listed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'hired':
      return 'bg-green-500 text-white';
    case 'rejected':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

export function ApplicantCard({ applicant, onClick, className = "" }: ApplicantCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(applicant.id);
    }
  };

  return (
    <Card 
      className={`bg-white shadow-sm border cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1 ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-medium text-gray-900">{applicant.name}</h4>
          <Badge className={getStatusBadge(applicant.status)}>
            {applicant.status || 'new'}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {applicant.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-3 h-3" />
              <span>{applicant.email}</span>
            </div>
          )}
          
          {applicant.phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3 h-3" />
              <span>{applicant.phoneNumber}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
            <Calendar className="w-3 h-3" />
            <span>Applied {format(new Date(applicant.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}