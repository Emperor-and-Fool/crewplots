import { Card, CardContent } from "@/components/ui/card";
import { Bed, TrendingUp, DollarSign, Star } from "lucide-react";

interface KPICardsProps {
  metrics: {
    totalRooms: number;
    occupancyRate: number;
    revenue: number;
    guestSatisfaction: number;
  };
}

export function KPICards({ metrics }: KPICardsProps) {
  const kpiData = [
    {
      title: "Total Rooms",
      value: metrics.totalRooms.toString(),
      change: "+12%",
      changeText: "vs last month",
      icon: Bed,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Occupancy Rate",
      value: `${metrics.occupancyRate}%`,
      change: "+5%",
      changeText: "vs last month",
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Revenue",
      value: `$${metrics.revenue.toLocaleString()}`,
      change: "+18%",
      changeText: "vs last month",
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Guest Satisfaction",
      value: metrics.guestSatisfaction.toString(),
      change: "+0.2",
      changeText: "vs last month",
      icon: Star,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-medium">{kpi.change}</span>
                  <span className="text-gray-500 text-sm ml-1">{kpi.changeText}</span>
                </div>
              </div>
              <div className={`w-12 h-12 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                <kpi.icon className={`${kpi.iconColor}`} size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
