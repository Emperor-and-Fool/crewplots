import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type Register } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode } from "lucide-react";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [location] = useLocation();
  const [, navigate] = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  
  // Check if coming from QR code
  const isFromQRCode = location.includes("source=qrcode");

  // Form definition
  const form = useForm<Register>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      positionApplied: "",
      phone: "",
    },
  });

  // Add QR code badge if coming from QR
  useEffect(() => {
    if (isFromQRCode) {
      toast({
        title: "QR Code Scanned",
        description: "Please complete the application form to apply.",
        variant: "default",
      });
    }
  }, [isFromQRCode, toast]);

  // Form submission handler
  const onSubmit = async (data: Register) => {
    setIsLoading(true);
    
    try {
      const success = await register(data);
      
      if (success) {
        toast({
          title: "Application Submitted",
          description: "Your application has been submitted successfully. You can now log in.",
          variant: "default",
        });
        
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 relative">
            {isFromQRCode && (
              <div className="absolute -top-3 -right-3 bg-primary-600 text-white px-2 py-1 rounded-full text-xs flex items-center">
                <QrCode className="h-3 w-3 mr-1" />
                QR Application
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-center text-primary-600">
              Join ShiftPro
            </CardTitle>
            <CardDescription className="text-center">
              Apply for a position in our team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
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
                </div>
                <FormField
                  control={form.control}
                  name="positionApplied"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Applied For</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bar Staff">Bar Staff</SelectItem>
                          <SelectItem value="Floor Staff">Floor Staff</SelectItem>
                          <SelectItem value="Bartender">Bartender</SelectItem>
                          <SelectItem value="Floor Manager">Floor Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
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
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-500">
              Already have an account?{" "}
              <Link href="/login">
                <a className="font-medium text-primary-600 hover:text-primary-500">
                  Sign in
                </a>
              </Link>
            </div>
            <div className="text-xs text-center text-gray-500">
              By submitting this application, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
