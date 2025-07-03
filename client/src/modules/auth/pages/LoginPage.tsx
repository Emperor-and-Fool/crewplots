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

  // Check for logout success flag on page load
  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem('logout-success');
    if (logoutSuccess === 'true') {
      // Show logout success banner
      toast({
        title: "Logged out successfully",
        description: "You have been logged out and your session has been cleared.",
      });
      // Immediately remove the flag
      sessionStorage.removeItem('logout-success');
    }
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