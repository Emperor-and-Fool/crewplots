import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, UserRoundCheck, Building, Calendar, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import type { Staff } from "@shared/schema";

export default function Staff() {
  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: api.getStaff,
  });

  const getDepartmentColor = (department: string) => {
    switch (department.toLowerCase()) {
      case "housekeeping":
        return "bg-blue-100 text-blue-800";
      case "front desk":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "food service":
        return "bg-purple-100 text-purple-800";
      case "management":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div>
        <TopBar title="Staff" subtitle="Manage staff members and schedules" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load staff. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Staff" subtitle="Manage staff members and schedules" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Staff Management</h3>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : staff ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member: Staff) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <UserRoundCheck className="text-gray-500" size={20} />
                    </div>
                    {member.firstName} {member.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{member.position}</span>
                    </div>
                    <Badge className={getDepartmentColor(member.department)}>
                      {member.department}
                    </Badge>
                    {member.phone && (
                      <div className="text-sm text-gray-600">
                        Phone: {member.phone}
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Hired: {format(new Date(member.hireDate!), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {staff && staff.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <UserRoundCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first staff member.</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
