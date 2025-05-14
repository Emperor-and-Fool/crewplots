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
import CashManagement from "@/pages/cash-management";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

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
      try {
        console.log("Checking server-side authentication directly");
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store' // Prevent caching
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Server auth check response:", data);
          
          setServerAuthState({
            loading: false,
            authenticated: data.authenticated,
            user: data.user || null
          });
          
          // If server says we're authenticated but React state doesn't know it yet,
          // this will help update the React state for future checks
          if (data.authenticated && !user) {
            console.log("Server says authenticated but React state doesn't know it - forcing page refresh");
            // window.location.reload();
          }
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

  // Direct server-side authentication check that bypasses the React state issues
  React.useEffect(() => {
    const checkServerAuth = async () => {
      try {
        console.log("Checking server-side authentication directly in App");
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store' // Prevent caching
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Server auth check response (App):", data);
          
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
  
  // If still loading after 2 seconds, force the login page
  React.useEffect(() => {
    if (serverAuthState.loading) {
      const timer = setTimeout(() => {
        console.log("Loading timeout - forcing login page display");
        setForcedLoad(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [serverAuthState.loading]);
  
  // Show loading while checking server authentication
  if (serverAuthState.loading && !forcedLoad) {
    return <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4 text-lg">Checking authentication...</p>
      </div>
    </div>;
  }
  
  // When not authenticated, handle public routes (login & register) via Router
  if (!serverAuthState.authenticated) {
    console.log("Not authenticated (server check) - showing public routes");
    return (
      <Router>
        <Switch>
          <Route path="/register" component={Register} />
          <Route path="/:rest*" component={Login} />
        </Switch>
      </Router>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
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
              
              <Route path="/view-calendar">
                <RoleProtectedRoute 
                  component={ViewCalendar} 
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
