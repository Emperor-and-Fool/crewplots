/**
 * Production Package Registry 30
 * 
 * Clean package registry for production ValidationEngine30 components.
 * Separates stable validation packages from experimental development work.
 */

import { authLoginPackage } from '../modules/users/validation/authLoginPackage';
import { authProfilePackage } from '../modules/users/validation/authProfilePackage';

export const packageRegistry30 = {
  // Authentication packages
  authLogin: authLoginPackage,
  authProfile: authProfilePackage,
};

export type PackageRegistry30Type = typeof packageRegistry30;

// Production ValidationEngine30 instance will be exported here
// export const validationEngine30Production = new ValidationEngine30(packageRegistry30);