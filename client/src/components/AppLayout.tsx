import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  Hotel, 
  BarChart3, 
  Building2,
  Users, 
  UserRoundCheck, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Role-based navigation configuration
const getNavigationForRole = (role: string) => {
  const baseItems = [
    { path: "/", icon: BarChart3, label: "Dashboard" }
  ];

  switch (role) {
    case 'administrator':
      return [
        ...baseItems,
        { path: "/locations", icon: Building2, label: "Locations" },
        { path: "/applicants", icon: Users, label: "Applicants" },
        { path: "/staff", icon: UserRoundCheck, label: "Staff" },
        { path: "/settings", icon: Settings, label: "Settings" }
      ];
    
    case 'manager':
      return [
        ...baseItems,
        { path: "/locations", icon: Building2, label: "Locations" },
        { path: "/applicants", icon: Users, label: "Applicants" },
        { path: "/staff", icon: UserRoundCheck, label: "Staff" }
      ];
    
    case 'crew_manager':
      return [
        ...baseItems,
        { path: "/staff", icon: UserRoundCheck, label: "Staff" }
      ];
    
    case 'crew_member':
      return [
        ...baseItems
      ];
    
    case 'applicant':
      return [
        { path: "/applicant-portal", icon: BarChart3, label: "My Application" }
      ];
    
    default:
      return baseItems;
  }
};

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  
  // Global keyboard shortcut for logout (Ctrl+Shift+Q)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
        event.preventDefault();
        console.log("Using direct server-side logout from keyboard shortcut");
        window.location.href = "/api/auth/dev-logout";
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Get current user to determine role
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false
  });

  const navItems = user ? getNavigationForRole(user.role) : [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        w-64 bg-white shadow-lg fixed left-0 top-0 h-full z-30 border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Hotel className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CrewPlots</h1>
                <p className="text-sm text-gray-500">Hospitality Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <nav className="mt-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <li key={item.path}>
                  <Link href={item.path}>
                    <a 
                      className={`flex items-center px-6 py-3 transition-colors ${
                        isActive 
                          ? "text-blue-600 bg-blue-50 border-r-3 border-blue-600" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}