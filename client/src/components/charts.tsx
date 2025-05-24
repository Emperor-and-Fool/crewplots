import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChartsProps {
  roomStatusCounts: { status: string; count: number }[];
}

export function Charts({ roomStatusCounts }: ChartsProps) {
  // Calculate total rooms and percentages
  const totalRooms = roomStatusCounts.reduce((sum, item) => sum + item.count, 0);
  
  const statusData = roomStatusCounts.map(item => ({
    ...item,
    percentage: totalRooms > 0 ? Math.round((item.count / totalRooms) * 100) : 0
  }));

  const statusColors = {
    occupied: { bg: "bg-blue-600", text: "text-blue-600" },
    available: { bg: "bg-green-600", text: "text-green-600" },
    maintenance: { bg: "bg-yellow-500", text: "text-yellow-500" },
    out_of_order: { bg: "bg-red-600", text: "text-red-600" },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Trends</CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" className="px-3 py-1 text-sm">7D</Button>
              <Button variant="outline" size="sm" className="px-3 py-1 text-sm">30D</Button>
              <Button variant="outline" size="sm" className="px-3 py-1 text-sm">90D</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Mock chart bars */}
            <div className="absolute bottom-0 left-0 w-full h-full flex items-end justify-around px-4 pb-4">
              {[40, 65, 55, 80, 75, 90, 85].map((height, index) => (
                <div 
                  key={index}
                  className="w-8 bg-blue-600 rounded-t" 
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
            <span className="text-gray-400 font-medium z-10">Revenue Analytics</span>
          </div>
        </CardContent>
      </Card>

      {/* Room Status Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Room Status</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Mock pie chart */}
              <div 
                className="w-full h-full rounded-full" 
                style={{
                  background: `conic-gradient(
                    #2563eb 0% 65%, 
                    #16a34a 65% 85%, 
                    #eab308 85% 95%, 
                    #dc2626 95% 100%
                  )`
                }}
              ></div>
              <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
                  <p className="text-sm text-gray-500">Total Rooms</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {statusData.map((item) => {
              const colors = statusColors[item.status as keyof typeof statusColors] || 
                { bg: "bg-gray-500", text: "text-gray-500" };
              
              return (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 ${colors.bg} rounded-full`}></div>
                    <span className="text-sm text-gray-600 capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
