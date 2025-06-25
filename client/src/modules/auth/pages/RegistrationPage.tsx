import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { RegistrationForm } from "../components/forms/RegistrationForm";
import { AuthPageLayout } from "../components/layouts/AuthPageLayout";
import { Link } from "wouter";

export const RegistrationPage = () => {
  const [location, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  
  // Check if coming from QR code
  const isFromQRCode = location.includes("source=qrcode");

  const handleRegistrationSuccess = (data: any) => {
    console.log("Registration successful:", data);
    toast({
      title: "Registration Successful",
      description: "Your account has been created successfully.",
      variant: "default",
    });
    
    // Navigate to success page or login
    const params = new URLSearchParams();
    if (data.email) params.append("email", data.email);
    if (data.username) params.append("username", data.username);
    navigate(`/registration-success?${params.toString()}`);
  };

  const handleRegistrationError = (error: string) => {
    console.error("Registration error:", error);
    toast({
      title: "Registration Failed",
      description: error || "There was a problem creating your account. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <AuthPageLayout title="Crew Plots Pro - Register">
      <RegistrationForm 
        onSuccess={handleRegistrationSuccess}
        onError={handleRegistrationError}
        isFromQRCode={isFromQRCode}
        enableAddressLookup={true}
      />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login">
            <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
              Sign in here
            </span>
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};