#!/usr/bin/env node

/**
 * Redis Bypass Mode - Temporarily disables Redis caching for testing
 * This prevents connection churn and allows PostgreSQL-only operation
 */

import { writeFileSync, readFileSync } from 'fs';

function enableBypassMode() {
  console.log('🔄 Enabling Redis bypass mode for testing...');
  
  // Create environment override
  const envOverride = `
# Redis Bypass Mode - Testing Configuration
REDIS_BYPASS_MODE=true
CACHE_MODE=postgresql_only
REDIS_SKIP_CONNECTIONS=true
`;

  writeFileSync('.env.bypass', envOverride);
  console.log('✅ Redis bypass mode enabled');
  console.log('📋 Current mode: PostgreSQL-only caching');
  console.log('⚡ All cache operations will use PostgreSQL directly');
  console.log('🔧 To restore Redis: node DevUtils/redis-bypass-mode.js restore');
}

function restoreRedisMode() {
  console.log('🔄 Restoring Redis hybrid mode...');
  
  try {
    const fs = require('fs');
    if (fs.existsSync('.env.bypass')) {
      fs.unlinkSync('.env.bypass');
      console.log('✅ Redis hybrid mode restored');
      console.log('📋 Current mode: Redis + PostgreSQL hybrid');
      console.log('⚡ Cache operations will use Redis with PostgreSQL fallback');
    } else {
      console.log('ℹ️  Redis mode already active');
    }
  } catch (error) {
    console.log('⚠️  Could not restore Redis mode:', error.message);
  }
}

function checkCurrentMode() {
  const fs = require('fs');
  if (fs.existsSync('.env.bypass')) {
    console.log('📋 Current mode: PostgreSQL-only (bypass active)');
    console.log('⚡ All caching through PostgreSQL');
    console.log('🔧 To restore Redis: node DevUtils/redis-bypass-mode.js restore');
  } else {
    console.log('📋 Current mode: Redis + PostgreSQL hybrid');
    console.log('⚡ Redis primary, PostgreSQL fallback');
    console.log('🔧 To bypass Redis: node DevUtils/redis-bypass-mode.js enable');
  }
}

const command = process.argv[2];

switch (command) {
  case 'enable':
    enableBypassMode();
    break;
  case 'restore':
    restoreRedisMode();
    break;
  case 'status':
  default:
    checkCurrentMode();
    break;
}

export { enableBypassMode, restoreRedisMode, checkCurrentMode };