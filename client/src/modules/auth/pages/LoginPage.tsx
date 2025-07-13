import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "../components/forms/LoginForm";
import { AuthPageLayout } from "../components/layouts/AuthPageLayout";
import { Link } from "wouter";

export const LoginPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* ------------------------------------------------------------------
   * progressive-error & success-flag state
   * ------------------------------------------------------------------ */
  const [justLoggedIn, setJustLoggedIn]   = useState(false);
  const [errorCount,   setErrorCount]     = useState(0);   // 0->1->2 (max 3)
  const errorResetTimer = useRef<NodeJS.Timeout | null>(null);

  const getErrorMessage = (count: number) => {
    switch (count) {
      case 0: return "Something went wrong, we're trying to fix it!";
      case 1: return "Something still not okay, try again";
      case 2: return "Sorry, can't fix it – contact support";
      default: return "Something went wrong, we're trying to fix it!";
    }
  };
  
  const handleLoginSuccess = (loginResponse: any) => {
    console.log("🔍 handleLoginSuccess:", loginResponse);

    /* ---------- error branch coming from auth-context ---------------- */
    if (loginResponse.error) {
      toast({
        title: "Login failed",
        description: loginResponse.error,
        variant: "destructive",
      });
      return;
    }

    /* ---------- success branch -------------------------------------- */
    if (loginResponse.user && loginResponse.redirectScript) {
      // success toast shown only once
      if (!justLoggedIn) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${loginResponse.user.name || loginResponse.user.username}!`,
        });
      }
      setJustLoggedIn(true);
      setErrorCount(0);
      if (errorResetTimer.current) {
        clearTimeout(errorResetTimer.current);
        errorResetTimer.current = null;
      }
      return;                                  // nothing else to do here
    }

    /* ---------- fallback / unexpected shape -> progressive error ---- */
    if (!justLoggedIn) {
      const msg = getErrorMessage(errorCount);
      toast({
        title: "Login error",
        description: msg,
        variant: "destructive",
      });

      const newCount = Math.min(errorCount + 1, 3);
      setErrorCount(newCount);

      // after the 3rd failure, reset the counter after 5 min
      if (newCount === 3 && !errorResetTimer.current) {
        errorResetTimer.current = setTimeout(() => {
          setErrorCount(0);
          errorResetTimer.current = null;
        }, 5 * 60 * 1000);
      }
    }
  };

  // reset justLoggedIn every time the page mounts (or after logout nav)
  useEffect(() => {
    setJustLoggedIn(false);
  }, []);

  // cleanup any pending timer when component unmounts
  useEffect(() => {
    return () => {
      if (errorResetTimer.current) clearTimeout(errorResetTimer.current);
    };
  }, []);

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
