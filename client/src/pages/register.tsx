import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type Register } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import Footer from "@/components/ui/footer";

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
import { Loader2, QrCode, CheckCircle, XCircle } from "lucide-react";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { register } = useAuth();
  const { toast } = useToast();
  
  // Check if coming from QR code
  const isFromQRCode = location.includes("source=qrcode");

  // Form definition
  const form = useForm<Register>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      phone: "",
      countryCode: "+31", // Default to Netherlands
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
      console.log("Submitting registration form:", data);
      
      // Send registration data to the server
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: "Your account has been created successfully.",
          variant: "default",
        });
        
        // Create URL parameters
        const params = new URLSearchParams();
        params.append("email", data.email);
        params.append("username", data.username);
        
        // Redirect to success page with parameters
        setLocation(`/registration-success?${params.toString()}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: "There was a problem creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 py-10 flex-col">
      <div className="w-full max-w-md px-4 flex-grow flex items-center justify-center">
        <Card className="shadow-xl border-blue-100">
          <CardHeader className="space-y-1 relative">
            {isFromQRCode && (
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-1 rounded-full text-xs flex items-center shadow-md">
                <QrCode className="h-3 w-3 mr-1" />
                QR Application
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Join Crew Plots Pro
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Apply for a position in our team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-4"
                noValidate // Prevents browser's native validation
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password<span className="text-red-500 ml-1">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className={
                                field.value && form.getValues("password") !== field.value
                                  ? "border-red-500 pr-10" 
                                  : field.value 
                                    ? "border-green-500 pr-10"
                                    : ""
                              }
                            />
                            {field.value && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {form.getValues("password") === field.value ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4">
                  <CountryCodeSelect 
                    form={form}
                    name="countryCode"
                    label="Country Code"
                    required={true}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number<span className="text-red-500 ml-1">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Required for WhatsApp communication with your team
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
            <div className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </div>
            <div className="text-xs text-center text-gray-500">
              By submitting this application, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
