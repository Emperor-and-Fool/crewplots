import { Switch, Route, Router, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ProfileScraperInit } from "@/contexts/profile-context";
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
import ApplicantDetail from "@/pages/applicant-detail";
import ApplicantPortal from "@/pages/applicant-portal";
import CashManagement from "@/pages/cash-management";
import KnowledgeBase from "@/pages/knowledge-base";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import RegistrationSuccess from "@/pages/registration-success";


// Protected route component using AuthContext properly
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
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
  
  // If user is applicant and trying to access non-applicant route, redirect to applicant portal
  if (user.role === 'applicant' && Component !== ApplicantPortal) {
    return <Redirect to="/applicant-portal" />;
  }
  
  return <Component {...rest} />;
};

// Role-based protected route using AuthContext properly
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
  
  // Check role requirements
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }
  
  // If user is specifically an 'applicant', only allow access to the applicant portal
  if (user.role === 'applicant' && 
      requiredRoles.length > 0 && 
      requiredRoles.includes('applicant') && 
      Component !== ApplicantPortal) {
    return <Redirect to="/applicant-portal" />;
  }
  
  return <Component {...rest} />;
};

function App() {
  return (
    <ProfileScraperInit>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <div className="flex-grow">
            <Router>
              <Switch>
                {/* PUBLIC ROUTES - accessible without authentication */}
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/registration-success" component={RegistrationSuccess} />
                
                {/* PROTECTED ROUTES - require authentication */}
                <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
                
                <Route path="/locations" component={() => 
                  <RoleProtectedRoute 
                    component={Locations} 
                    requiredRoles={["manager"]} 
                  />
                } />
                
                <Route path="/staff-management" component={() => 
                  <RoleProtectedRoute 
                    component={StaffManagement} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/scheduling" component={() => 
                  <RoleProtectedRoute 
                    component={Scheduling} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/view-calendar" component={() => 
                  <RoleProtectedRoute 
                    component={ViewCalendar} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/applicants" component={() => 
                  <RoleProtectedRoute 
                    component={Applicants} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/applicants/:id" component={() => 
                  <RoleProtectedRoute 
                    component={ApplicantDetail} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/applicant/:id" component={() => 
                  <RoleProtectedRoute 
                    component={ApplicantDetail} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/cash-management" component={() => 
                  <RoleProtectedRoute 
                    component={CashManagement} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
                
                <Route path="/knowledge-base" component={() => <ProtectedRoute component={KnowledgeBase} />} />
                
                <Route path="/applicant-portal" component={() => 
                  <RoleProtectedRoute 
                    component={ApplicantPortal} 
                    requiredRoles={["applicant"]} 
                  />
                } />
                
                <Route path="/reports" component={() => 
                  <RoleProtectedRoute 
                    component={Reports} 
                    requiredRoles={["manager", "floor_manager"]} 
                  />
                } />
              

              
              {/* Default route - redirect based on user role */}
              <Route path="/" component={() => {
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
                
                // Redirect based on user role
                if (user.role === 'applicant') {
                  return <Redirect to="/applicant-portal" />;
                }
                
                return <Redirect to="/dashboard" />;
              }} />
              
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
    </ProfileScraperInit>
  );
}

export default App;
