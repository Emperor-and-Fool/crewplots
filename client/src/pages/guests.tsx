import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, User, Mail, Phone, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import type { Guest } from "@shared/schema";

export default function Guests() {
  const { data: guests, isLoading, error } = useQuery({
    queryKey: ["/api/guests"],
    queryFn: api.getGuests,
  });

  if (error) {
    return (
      <div>
        <TopBar title="Guests" subtitle="Manage guest information and preferences" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load guests. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Guests" subtitle="Manage guest information and preferences" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Guest Management</h3>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Guest
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : guests ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guests.map((guest: Guest) => (
              <Card key={guest.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <User className="text-gray-500" size={20} />
                    </div>
                    {guest.firstName} {guest.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{guest.email}</span>
                    </div>
                    {guest.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{guest.phone}</span>
                      </div>
                    )}
                    {guest.dateOfBirth && (
                      <div className="text-sm text-gray-500">
                        Born: {format(new Date(guest.dateOfBirth), "MMM dd, yyyy")}
                      </div>
                    )}
                    {guest.address && (
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {guest.address}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Joined: {format(new Date(guest.createdAt!), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {guests && guests.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No guests found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first guest.</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
