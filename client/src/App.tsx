import React from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/error-boundary";
import { EmergencyLogout } from "@/components/emergency-logout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import ApplicantPortal from "@/pages/applicant-portal";
import Locations from "@/pages/locations";
import LocationsPage from "@/pages/locations";
import LocationNewPage from "@/pages/location-new";
import StaffManagement from "@/pages/staff-management";
import Scheduling from "@/pages/scheduling";
import ViewCalendar from "@/pages/view-calendar";
import Applicants from "@/pages/applicants";
import ApplicantDetail from "@/pages/applicant-detail";
import Profile from "@/pages/profile";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import EmailSettings from "@/pages/email-settings";
import UserSettings from "@/pages/user-settings";
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

  // Emergency logout key combination (Ctrl+Shift+L)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        console.log('Emergency logout triggered');
        window.location.href = '/api/auth/dev-logout';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading...</p>
        <div className="mt-8">
          <EmergencyLogout />
        </div>
      </div>
    </div>;
  }

  return (
    <ErrorBoundary>
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
                    <RoleProtectedRoute 
                      component={Dashboard} 
                      requiredRoles={["manager", "crew_member", "crew_manager", "administrator"]} 
                    />) : 
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
                    component={LocationsPage} 
                    requiredRoles={["manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/locations/new">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={LocationNewPage} 
                    requiredRoles={["manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/staff-management">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={StaffManagement} 
                    requiredRoles={["manager", "floor_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/scheduling">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Scheduling} 
                    requiredRoles={["manager", "floor_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/view-calendar">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ViewCalendar} 
                    requiredRoles={["manager", "floor_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicants">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Applicants} 
                    requiredRoles={["manager", "crew_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicant/:id">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ApplicantDetail} 
                    requiredRoles={["manager", "crew_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/knowledge-base">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={KnowledgeBase} 
                    requiredRoles={["manager", "floor_manager", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/reports">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={Reports} 
                      requiredRoles={["manager", "floor_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              <Route path="/settings">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={Settings} 
                      requiredRoles={["administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              <Route path="/user-settings">
                {isAuthenticated ? 
                  <AppLayout>
                    <UserSettings />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              <Route path="/settings/email">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={EmailSettings} 
                      requiredRoles={["administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/profile">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={Profile} 
                      requiredRoles={["manager", "crew_member", "crew_manager"]} 
                    />
                  </AppLayout> : 
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
    </ErrorBoundary>
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