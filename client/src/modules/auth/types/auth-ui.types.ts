import { Login, Register } from "@shared/schema";

export interface LoginFormState extends Login {
  isSubmitting?: boolean;
  rememberMe?: boolean;
  autoLoginEnabled?: boolean;
}

export interface RegistrationFormState extends Register {
  isSubmitting?: boolean;
  addressSuggestions?: string[];
  currentStep?: number;
  isValidatingAddress?: boolean;
}

export interface AuthUIState {
  isLoading: boolean;
  error?: string;
  successMessage?: string;
  redirectUrl?: string;
}

export interface AuthPageLayoutProps {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export interface LoginFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  showAutoLogin?: boolean;
  showDebugForm?: boolean;
}

export interface RegistrationFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  isFromQRCode?: boolean;
  enableAddressLookup?: boolean;
}

export interface AuthDevelopmentToolsProps {
  onAutoLogin?: () => void;
  showDebugForm?: boolean;
}