import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Competency {
  id: number;
  name: string;
  description: string;
  locationId: number;
}

interface ShiftRequirement {
  id: number;
  shiftId: number;
  competencyId: number;
  minimumLevel: number;
  competency?: Competency;
}

interface CompetencySelectorProps {
  scheduleBlockId: number;
  locationId?: number;
  onRequirementsChange?: (requirements: ShiftRequirement[]) => void;
}

export default function CompetencySelector({ 
  scheduleBlockId, 
  locationId = 1,
  onRequirementsChange 
}: CompetencySelectorProps) {
  const { toast } = useToast();

  // Fetch competencies for the location
  const { data: competencies = [], isLoading: competenciesLoading } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'competency', locationId],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType: 'competency',
          operation: 'list',
          data: { locationId }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch competencies');
      const result = await response.json();
      return result.threads?.transaction?.data || [];
    }
  });

  // Fetch existing shift requirements for this schedule
  const { data: shiftRequirements = [], isLoading: requirementsLoading } = useQuery({
    queryKey: ['/api/scheduler/shift-requirements', scheduleBlockId],
    queryFn: async () => {
      const response = await fetch(`/api/scheduler/shift-requirements?scheduleBlockId=${scheduleBlockId}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch shift requirements');
      return response.json();
    }
  });

  const addRequirement = async (competencyId: number, minimumLevel: number = 1) => {
    try {
      const response = await fetch('/api/scheduler/shift-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scheduleBlockId,
          competencyId,
          minimumLevel
        })
      });

      if (!response.ok) throw new Error('Failed to add requirement');
      
      toast({
        title: "Requirement Added",
        description: "Competency requirement has been added successfully."
      });

      // Trigger refetch
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add competency requirement.",
        variant: "destructive"
      });
    }
  };

  const removeRequirement = async (requirementId: number) => {
    try {
      const response = await fetch(`/api/scheduler/shift-requirements/${requirementId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to remove requirement');
      
      toast({
        title: "Requirement Removed",
        description: "Competency requirement has been removed successfully."
      });

      // Trigger refetch
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to remove competency requirement.",
        variant: "destructive"
      });
    }
  };

  if (competenciesLoading || requirementsLoading) {
    return <div>Loading competencies...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Competency Requirement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select onValueChange={(value) => addRequirement(parseInt(value))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select competency..." />
              </SelectTrigger>
              <SelectContent>
                {competencies.map((competency: Competency) => (
                  <SelectItem key={competency.id} value={competency.id.toString()}>
                    {competency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {competencies.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No competencies available for this location.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {shiftRequirements.length === 0 ? (
            <p className="text-muted-foreground">No competency requirements set for this schedule.</p>
          ) : (
            <div className="space-y-2">
              {shiftRequirements.map((requirement: ShiftRequirement) => (
                <div key={requirement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {requirement.competency?.name || `Competency ${requirement.competencyId}`}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Level {requirement.minimumLevel}+
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRequirement(requirement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}