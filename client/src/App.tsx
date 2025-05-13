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

// Protected route component
const ProtectedRoute = ({ component: Component, requiredRoles = [], ...rest }: any) => {
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
  return (
    <TooltipProvider>
      <Router>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          
          <Route path="/dashboard">
            <ProtectedRoute component={Dashboard} />
          </Route>
          
          <Route path="/locations">
            <ProtectedRoute 
              component={Locations} 
              requiredRoles={["manager"]} 
            />
          </Route>
          
          <Route path="/staff-management">
            <ProtectedRoute 
              component={StaffManagement} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/scheduling">
            <ProtectedRoute 
              component={Scheduling} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/applicants">
            <ProtectedRoute 
              component={Applicants} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/cash-management">
            <ProtectedRoute 
              component={CashManagement} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route path="/knowledge-base">
            <ProtectedRoute component={KnowledgeBase} />
          </Route>
          
          <Route path="/reports">
            <ProtectedRoute 
              component={Reports} 
              requiredRoles={["manager", "floor_manager"]} 
            />
          </Route>
          
          <Route component={NotFound} />
        </Switch>
      </Router>
    </TooltipProvider>
  );
}

export default App;
