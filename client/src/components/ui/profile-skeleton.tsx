import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from '@/components/ui/card';

export function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-60 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div>
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-16 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}