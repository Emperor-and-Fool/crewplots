import { Switch, Route, Router, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import * as React from "react";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Locations from "@/pages/locations";
import StaffManagement from "@/pages/staff-management";
import Scheduling from "@/pages/scheduling";
import Applicants from "@/pages/applicants";
import CashManagement from "@/pages/cash-management";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

// Protected route component that only checks if user is authenticated
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <Component {...rest} />;
};

// Role-based protected route that also checks user roles
const RoleProtectedRoute = ({ component: Component, requiredRoles = [], ...rest }: any) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component {...rest} />;
};

function App() {
  const { isLoading, user } = useAuth();

  // Debug logging to see what state we're in
  console.log("App.tsx - Auth state:", { isLoading, isAuthenticated: !!user });
  
  // Force state transition after a timeout if getting stuck
  React.useEffect(() => {
    let timeoutId: number;
    
    if (isLoading) {
      // If still loading after 3 seconds, force a state change by refetching
      timeoutId = window.setTimeout(() => {
        console.log("Loading timeout reached - forcing refresh");
        window.location.reload();
      }, 3000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // Show login page directly if not authenticated and not loading
  if (!user && !isLoading) {
    console.log("Not authenticated and not loading - showing login page");
    return <Route path="*" component={Login} />;
  }
  
  // Show loading indicator
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4">Loading...</div>
        <div className="text-sm text-gray-500">If this persists, please refresh the page</div>
      </div>
    </div>;
  }

  return (
    <TooltipProvider>
      <Router>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          
          <Route path="/dashboard">
            <ProtectedRoute component={Dashboard} />
          </Route>
          
          <Route path="/locations">
            <RoleProtectedRoute 
              component={Locations} 
              requiredRoles={["manager"]} 
            />
          </Route>
          
          <Route path="/staff-management">
            <RoleProtectedRoute 
              component={StaffManagement} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/scheduling">
            <RoleProtectedRoute 
              component={Scheduling} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/applicants">
            <RoleProtectedRoute 
              component={Applicants} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/cash-management">
            <RoleProtectedRoute 
              component={CashManagement} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/knowledge-base">
            <ProtectedRoute component={KnowledgeBase} />
          </Route>
          
          <Route path="/reports">
            <RoleProtectedRoute 
              component={Reports} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          {/* Default route - should be after all other routes */}
          <Route path="/">
            <Redirect to="/login" />
          </Route>
          
          {/* Not found - should be the very last */}
          <Route component={NotFound} />
        </Switch>
      </Router>
    </TooltipProvider>
  );
}

export default App;
