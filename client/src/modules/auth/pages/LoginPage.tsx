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
    
    toast({
      title: "Welcome back!", 
      description: "You have been logged in successfully.",
    });
    
    // Execute server's redirect script (cookies already processed)
    if (loginResponse.redirectScript) {
        console.log("🔍 ATOMIC REDIRECT: Executing server redirect script:", loginResponse.redirectScript);
        eval(loginResponse.redirectScript);
    }
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