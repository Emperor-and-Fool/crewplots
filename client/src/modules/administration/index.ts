// Administration module exports
export * from './pages';

// Specific page exports for modular architecture
export { default as EmailSettings } from './pages/EmailSettings';
export { default as SecuritySettings } from './pages/SecuritySettings';
export { default as MessagingValidationTest } from './pages/MessagingValidationTest';
export { default as Settings } from './pages/Settings';
export { ValidationEngine3Test } from './pages/ValidationEngine3Test';
export { default as AdminTest } from './pages/admin-test';
export { default as EndpointTest } from './pages/endpoint-test';
export { default as ValidationTest } from './pages/validation-test';