/**
 * Production Package Registry 30
 * 
 * Clean package registry for production ValidationEngine30 components.
 * Separates stable validation packages from experimental development work.
 */

// TODO: Export production validation packages
// TODO: Export PackageRegistry30Type for type safety
// TODO: Export production engine instance

// Import non-core validation packages for external registry
import { messagingPackage } from './packages/messagingPackage';
import { motivationNotePackage } from './packages/motivationNotePackage';
import { userListPackage as legacyUserListPackage } from './packages/userListPackage';
import { scheduleBlockPackage } from './packages/scheduleBlockPackage';
import { weekSchedulePackage } from './packages/weekSchedulePackage';
import { shiftPackage } from './packages/shiftPackage';

// Import new user validation packages (migrated to modules)
import { userListPackage } from '../../modules/users/validation/userListPackage';
import { userManagementPackage } from '../../modules/users/validation/userManagementPackage';
import { userBulkPackage } from '../../modules/users/validation/userBulkPackage';
import { userSinglePackage } from '../../modules/users/validation/userSinglePackage';

// Import email packages
import { emailVerificationPackage } from '../../modules/email/validation/emailVerificationPackage';
import { emailVerificationStatusPackage } from '../../modules/email/validation/emailVerificationStatusPackage';
import { emailTemplateInitializationPackage } from '../../modules/email/validation/emailTemplateInitializationPackage';
import { emailTokenValidationPackage } from '../../modules/email/validation/emailTokenValidationPackage';
import { emailConfigPackage } from '../../modules/email/validation/emailConfigPackage';

export const packageRegistry30 = {
  // Messaging and communication packages
  messaging: messagingPackage,
  motivationNote: motivationNotePackage,
  
  // Scheduler packages
  scheduleBlock: scheduleBlockPackage,
  weekSchedule: weekSchedulePackage,
  shift: shiftPackage,
  
  // User management (non-auth) - NEW VE30 PACKAGES
  userList: userListPackage,
  userManagement: userManagementPackage,
  userBulk: userBulkPackage,
  userSingle: userSinglePackage,
  
  // Email system packages
  emailVerification: emailVerificationPackage,
  emailVerificationStatus: emailVerificationStatusPackage,
  emailTemplateInitialization: emailTemplateInitializationPackage,
  emailTokenValidation: emailTokenValidationPackage,
  emailConfig: emailConfigPackage,
};

export type PackageRegistry30Type = typeof packageRegistry30;

// Production ValidationEngine30 instance will be exported here
// export const validationEngine30Production = new ValidationEngine30(packageRegistry30);