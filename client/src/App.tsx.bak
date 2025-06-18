import { Switch, Route, Router, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import * as React from "react";
import Footer from "@/components/ui/footer";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Locations from "@/pages/locations";
import StaffManagement from "@/pages/staff-management";
import Scheduling from "@/pages/scheduling";
import ViewCalendar from "@/pages/view-calendar";
import Applicants from "@/pages/applicants";
import ApplicantPortal from "@/pages/applicant-portal";
import CashManagement from "@/pages/cash-management";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import RegistrationSuccess from "@/pages/registration-success";

// Role-based protected route that checks user roles
const RoleProtectedRoute = ({ component: Component, requiredRoles = [], ...rest }: any) => {
  const { user, isLoading } = useAuth();
  const [serverAuthState, setServerAuthState] = React.useState<{
    loading: boolean;
    authenticated: boolean;
    user: any;
  }>({
    loading: true,
    authenticated: false,
    user: null
  });

  React.useEffect(() => {
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          setServerAuthState({
            loading: false,
            authenticated: data.authenticated,
            user: data.user || null
          });
        } else {
          setServerAuthState({
            loading: false,
            authenticated: false,
            user: null
          });
        }
      } catch (error) {
        setServerAuthState({
          loading: false,
          authenticated: false,
          user: null
        });
      }
    };
    
    checkServerAuth();
  }, []);
  
  if (serverAuthState.loading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Loading...</p>
      </div>
    </div>;
  }
  
  if (!serverAuthState.authenticated || !serverAuthState.user) {
    return <Redirect to="/login" />;
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(serverAuthState.user.role)) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component {...rest} />;
};

function App() {
  const { isLoading, user } = useAuth();
  const [serverAuthState, setServerAuthState] = React.useState<{
    loading: boolean;
    authenticated: boolean;
    user: any;
  }>({
    loading: true,
    authenticated: false,
    user: null
  });

  React.useEffect(() => {
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          setServerAuthState({
            loading: false,
            authenticated: data.authenticated,
            user: data.user || null
          });
          
          if (data.authenticated && 
              data.user?.role === 'applicant' && 
              window.location.pathname !== '/applicant-portal' &&
              window.location.pathname !== '/login' &&
              window.location.pathname !== '/register' &&
              window.location.pathname !== '/registration-success') {
            window.location.href = '/applicant-portal';
          }
        } else {
          setServerAuthState({
            loading: false,
            authenticated: false,
            user: null
          });
        }
      } catch (error) {
        setServerAuthState({
          loading: false,
          authenticated: false,
          user: null
        });
      }
    };
    
    checkServerAuth();
  }, []);
  
  if (serverAuthState.loading) {
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
                {serverAuthState.authenticated ? 
                  (serverAuthState.user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Login />}
              </Route>
              
              <Route path="/register">
                {serverAuthState.authenticated ? 
                  (serverAuthState.user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Register />}
              </Route>
              
              <Route path="/registration-success">
                <RegistrationSuccess />
              </Route>
              
              {/* PROTECTED ROUTES */}
              <Route path="/dashboard">
                {serverAuthState.authenticated ? 
                  (serverAuthState.user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Dashboard />) : 
                  <Redirect to="/login" />}
              </Route>
              
              <Route path="/locations">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={Locations} 
                    requiredRoles={["manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/staff-management">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={StaffManagement} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/scheduling">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={Scheduling} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/view-calendar">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={ViewCalendar} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/applicants">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={Applicants} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/cash-management">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={CashManagement} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/knowledge-base">
                {serverAuthState.authenticated ? 
                  <KnowledgeBase /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/applicant-portal">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={ApplicantPortal} 
                    requiredRoles={["applicant"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              <Route path="/reports">
                {serverAuthState.authenticated ? 
                  <RoleProtectedRoute 
                    component={Reports} 
                    requiredRoles={["manager", "floor_manager"]} 
                  /> : 
                  <Redirect to="/login" />
                }
              </Route>
              
              {/* Default route */}
              <Route path="/">
                {serverAuthState.authenticated ? 
                  (serverAuthState.user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* Not found */}
              <Route component={NotFound} />
            </Switch>
          </Router>
        </div>
        {window.location.pathname !== '/login' && window.location.pathname !== '/register' && (
          <Footer />
        )}
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;