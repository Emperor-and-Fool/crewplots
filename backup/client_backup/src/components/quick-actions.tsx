import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bed, FileBarChart, Settings, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function QuickActions() {
  const { data: systemHealth } = useQuery({
    queryKey: ["/api/health"],
    queryFn: api.getHealth,
    refetchInterval: 30000,
  });

  const actions = [
    {
      title: "New Reservation",
      description: "Create booking",
      icon: Plus,
      iconBg: "bg-blue-600",
      onClick: () => console.log("Open new reservation form"),
    },
    {
      title: "Manage Rooms",
      description: "Room status",
      icon: Bed,
      iconBg: "bg-green-600",
      onClick: () => console.log("Open room management"),
    },
    {
      title: "Generate Report",
      description: "Analytics",
      icon: FileBarChart,
      iconBg: "bg-yellow-500",
      onClick: () => console.log("Open reports"),
    },
    {
      title: "Settings",
      description: "Configure",
      icon: Settings,
      iconBg: "bg-gray-500",
      onClick: () => console.log("Open settings"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full flex items-center p-4 h-auto justify-start"
            onClick={action.onClick}
          >
            <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center mr-3`}>
              <action.icon className="text-white" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{action.title}</p>
              <p className="text-sm text-gray-500">{action.description}</p>
            </div>
          </Button>
        ))}

        {/* System Status */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">System Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">
                  {systemHealth?.database === "connected" ? "Online" : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Redis Cache</span>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  systemHealth?.redis?.connected ? "bg-green-500" : "bg-red-500"
                }`}></div>
                <span className={`text-xs ${
                  systemHealth?.redis?.connected ? "text-green-600" : "text-red-600"
                }`}>
                  {systemHealth?.redis?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Server</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">
                  {systemHealth?.status === "healthy" ? "Healthy" : "Unhealthy"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
