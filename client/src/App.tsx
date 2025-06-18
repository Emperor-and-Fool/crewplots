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
  
  if (user) {
    return <Component {...rest} />;
  }
  
  return <Redirect to="/login" />;
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
                {/* PUBLIC ROUTES */}
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/registration-success" component={RegistrationSuccess} />
                
                {/* PROTECTED ROUTES - use simple ProtectedRoute */}
                <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
                <Route path="/locations" component={() => <ProtectedRoute component={Locations} />} />
                <Route path="/staff-management" component={() => <ProtectedRoute component={StaffManagement} />} />
                <Route path="/scheduling" component={() => <ProtectedRoute component={Scheduling} />} />
                <Route path="/view-calendar" component={() => <ProtectedRoute component={ViewCalendar} />} />
                <Route path="/applicants" component={() => <ProtectedRoute component={Applicants} />} />
                <Route path="/applicants/:id" component={() => <ProtectedRoute component={ApplicantDetail} />} />
                <Route path="/applicant/:id" component={() => <ProtectedRoute component={ApplicantDetail} />} />
                <Route path="/cash-management" component={() => <ProtectedRoute component={CashManagement} />} />
                <Route path="/knowledge-base" component={() => <ProtectedRoute component={KnowledgeBase} />} />
                <Route path="/applicant-portal" component={() => <ProtectedRoute component={ApplicantPortal} />} />
                <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
                
                {/* Default route */}
                <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
                
                {/* Not found */}
                <Route component={NotFound} />
              </Switch>
            </Router>
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    </ProfileScraperInit>
  );
}

export default App;
