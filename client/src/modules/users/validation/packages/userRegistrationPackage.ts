import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { insertUserSchema } from '@shared/schema';

// User registration validation schema - specific to registration flow
const userRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  // Optional fields for assembly
  name: z.string().optional(),
  role: z.enum(["applicant"]).default("applicant")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Business rules for user registration
const userRegistrationBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Username validation
    if (data.username && data.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (data.username && !/^[a-zA-Z0-9._-]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, dots, underscores, and hyphens');
    }

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Password validation - handle both plaintext and hashed passwords (Plan 057 hybrid)
    if (data.password) {
      // Check if password is already hashed (bcrypt format: $2b$XX$...)
      const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(data.password);
      
      if (isBcryptHash) {
        // Password is already hashed - skip plaintext validation
        console.log("🔐 VE30: Detected hashed password, skipping plaintext validation");
      } else {
        // Plaintext password - apply strength validation
        if (data.password.length < 6) {
          errors.push('Password must be at least 6 characters long');
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)/.test(data.password)) {
          warnings.push('Password should contain uppercase, lowercase, and numbers for better security');
        }
      }
    }

    // Phone number validation (Dutch format - flexible spacing)
    if (data.phoneNumber && !/^\+\d{1,4}\s?\d{5,12}$/.test(data.phoneNumber)) {
      errors.push('Phone number must be in format +xx xxxxxxx or +xx xxxxxxx');
    }

    // Required fields validation
    const requiredFields = ['username', 'password', 'email', 'firstName', 'lastName', 'phoneNumber', 'address'];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field} is required`);
      }
    }

    return { warnings, errors };
  }
];

// Assembly function for user registration - prepares data for storage
const userRegistrationAssembly = (rawData: any, user: any, operation: string) => {
  return {
    // Remove confirmPassword before storage
    username: rawData.username,
    password: rawData.password, // Password will be hashed by auth layer
    email: rawData.email,
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    // Compute name from firstName + lastName for backward compatibility
    name: `${rawData.firstName} ${rawData.lastName}`,
    phoneNumber: rawData.phoneNumber,
    address: rawData.address,
    role: 'applicant' as const, // Default role for new registrations
    // Optional fields
    notes: rawData.notes || null,
    permissions: null,
    workflowPermissions: null,
    blockedPermissions: null,
    // Public registration metadata
    createdBy: user?.id || null,
    operation: operation,
    publicRegistration: true
  };
};

// VE30PackageBuilder-based user registration package
export const userRegistrationPackage: VE30Package = {
  entityType: 'userRegistration',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userRegistrationSchema),
  getRequiredPermissions: (operation: string) => {
    // Public operation - no permissions required
    return [];
  },
  validateBusinessRules: async (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userRegistrationBusinessRules),
  assemblePackage: async (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userRegistrationAssembly)
};

export type UserRegistrationPackage = typeof userRegistrationPackage;