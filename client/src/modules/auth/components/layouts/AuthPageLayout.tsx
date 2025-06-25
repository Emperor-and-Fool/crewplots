import { AuthPageLayoutProps } from "../../types/auth-ui.types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Footer from "@/components/ui/footer";

export const AuthPageLayout = ({ 
  title, 
  children, 
  showBackButton = true, 
  onBack 
}: AuthPageLayoutProps) => {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col relative">
      <div className="w-full max-w-md px-4 flex-grow flex items-center justify-center">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-md">
            {showBackButton && (
              <div className="flex justify-between items-center mb-2">
                <Button 
                  variant="ghost" 
                  onClick={handleBack}
                  className="text-white hover:bg-white/20 text-sm p-2"
                >
                  ← Back to Home
                </Button>
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-center">
              {title}
            </CardTitle>
            <CardDescription className="text-center text-white opacity-90">
              {title === "Login" 
                ? "Sign in to your account to continue"
                : "Create a new account to get started"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {children}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};