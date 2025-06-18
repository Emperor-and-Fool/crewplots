import React from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import ApplicantPortal from "@/pages/applicant-portal";
import Locations from "@/pages/locations";
import StaffManagement from "@/pages/staff-management";
import Scheduling from "@/pages/scheduling";
import ViewCalendar from "@/pages/view-calendar";
import Applicants from "@/pages/applicants";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import RegistrationSuccess from "@/pages/registration-success";

// Role-based protected route that checks user roles
const RoleProtectedRoute = ({ component: Component, requiredRoles = [], ...rest }: any) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Loading...</p>
      </div>
    </div>;
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
  const { isLoading, user, isAuthenticated } = useAuth();
  
  // Handle role-based redirects after authentication is complete
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'applicant') {
      if (window.location.pathname !== '/applicant-portal' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register' &&
          window.location.pathname !== '/registration-success') {
        window.location.href = '/applicant-portal';
      }
    }
  }, [isLoading, isAuthenticated, user]);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    </div>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
          <Router>
            <Switch>
              {/* PUBLIC ROUTES */}
              <Route path="/login">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Login />}
              </Route>
              
              <Route path="/register">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Register />}
              </Route>
              
              <Route path="/registration-success">
                <RegistrationSuccess />
              </Route>
              
              {/* PROTECTED ROUTES */}
              <Route path="/dashboard">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Dashboard />) : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicant-portal">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ApplicantPortal} 
                    requiredRoles={["applicant"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/locations">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Locations} 
                    requiredRoles={["manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/staff-management">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={StaffManagement} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/scheduling">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Scheduling} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/view-calendar">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ViewCalendar} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicants">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Applicants} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/knowledge-base">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={KnowledgeBase} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/reports">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Reports} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* DEFAULT ROUTE */}
              <Route path="/">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* CATCH ALL */}
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Router>
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}