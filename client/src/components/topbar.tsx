import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ title = "Dashboard", subtitle = "Welcome back! Here's what's happening at your property." }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="text-white" size={16} />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">Sarah Johnson</p>
              <p className="text-gray-500">Hotel Manager</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
