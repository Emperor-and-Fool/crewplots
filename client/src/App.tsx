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
import ApplicantsTest from "@/pages/applicants-test";

// Protected route component that only checks if user is authenticated
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
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

  // Direct server-side authentication check that bypasses the React state issues
  React.useEffect(() => {
    const checkServerAuth = async () => {
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        console.log("Checking server-side authentication directly in App");
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store', // Prevent caching
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        
        console.log("Auth response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Server auth check response (App):", data);
          
          setServerAuthState({
            loading: false,
            authenticated: data.authenticated,
            user: data.user || null
          });
          
          if (data.authenticated) {
            console.log("User data:", data);
            
            // If authenticated but React context doesn't have it
            if (!user) {
              console.log("User authenticated:", data.user.username);
            }
            
            // Check if user is applicant
            if (data.user && data.user.role === 'applicant') {
              console.log("User is applicant, redirecting to applicant portal");
            }
          } else {
            console.log("Not authenticated or no user data found");
          }
        } else {
          console.error("Server auth check failed with status:", response.status);
          setServerAuthState({
            loading: false,
            authenticated: false,
            user: null
          });
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error?.name === 'AbortError') {
          console.error("Authentication request timed out after 5 seconds");
        } else {
          console.error("Error checking server auth:", error);
        }
        
        setServerAuthState({
          loading: false,
          authenticated: false,
          user: null
        });
      }
    };
    
    checkServerAuth();
  }, []);
  
  // Show loading indicator while checking server-side auth
  if (serverAuthState.loading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Checking server authentication...</p>
      </div>
    </div>;
  }
  
  // DEVELOPMENT MODE: Use the server's authentication status rather than React state
  // This bypasses any potential React state issues since we know the server has the correct state
  if (serverAuthState.authenticated) {
    console.log("Server says we're authenticated - showing protected content");
    return <Component {...rest} />;
  }
  
  // If server says we're not authenticated, redirect to login
  return <Redirect to="/login" />;
};

// Role-based protected route that also checks user roles
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

  // Direct server-side authentication check that bypasses the React state issues
  React.useEffect(() => {
    const checkServerAuth = async () => {
      try {
        console.log("Checking server-side authentication directly for role check");
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store' // Prevent caching
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Server auth check response (role):", data);
          
          setServerAuthState({
            loading: false,
            authenticated: data.authenticated,
            user: data.user || null
          });
        } else {
          console.error("Server auth check failed with status:", response.status);
          setServerAuthState({
            loading: false,
            authenticated: false,
            user: null
          });
        }
      } catch (error) {
        console.error("Error checking server auth:", error);
        setServerAuthState({
          loading: false,
          authenticated: false,
          user: null
        });
      }
    };
    
    checkServerAuth();
  }, []);
  
  // Show loading indicator while checking server-side auth
  if (serverAuthState.loading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Checking server authentication...</p>
      </div>
    </div>;
  }
  
  // If not authenticated according to the server, redirect to login
  if (!serverAuthState.authenticated || !serverAuthState.user) {
    console.log("Server says we're not authenticated - redirecting to login");
    return <Redirect to="/login" />;
  }
  
  // Check role requirements against the server's user data
  if (requiredRoles.length > 0 && !requiredRoles.includes(serverAuthState.user.role)) {
    console.log("User does not have required role - redirecting to dashboard");
    return <Redirect to="/dashboard" />;
  }
  
  // If user is specifically an 'applicant', only allow access to the applicant portal
  if (serverAuthState.user?.role === 'applicant' && 
      requiredRoles.length > 0 && 
      requiredRoles.includes('applicant') && 
      Component !== ApplicantPortal) {
    console.log("User is an applicant but trying to access a non-applicant page - redirecting to applicant portal");
    return <Redirect to="/applicant-portal" />;
  }
  
  // User is authenticated and has the required role
  console.log("Server says authenticated with correct role - showing protected content");
  return <Component {...rest} />;
};

function App() {
  const { isLoading, user } = useAuth();
  const [forcedLoad, setForcedLoad] = React.useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = React.useState(false);
  const [serverAuthState, setServerAuthState] = React.useState<{
    loading: boolean;
    authenticated: boolean;
    user: any;
  }>({
    loading: true,
    authenticated: false,
    user: null
  });

  // Synchronize React Auth Context with our serverAuthState
  React.useEffect(() => {
    // When React auth state is ready (not loading), update serverAuthState
    if (!isLoading) {
      setServerAuthState({
        loading: false,
        authenticated: !!user,
        user: user
      });
      
      // If user is applicant, redirect them to applicant portal if they're not already there
      if (user && 
          user.role === 'applicant' && 
          window.location.pathname !== '/applicant-portal' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register' &&
          window.location.pathname !== '/registration-success') {
        console.log("User is applicant, redirecting to applicant portal");
        window.location.href = '/applicant-portal';
      }
    }
  }, [isLoading, user]);

  // Debug logging to see what state we're in
  console.log("App.tsx - Auth state:", { 
    reactState: { isLoading, isAuthenticated: !!user, forcedLoad, autoLoginAttempted },
    serverState: serverAuthState
  });
  
  // Auto-login for development - disabled to allow manual logout
  React.useEffect(() => {
    // Auto-login is now disabled to allow manual logout
    if (!autoLoginAttempted && !serverAuthState.authenticated && !serverAuthState.loading) {
      setAutoLoginAttempted(true);
      console.log("Auto-login is disabled to allow manual logout");
      
      // Comment out the auto-login redirect
      // window.location.href = '/api/auth/dev-login';
    }
  }, [autoLoginAttempted, serverAuthState]);
  
  // Show loading while checking authentication, but only for a reasonable time
  React.useEffect(() => {
    // Only start the timer if we're still loading
    if ((isLoading || serverAuthState.loading) && !forcedLoad) {
      const timer = setTimeout(() => {
        console.log("Loading timeout - forcing UI to proceed");
        setForcedLoad(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, serverAuthState.loading, forcedLoad]);
  
  // If we're still in the initial loading state, show a loading indicator
  if ((isLoading || serverAuthState.loading) && !forcedLoad && !user) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4 text-lg">Checking authentication...</p>
      </div>
    </div>;
  }
  
  // Moving this logic to the existing useEffect to avoid React Hooks order issues

  // IMPROVED ROUTING: Always use Router for all routes (authenticated or not)
  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
          <Router>
            <Switch>
              {/* PUBLIC ROUTES - accessible without authentication */}
              <Route path="/login">
                {user ? 
                  (user.role === 'applicant' ? 
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
              
              {/* PROTECTED ROUTES - require authentication */}
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
                  <ProtectedRoute component={KnowledgeBase} /> : 
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
              
              {/* Public registration success page */}
              <Route path="/registration-success">
                <RegistrationSuccess />
              </Route>
              
              {/* Test route for applicants - no auth required (for testing) */}
              <Route path="/applicants-test">
                <ApplicantsTest />
              </Route>
              
              {/* Default route - should be after all other routes */}
              <Route path="/">
                {serverAuthState.authenticated ? 
                  (serverAuthState.user?.role === 'applicant' ? 
                    <Redirect to="/applicant-portal" /> : 
                    <Redirect to="/dashboard" />) : 
                  <Redirect to="/login" />}
              </Route>
              
              {/* Not found - should be the very last */}
              <Route component={NotFound} />
            </Switch>
          </Router>
        </div>
        {/* Only show footer on non-login/register pages to avoid duplicating it */}
        {window.location.pathname !== '/login' && window.location.pathname !== '/register' && (
          <Footer />
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
