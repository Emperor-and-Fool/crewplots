import { AuthPageLayout } from "@client/src/modules/users/components/layouts/AuthPageLayout.tsx";  // Page wrapper
import { Link } from "wouter";                                          // Navigation links
import { LoginForm } from "@client/src/modules/users/components/forms/LoginForm.tsx";      // Self-contained form

export default function LoginPage() {
  const footerContent = (
    <>
      <div className="text-sm text-center text-gray-500">
        Don't have an account?{" "}
        <Link href="/register">
          <span className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
            Sign up
          </span>
        </Link>
      </div>
      <div className="text-xs text-center text-gray-500">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </div>
    </>
  );
  return (
    <AuthPageLayout 
      title="Crew Plots Pro - Login Page" 
      description="Sign in to your account to continue"
      footerContent={footerContent}
    >
      <LoginForm />
    </AuthPageLayout>
  );
}