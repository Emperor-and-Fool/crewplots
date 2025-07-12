import React from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { LocationProvider } from "@/contexts/location-context";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/error-boundary";
import { EmergencyLogout } from "@/components/emergency-logout";
import { RegistrationPage, LoginPage } from "@/modules/auth";
import { Dashboard } from "@/modules/dashboard";
import { ApplicantPortal } from "@/modules/users";
import { LocationsPage, LocationDetailPage, LocationCreatePage } from "@/modules/locations";
import { CrewManagement, CrewMemberProfile, ProfileEdit } from "@/modules/users/pages";
import { CashManagement } from "@/modules/cashcount";

import ViewCalendar from "@/pages/view-calendar";
import { SchedulerListPage, SchedulerEditPage } from "@/modules/scheduler";
import { Applicants, ApplicantDetail } from "@/modules/users";
import { Profile } from "@/modules/users/pages";
import { KnowledgeBase } from "@/modules/knowledge-base";
import { Reports } from "@/modules/dashboard";
import Settings from "@/pages/settings";
import { EmailSettings, SecuritySettings, MessagingValidationTest } from "@/modules/administration";
import { UserSettings } from "@/modules/users/pages";
import NotFound from "@/pages/not-found";
import RegistrationSuccess from "@/pages/registration-success";
import LandingPage from "@/pages/landing";
// Removed non-existent administration imports

// Role-based protected route that checks user roles
const RoleProtectedRoute = ({ component: Component, requiredRoles = [], ...rest }: any) => {
  const { user, isLoading } = useAuth();
  
  console.log('🔍 ROLE PROTECTION: Checking access for:', Component.name, 'user role:', user?.role, 'required:', requiredRoles);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Loading...</p>
      </div>
    </div>;
  }
  
  if (!user) {
    console.log('🔍 ROLE PROTECTION: No user, redirecting to login');
    return <Redirect to="/login" />;
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    console.log('🔍 ROLE PROTECTION: Access denied, redirecting to dashboard');
    return <Redirect to="/dashboard" />;
  }
  
  console.log('🔍 ROLE PROTECTION: Access granted');
  return <Component {...rest} />;
};

function App() {
  const { isLoading, user, isAuthenticated } = useAuth();
  const [showEmergencyLogout, setShowEmergencyLogout] = React.useState(false);
  


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
  
  // Show emergency logout after 15 seconds of loading
  React.useEffect(() => {
    if (isLoading) {
      setShowEmergencyLogout(false);
      const timer = setTimeout(() => {
        setShowEmergencyLogout(true);
      }, 15000); // 15 seconds: 6s MongoDB + 6s Redis + 3s buffer
      
      return () => clearTimeout(timer);
    } else {
      setShowEmergencyLogout(false);
    }
  }, [isLoading]);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading...</p>
        {showEmergencyLogout && (
          <div className="mt-8">
            <EmergencyLogout />
          </div>
        )}
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
              <Route path="/home" component={LandingPage} />
              
              <Route path="/login">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <LoginPage />}
              </Route>
              
              <Route path="/register">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <RegistrationPage />}
              </Route>
              
              <Route path="/registration-success">
                <RegistrationSuccess />
              </Route>
              
              {/* PROTECTED ROUTES */}
              <Route path="/dashboard">
                {isAuthenticated ? 
                  (user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <AppLayout>
                      <RoleProtectedRoute 
                        component={Dashboard} 
                        requiredRoles={["owner", "crew_member", "crew_chief", "administrator"]} 
                      />
                    </AppLayout>) : 
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
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={LocationsPage} 
                      requiredRoles={["owner", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/locations/new">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={LocationCreatePage} 
                      requiredRoles={["owner", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/locations/:id">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={LocationDetailPage} 
                      requiredRoles={["owner", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/crew-management">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={CrewManagement} 
                      requiredRoles={["owner", "crew_chief", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/crew/:userId">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={CrewMemberProfile} 
                      requiredRoles={["owner", "crew_chief", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/cash-management">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={CashManagement} 
                      requiredRoles={["owner", "app_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              
              <Route path="/scheduler">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={SchedulerListPage} 
                      requiredRoles={["owner", "app_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              

              
              <Route path="/scheduler/edit/:scheduleId">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={SchedulerEditPage} 
                      requiredRoles={["owner", "app_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/scheduler/frame/:frameId">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={SchedulerEditPage} 
                      requiredRoles={["owner", "app_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/scheduler/edit/:scheduleId">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={SchedulerEditPage} 
                      requiredRoles={["owner", "app_manager", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* Removed orphaned validation test routes - components moved to administration module */}
              
              <Route path="/validation-engine-3-test">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={ValidationEngine3Test} 
                      requiredRoles={["administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              <Route path="/view-calendar">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ViewCalendar} 
                    requiredRoles={["owner", "crew_chief", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicants">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={Applicants} 
                    requiredRoles={["owner", "crew_chief", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/applicant/:id">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={ApplicantDetail} 
                    requiredRoles={["owner", "crew_chief", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/knowledge-base">
                {isAuthenticated ? 
                  <RoleProtectedRoute 
                    component={KnowledgeBase} 
                    requiredRoles={["owner", "crew_chief", "administrator"]} 
                  /> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/reports">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={Reports} 
                      requiredRoles={["owner", "crew_chief", "administrator"]} 
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

              <Route path="/settings/security">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={SecuritySettings} 
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
                      requiredRoles={["owner", "app_manager", "crew_chief", "crew_member", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>

              <Route path="/profile/edit">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={ProfileEdit} 
                      requiredRoles={["owner", "app_manager", "crew_chief", "crew_member", "administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/messaging-validation-test">
                {isAuthenticated ? 
                  <AppLayout>
                    <RoleProtectedRoute 
                      component={MessagingValidationTest} 
                      requiredRoles={["administrator"]} 
                    />
                  </AppLayout> : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* DEFAULT ROUTE - Simplified Authentication Flow */}
              <Route path="/">
                {isAuthenticated ? 
                  <Redirect to={user?.role === 'applicant' ? '/applicant-portal' : '/dashboard'} /> : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* CATCH ALL */}
              <Route>
                <NotFound />
              </Route>
            </Switch>
            </Router>
          </div>
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
          <LocationProvider>
            <App />
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}