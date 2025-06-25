import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "../components/forms/LoginForm";
import { AuthDevelopmentTools } from "../components/utils/AuthDevelopmentTools";
import { AuthPageLayout } from "../components/layouts/AuthPageLayout";
import { Link } from "wouter";

export const LoginPage = () => {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();

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

  const handleAutoLogin = () => {
    console.log("Auto-login completed, navigating to dashboard");
    setTimeout(() => {
      navigate('/dashboard');
    }, 100);
  };

  const isDevelopment = import.meta.env.MODE === 'development';

  return (
    <AuthPageLayout title="Crew Plots Pro - Login Page">
      <LoginForm 
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
      />
      
      {isDevelopment && (
        <AuthDevelopmentTools 
          onAutoLogin={handleAutoLogin}
          showDebugForm={true}
        />
      )}
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/register">
            <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
              Register here
            </span>
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};