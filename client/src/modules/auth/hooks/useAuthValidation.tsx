import { useState } from 'react';
import { Login, Register } from "@shared/schema";

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}

export interface AddressResult {
  suggestions: string[];
  isLoading: boolean;
  error?: string;
}

/**
 * Auth Validation Hook
 * 
 * Provides validation logic and utilities for authentication forms.
 * Includes address lookup, phone validation, and other form validation helpers.
 */
export const useAuthValidation = () => {
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);

  /**
   * Validate login data
   */
  const validateLogin = async (data: Login): Promise<ValidationResult> => {
    const errors: Record<string, string> = {};
    
    if (!data.username || data.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!data.password || data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  };

  /**
   * Validate registration data
   */
  const validateRegistration = async (data: Register): Promise<ValidationResult> => {
    const errors: Record<string, string> = {};
    
    // Basic field validation
    if (!data.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!data.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!data.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!data.username?.trim()) {
      errors.username = 'Username is required';
    } else if (data.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!data.password) {
      errors.password = 'Password is required';
    } else if (data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Phone number validation
    if (!data.phoneNumber?.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^\+\d{1,4}\s\d{5,12}$/.test(data.phoneNumber)) {
      errors.phoneNumber = 'Phone number must be in format +xx xxxxxxx';
    }
    
    if (!data.address?.trim()) {
      errors.address = 'Address is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  };

  /**
   * Address lookup functionality
   */
  const lookupAddress = async (address: string): Promise<AddressResult> => {
    if (!address || address.length < 3) {
      setAddressSuggestions([]);
      return {
        suggestions: [],
        isLoading: false,
      };
    }

    setIsLookingUpAddress(true);
    
    try {
      // TODO: Implement actual address lookup service
      // For now, return mock suggestions based on input
      const mockSuggestions = [
        `${address} 1, Amsterdam, Netherlands`,
        `${address} 2, Rotterdam, Netherlands`,
        `${address} 3, Utrecht, Netherlands`,
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setAddressSuggestions(mockSuggestions);
      
      return {
        suggestions: mockSuggestions,
        isLoading: false,
      };
    } catch (error) {
      console.error('Address lookup failed:', error);
      setAddressSuggestions([]);
      
      return {
        suggestions: [],
        isLoading: false,
        error: 'Address lookup failed',
      };
    } finally {
      setIsLookingUpAddress(false);
    }
  };

  /**
   * Phone number formatting utilities
   */
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If doesn't start with +, add +31 (Netherlands default)
    if (!cleaned.startsWith('+')) {
      return `+31 ${cleaned}`;
    }
    
    return cleaned;
  };

  /**
   * Validate phone number format
   */
  const isValidPhoneNumber = (phone: string): boolean => {
    return /^\+\d{1,4}\s\d{5,12}$/.test(phone);
  };

  /**
   * Clear address suggestions
   */
  const clearAddressSuggestions = () => {
    setAddressSuggestions([]);
  };

  return {
    // Validation functions
    validateLogin,
    validateRegistration,
    
    // Address lookup
    lookupAddress,
    addressSuggestions,
    isLookingUpAddress,
    clearAddressSuggestions,
    
    // Phone utilities
    formatPhoneNumber,
    isValidPhoneNumber,
  };
};

export type AuthValidation = ReturnType<typeof useAuthValidation>;