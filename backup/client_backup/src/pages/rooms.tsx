import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Bed, Users, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Room } from "@shared/schema";

export default function Rooms() {
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ["/api/rooms"],
    queryFn: api.getRooms,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_order":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div>
        <TopBar title="Rooms" subtitle="Manage room inventory and status" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load rooms. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Rooms" subtitle="Manage room inventory and status" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Room Management</h3>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : rooms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map((room: Room) => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Room {room.number}</CardTitle>
                    <Badge className={getStatusColor(room.status)}>
                      {room.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Bed className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{room.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Capacity: {room.capacity}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${Number(room.pricePerNight)}/night
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {room.description}
                      </p>
                    )}
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

        {rooms && rooms.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first room.</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
