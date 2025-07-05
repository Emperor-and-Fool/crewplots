import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "../components/forms/LoginForm";
import { AuthPageLayout } from "../components/layouts/AuthPageLayout";
import { Link } from "wouter";
import { useEffect } from "react";

export const LoginPage = () => {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();

  // Dual verification: Check logout flag + verify server session destruction
  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem('logout-success');
    if (logoutSuccess === 'true') {
      // Step 1: Flag exists - user came from logout action
      setTimeout(() => {
      // Step 2: Verify server-side session destruction
        fetch('/api/validation/v3/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            operation: 'authProfile',
            data: {}
          })
        })
        .then(response => {
          if (response.status === 401) {
            // Step 3a: Session destroyed - show success banner
            toast({
              title: "Logged out successfully",
              description: "You have been logged out and your session has been cleared.",
            });
          }
          // Step 3b: Session exists or other status - silent failure, no banner
          // Always clear flag regardless of server response
          sessionStorage.removeItem('logout-success');
        })
        .catch(() => {
          // Network error - clear flag silently, no banner
          sessionStorage.removeItem('logout-success');
        });
    }, 3000);
  }, [toast]);

  const handleLoginSuccess = (user: any) => {
    console.log("Login successful, navigating to dashboard");
    toast({
      title: "Welcome back!", 
      description: "You have been logged in successfully.",
    });
    // Give a moment for state to update then navigate
    setTimeout(() => {
      navigate('/dashboard');
    }, 100);
  };

  const handleLoginError = (error: string) => {
    console.error("Login error:", error);
    toast({
      title: "Login error", 
      description: error || "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  };

  const footerContent = (
    <>
      <div className="text-sm text-center text-gray-500">
        Don't have an account?{" "}
        <Link href="/register">
          <span className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
            Sign up
          </span>
        </Link>
      </div>
      <div className="text-xs text-center text-gray-500">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </div>
    </>
  );

  return (
    <AuthPageLayout 
      title="Crew Plots Pro - Login Page" 
      description="Sign in to your account to continue"
      footerContent={footerContent}
    >
      <LoginForm 
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
      />
    </AuthPageLayout>
  );
};