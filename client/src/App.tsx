import { Switch, Route, Router, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
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
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
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
