// Administration module exports
export * from './pages';

// Specific page exports for modular architecture
export { default as EmailSettings } from './pages/EmailSettings';
export { default as SecuritySettings } from './pages/SecuritySettings';
export { default as MessagingValidationTest } from './pages/MessagingValidationTest';
export { default as Settings } from './pages/Settings';