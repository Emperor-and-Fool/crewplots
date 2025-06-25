import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type Register } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { RegistrationFormProps } from "../../types/auth-ui.types";
// import { CountryCodeSelect } from "@/components/ui/country-code-select"; // Not needed with unified phone format

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
import { Loader2, MapPin } from "lucide-react";

export const RegistrationForm = ({ 
  onSuccess, 
  onError, 
  isFromQRCode = false, 
  enableAddressLookup = true 
}: RegistrationFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const { register } = useAuth();

  // Form definition
  const form = useForm<Register>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
    },
  });

  // Address lookup function
  const lookupAddress = async (address: string) => {
    if (!enableAddressLookup || address.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLookingUpAddress(true);
    try {
      console.log("Looking up address:", address);
      const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(address)}&fq=type:adres&rows=5`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.response?.docs?.map((doc: any) => doc.weergavenaam) || [];
        setAddressSuggestions(suggestions);
      }
    } catch (error) {
      console.error("Address lookup error:", error);
      setAddressSuggestions([]);
    } finally {
      setIsLookingUpAddress(false);
    }
  };

  // Form submission handler
  const onSubmit = async (data: Register) => {
    try {
      setIsLoading(true);
      console.log("🔄 Registration form submission starting:", data);
      console.log("🔄 Form validation errors:", form.formState.errors);
      
      const success = await register(data);
      console.log("✅ Registration result:", success);
      
      if (success) {
        console.log("✅ Registration successful, calling onSuccess");
        onSuccess?.(data);
      } else {
        console.log("❌ Registration failed");
        onError?.("Registration failed - please check your information");
      }
    } catch (error) {
      console.error("❌ Registration submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4"
        noValidate
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="W.A." {...field} />
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
                  <Input placeholder="Van Buren" {...field} />
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
                <Input type="email" placeholder="w.a.vanburen@example.com" {...field} />
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
                  <Input placeholder="w.a.vanburen" {...field} />
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
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
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+31 6 12345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Damrak 1, 1012 LG Amsterdam" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (enableAddressLookup) {
                        lookupAddress(e.target.value);
                      }
                    }}
                  />
                  {isLookingUpAddress && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <MapPin className="h-4 w-4 animate-pulse text-blue-500" />
                    </div>
                  )}
                </div>
              </FormControl>
              {addressSuggestions.length > 0 && (
                <div className="mt-2 border rounded-md bg-white max-h-32 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                      onClick={() => {
                        form.setValue("address", suggestion);
                        setAddressSuggestions([]);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
};