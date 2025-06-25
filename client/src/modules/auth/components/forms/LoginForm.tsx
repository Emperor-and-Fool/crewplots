import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type Login } from "@shared/schema";
import { LoginFormProps } from "../../types/auth-ui.types";

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
  onError, 
  showAutoLogin = true, 
  showDebugForm = true 
}: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Form definition
  const form = useForm<Login>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Form submission handler
  const onSubmit = async (data: Login) => {
    try {
      setIsLoading(true);
      console.log("Login form submission:", data);
      
      const success = await login(data.username, data.password);
      console.log("Login result:", success);
      
      if (success) {
        console.log("Login successful, calling onSuccess");
        onSuccess?.(data); // Pass the login data since auth context doesn't return user object
      } else {
        console.log("Login failed");
        onError?.("Login failed - invalid credentials");
      }
    } catch (error) {
      console.error("Login submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};