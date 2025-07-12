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
  onError 
}: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();

  const form = useForm<Login>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: Login) => {
    try {
      setIsLoading(true);
      
      const result = await login(data.username, data.password);
      console.log("🔍 LOGIN DEBUG: Result from login():", result);
      
      if (result.error) {
        console.log("🔍 LOGIN DEBUG: Auth context returned error:", result.error);
        onSuccess?.(result); // Pass error to page for toast handling
      } else if (result.user && result.redirectScript) {
        console.log("🔍 ATOMIC LOGIN: Calling onSuccess with complete result:", result);
        onSuccess?.(result); // Pass complete response with redirectScript
      } else if (result === false) {
        console.log("🔍 LOGIN DEBUG: Login failed - boolean false result");
        onSuccess?.({ error: "Login failed - invalid credentials" });
      } else {
        console.log("🔍 LOGIN DEBUG: Login failed - unexpected result:", result);
        onSuccess?.({ error: "BUT IT DID NOT FAIL! SUCCESS!" });
      }
    } catch (error) {
      console.log("🔍 LOGIN DEBUG: Exception caught:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      onError?.(errorMessage);
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