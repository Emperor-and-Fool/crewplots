import { Link, useLocation } from "wouter";
import { 
  Hotel, 
  BarChart3, 
  Bed, 
  CalendarCheck, 
  Users, 
  UserRoundCheck, 
  DollarSign, 
  FileBarChart, 
  Settings,
  CheckCircle2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function Sidebar() {
  const [location] = useLocation();
  
  const { data: redisStatus } = useQuery({
    queryKey: ["/api/redis/test"],
    queryFn: api.testRedis,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const navItems = [
    { path: "/", icon: BarChart3, label: "Dashboard" },
    { path: "/rooms", icon: Bed, label: "Rooms" },
    { path: "/reservations", icon: CalendarCheck, label: "Reservations" },
    { path: "/guests", icon: Users, label: "Guests" },
    { path: "/staff", icon: UserRoundCheck, label: "Staff" },
  ];

  const operationItems = [
    { path: "/billing", icon: DollarSign, label: "Billing" },
    { path: "/reports", icon: FileBarChart, label: "Reports" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg fixed left-0 top-0 h-full z-30 border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Hotel className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Crew Plots Pro</h1>
            <p className="text-sm text-gray-500">Hospitality Management</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-6 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</p>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <a className={`flex items-center px-6 py-3 transition-colors ${
                    isActive 
                      ? "text-blue-600 bg-blue-50 border-r-3 border-blue-600" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                  }`}>
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="px-6 mt-8 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operations</p>
        </div>
        <ul className="space-y-1">
          {operationItems.map((item) => {
            const isActive = location === item.path;
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <a className={`flex items-center px-6 py-3 transition-colors ${
                    isActive 
                      ? "text-blue-600 bg-blue-50 border-r-3 border-blue-600" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                  }`}>
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Redis Connection Status */}
        <div className="mx-6 mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              redisStatus?.connected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              redisStatus?.connected ? 'text-green-600' : 'text-red-600'
            }`}>
              Redis {redisStatus?.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {redisStatus?.connected ? 'Cache layer active' : 'Cache unavailable'}
          </p>
        </div>
      </nav>
    </aside>
  );
}
