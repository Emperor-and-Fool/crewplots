import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type Login } from "@shared/schema";
import { LoginFormProps } from "../../types/auth-ui.types";
import { useToast } from "@/hooks/use-toast";

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

export const LoginForm = ({ 
  onSuccess, 
  onError 
}: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const { toast } = useToast();

  const form = useForm<Login>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

    const onSubmit = async (data: LoginRequest) => {
      setIsLoading(true);
      try {
        const result = await login(data.username, data.password);
      
        // COMMENTED OUT: Useless duplicate logic (lines 42-63)
        // LoginForm never calls onSuccess/onError callbacks 
        // Auth-context already handles all success/error/redirection logic
        // This section was causing false "Login failed" toasts on successful logins
        /*
        // Handle LoginResponse union type
        if (result === false) {
          // Network/system error
          toast({
            title: "Login failed",
            description: "System error. Please try again.",
            variant: "destructive",
          });
        } else if (result.user && result.redirectScript) {
          // Success case
          if (result.redirectScript) {
            eval(result.redirectScript); // Execute server redirect
          } 
          // No fallback - let server handle all redirects
        } else {
          // Authentication failed
          toast({
            title: "Login failed", 
            description: result.error,
            variant: "destructive",
          });
        }
        */
        
        // Let LoginPage handle the result via callbacks
        if (result === false || (result && 'error' in result)) {
          onError?.(result === false ? "System error" : result.error);
        } else if (result && 'user' in result) {
          onSuccess?.(result);
        }
        } catch (error) {
        toast({
          title: "Login failed",
          description: "Network error. Please try again.",
          variant: "destructive",
        });
    } finally {
      setIsLoading(false);
    }
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