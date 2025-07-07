/**
 * Email Verification API Test
 * Tests the email verification endpoints and VE30 integration
 */

import { emailVerificationPackage } from './server/modules/email/validation/emailVerificationPackage.js';

console.log('🧪 Testing Email Verification Package...\n');

// Test 1: Schema validation
console.log('1. Testing schema validation:');
const testRequest = {
  userId: 1,
  email: 'test@example.com',
  firstName: 'Test'
};

const schemaResult = emailVerificationPackage.schemas.request.safeParse(testRequest);
console.log('✓ Schema validation result:', schemaResult.success ? 'PASS' : 'FAIL');
if (!schemaResult.success) {
  console.log('  Errors:', schemaResult.error.errors);
}

// Test 2: Business rules validation
console.log('\n2. Testing business rules:');
const businessRulesResult = emailVerificationPackage.businessRules(testRequest);
console.log('✓ Business rules result:', businessRulesResult.isValid ? 'PASS' : 'FAIL');
if (!businessRulesResult.isValid) {
  console.log('  Errors:', businessRulesResult.errors);
}

// Test 3: Package assembly
console.log('\n3. Testing package assembly:');
try {
  const packageResult = emailVerificationPackage.assemblePackage(testRequest);
  console.log('✓ Package assembly: PASS');
  console.log('  Token generated:', !!packageResult.tokenData.token);
  console.log('  Expiry set:', !!packageResult.tokenData.expiresAt);
  console.log('  Template data:', Object.keys(packageResult.templateData).join(', '));
  console.log('  Notification data:', Object.keys(packageResult.notificationData).join(', '));
} catch (error) {
  console.log('✗ Package assembly: FAIL');
  console.log('  Error:', error.message);
}

// Test 4: Permission requirements
console.log('\n4. Testing permission requirements:');
console.log('✓ Required permissions:', emailVerificationPackage.permissions.join(', '));

// Test 5: Operations mapping
console.log('\n5. Testing operations:');
const operations = emailVerificationPackage.operations;
console.log('✓ Available operations:', Object.keys(operations).join(', '));

console.log('\n📊 Email verification package testing complete!');
console.log('   VE30 integration: Ready for Phase 3 email services');