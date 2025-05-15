import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type Login } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Footer from "@/components/ui/footer";

export default function Login() {
  console.log("Login component rendering");
  const [isLoading, setIsLoading] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  
  // Log when component mounts
  useEffect(() => {
    console.log("Login component mounted");
  }, []);

  // Form definition
  const form = useForm<Login>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Auto-login function for development
  const handleAutoLogin = async () => {
    try {
      setAutoLoginLoading(true);
      console.log("Clicking auto-login button");
      
      // Instead of doing XHR or fetch, just directly navigate to the dev-login URL
      console.log("Redirecting to dev-login endpoint");
      window.location.href = '/api/auth/dev-login';
      
    } catch (error) {
      console.error("Auto-login error:", error);
      setAutoLoginLoading(false);
    }
  };
  
  // Form submission handler using URLSearchParams for reliable form data submission
  const onSubmit = async (data: Login) => {
    setIsLoading(true);
    console.log("Login form submitted with username:", data.username);
    
    try {
      console.log("Attempting login with URLSearchParams...");
      
      // Use URLSearchParams instead of FormData
      const urlencoded = new URLSearchParams();
      urlencoded.append('username', data.username);
      urlencoded.append('password', data.password);
      
      // Manual fetch implementation with proper content type
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded.toString(),
        credentials: 'include', // Important for cookies
      });
      
      console.log("Login response status:", response.status);
      
      if (response.ok) {
        // Parse the response
        const result = await response.json();
        console.log("Login successful, result:", result);
        
        // Show success message
        toast({
          title: "Login successful",
          description: `Welcome back, ${result.user?.name || data.username}!`,
        });
        
        // Refresh the auth context state before redirecting
        await checkAuth();
        
        // Navigate to dashboard
        window.location.href = '/dashboard';
      } else {
        console.log("Login failed with status:", response.status);
        
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData);
          
          // Show error toast
          toast({
            title: "Login failed",
            description: errorData.message || "Invalid username or password",
            variant: "destructive",
          });
        } catch (e) {
          console.error("No error details available");
          toast({
            title: "Login failed",
            description: "An unexpected error occurred",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login fetch error:", error);
      toast({
        title: "Login error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col">
      <div className="w-full max-w-md px-4 flex-grow flex items-center justify-center">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-md">
            <CardTitle className="text-2xl font-bold text-center">
              Crew Plots Pro - Login Page
            </CardTitle>
            <CardDescription className="text-center text-white opacity-90">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-500">
              Don't have an account?{" "}
              <a href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up
              </a>
            </div>
            <div className="text-xs text-center text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </div>
            <div className="mt-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                onClick={handleAutoLogin}
                disabled={autoLoginLoading}
              >
                {autoLoginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auto-Login in progress...
                  </>
                ) : (
                  "Auto-Login (Development)"
                )}
              </Button>
              <div className="mt-2 text-xs text-center text-gray-500">
                This will automatically log you in with admin credentials for development purposes.
              </div>
              
              <div className="mt-4 border-t pt-4">
                <h3 className="font-medium text-center mb-2">Direct Login Form (Debug)</h3>
                <form
                  action="/api/auth/login"
                  method="post"
                  className="space-y-2"
                  encType="application/x-www-form-urlencoded"
                >
                  <div>
                    <label className="text-xs text-gray-700">Username</label>
                    <Input name="username" defaultValue="admin" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700">Password</label>
                    <Input name="password" type="password" defaultValue="adminpass123" />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    Direct Form Submit (Debug)
                  </Button>
                </form>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
