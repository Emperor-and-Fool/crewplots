import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@/modules/users/hooks/useLogin";
import { LoginRequest, LoginResponse } from "@/modules/users/services/auth-service"; // Form callback types
import { loginSchema, type Login } from "@shared/schema";
import { LoginFormProps } from "@client/src/modules/auth/types/auth-ui.types.ts";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const LoginForm = ({ 
  onSuccess, 
  onError 
}: LoginFormProps) => {
  const { login, isLoading } = useLogin();  // ← Get loading from hook
  const { user } = useAuth();              // ← Still need user state
  const { toast } = useToast();

  const form = useForm<Login>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { toast } = useToast();                            // → LoginForm
  const [, setLocation] = useLocation();                   // → LoginForm
  
  const { user } = useAuth();  // Only user state needed

  const onSubmit = async (data: LoginRequest) => {
    try {
      const result = await login(data.username, data.password);

      // Handle LoginResponse union type - simplified logic
      if (result === false || (result && 'error' in result)) {
        onError?.(result === false ? "System error" : result.error);
      } else if (result && 'user' in result) {
        onSuccess?.(result);
      }
    } catch (error) {
      onError?.("Network error. Please try again.");
    }
  };

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

  const handleLoginSuccess = (loginResponse: LoginResponse) => {
    console.log("🔍 handleLoginSuccess:", loginResponse);

    /* ---------- error branch coming from auth-context ---------------- */
    if (loginResponse === false) {
      toast({
        title: "Login failed",
        description: loginResponse.error,
        variant: "destructive",
      });
      return;
    }

    /* ---------- success branch -------------------------------------- */
    if (typeof loginResponse === 'object' && 'user' in loginResponse && 'redirectScript' in loginResponse) {
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

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        console.log("🔍 FORM DEBUG: Form submission triggered");
        return form.handleSubmit(onSubmit)(e);
      }} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          onClick={() => console.log("🔍 BUTTON DEBUG: Submit button clicked")}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
};