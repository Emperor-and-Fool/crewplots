import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "../components/forms/LoginForm";
import { AuthPageLayout } from "../components/layouts/AuthPageLayout";
import { Link } from "wouter";

export const LoginPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLoginSuccess = (loginResponse: any) => {
    console.log("🔍 ATOMIC REDIRECT: handleLoginSuccess called with loginResponse:", loginResponse);
    
    // Handle error responses from auth-context
    if (loginResponse.error) {
      console.error("🚨 LOGIN ERROR: Auth context returned error:", loginResponse.error);
      toast({
        title: "Login failed",
        description: loginResponse.error,
        variant: "destructive",
      });
      return;
    }
    
    // Handle successful login with user data
    if (loginResponse.user && loginResponse.redirectScript) {
      toast({
        title: "Login successful",
        description: `Welcome back, ${loginResponse.user?.name || loginResponse.user?.username}!`,
      });
      
      // MOVED: Atomic redirect now handled in auth-context
      console.log("🔍 LOGIN PAGE: Redirect handling moved to auth-context");
    } else {
      // Handle missing user data
      console.error("🚨 LOGIN ERROR: Authentication successful but user data unavailable");
      toast({
        title: "Login failed",
        description: "Authentication successful but user data unavailable",
        variant: "destructive",
      });
    }
  };

  const handleLoginError = (error: string) => {
    console.error("🚨 BANNER DEBUG: handleLoginError called with:", error);
    console.error("🚨 BANNER DEBUG: Stack trace:", new Error().stack);
    console.error("🚨 BANNER DEBUG: Current timestamp:", new Date().toISOString());
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