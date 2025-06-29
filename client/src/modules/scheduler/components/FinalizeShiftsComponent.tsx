import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Shift {
  id: number;
  title: string;
  position: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status: 'draft' | 'open' | 'filled' | 'cancelled';
  weekScheduleId: number;
}

interface WeekSchedule {
  id: number;
  weekNumber: number;
}

interface FinalizeShiftsComponentProps {
  allShifts: Shift[];
  weekSchedules: WeekSchedule[];
  onFinalized: () => void;
}

const FinalizeShiftsComponent: React.FC<FinalizeShiftsComponentProps> = ({
  allShifts,
  weekSchedules,
  onFinalized
}) => {
  const [selectedShifts, setSelectedShifts] = useState<number[]>([]);
  const { toast } = useToast();

  // Filter only draft shifts
  const draftShifts = allShifts.filter(shift => shift.status === 'draft');

  // Group draft shifts by week
  const shiftsByWeek = weekSchedules.map(week => ({
    ...week,
    shifts: draftShifts.filter(shift => shift.weekScheduleId === week.id)
  })).filter(week => week.shifts.length > 0);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (selectedShifts.length === 0) {
        throw new Error('Please select shifts to finalize');
      }

      // Group selected shifts by week schedule for validation framework
      const shiftsByWeekSchedule = new Map<number, number[]>();
      selectedShifts.forEach(shiftId => {
        const shift = draftShifts.find(s => s.id === shiftId);
        if (shift) {
          const weekId = shift.weekScheduleId;
          if (!shiftsByWeekSchedule.has(weekId)) {
            shiftsByWeekSchedule.set(weekId, []);
          }
          shiftsByWeekSchedule.get(weekId)!.push(shiftId);
        }
      });

      // Call validation framework for each week
      const results = [];
      for (const [weekScheduleId, shiftIds] of Array.from(shiftsByWeekSchedule.entries())) {
        console.log(`🔥 FRONTEND: Finalizing ${shiftIds.length} shifts for week ${weekScheduleId}`);
        
        const result = await apiRequest('POST', '/api/scheduler/shifts/finalize', {
          shiftIds,
          weekScheduleId
        });
        
        results.push(result);
      }

      return results;
    },
    onSuccess: (results: any[]) => {
      const totalFinalized = results.reduce((sum, result) => {
        return sum + (result.finalizedShifts?.length || 0);
      }, 0);

      toast({
        title: "Shifts Finalized Successfully",
        description: `${totalFinalized} shifts have been finalized using the validation framework`,
      });

      setSelectedShifts([]);
      onFinalized();
    },
    onError: (error: any) => {
      console.error('❌ FRONTEND: Finalization failed:', error);
      toast({
        title: "Finalization Failed",
        description: error.message || "Failed to finalize shifts",
        variant: "destructive",
      });
    }
  });

  const handleShiftSelect = (shiftId: number, checked: boolean) => {
    setSelectedShifts(prev => 
      checked 
        ? [...prev, shiftId]
        : prev.filter(id => id !== shiftId)
    );
  };

  const handleSelectAllWeek = (weekShifts: Shift[], checked: boolean) => {
    const weekShiftIds = weekShifts.map(s => s.id);
    setSelectedShifts(prev => 
      checked 
        ? [...prev, ...weekShiftIds.filter(id => !prev.includes(id))]
        : prev.filter(id => !weekShiftIds.includes(id))
    );
  };

  if (draftShifts.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No draft shifts to finalize</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Finalize Draft Shifts
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select draft shifts to finalize using the validation framework. This will transition them from "Draft" to "Open" status.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shiftsByWeek.map(week => {
            const weekShiftIds = week.shifts.map(s => s.id);
            const allSelected = weekShiftIds.every(id => selectedShifts.includes(id));
            const someSelected = weekShiftIds.some(id => selectedShifts.includes(id));

            return (
              <div key={week.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => 
                        handleSelectAllWeek(week.shifts, checked as boolean)
                      }
                    />
                    <h4 className="font-medium">Week {week.weekNumber}</h4>
                    <Badge variant="secondary">
                      {week.shifts.length} draft shift{week.shifts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 ml-6">
                  {week.shifts.map(shift => (
                    <div key={shift.id} className="flex items-center gap-3 p-2 rounded border bg-muted/20">
                      <Checkbox
                        checked={selectedShifts.includes(shift.id)}
                        onCheckedChange={(checked) => 
                          handleShiftSelect(shift.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{shift.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {shift.dayOfWeek}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {shift.startTime} - {shift.endTime}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Draft
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Position: {shift.position}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} selected for finalization
            </div>
            <Button
              onClick={() => finalizeMutation.mutate()}
              disabled={selectedShifts.length === 0 || finalizeMutation.isPending}
              className="min-w-32"
            >
              {finalizeMutation.isPending ? (
                "Finalizing..."
              ) : (
                `Finalize ${selectedShifts.length} Shift${selectedShifts.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalizeShiftsComponent;