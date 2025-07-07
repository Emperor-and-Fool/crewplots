/**
 * Development Scripts Index
 * Central registry for all development and testing scripts
 */

export const developmentScripts = {
  auth: {
    forceLogout: './auth/force-logout.js',
    description: 'Completely destroys all authentication state'
  },
  email: {
    testTemplateInit: './email/test-template-init.js',
    testVerification: './email/test-verification.js',
    description: 'Email system testing and verification tools'
  },
  mongodb: {
    utils: './mongodb-utils/',
    deleteDoc: './mongodb-utils/delete-mongo-doc.js',
    proxyServer: './mongodb-utils/mongo-proxy-server.js',
    description: 'MongoDB development utilities and proxy server'
  },
  redis: {
    buildTest: './redis-build-test/',
    connectionTest: './redis-build-test/test-redis-connection.js',
    performanceAnalyzer: './redis-build-test/redis-performance-analyzer.js',
    description: 'Redis build testing and performance analysis tools'
  },
  system: {
    deployTest: './deploy-test.md',
    dockerEnvTest: './test-docker-env.mjs',
    onDemandCache: './test-on-demand-cache.mjs',
    onDemandIntegration: './test-on-demand-integration.mjs',
    publicIds: './test-public-ids.js',
    description: 'System-level testing and deployment verification'
  },
  backup: {
    backupTests: './backup-tests/',
    description: 'Legacy backup and historical test files'
  }
};

export const getScriptPath = (category: string, script: string): string => {
  const categoryScripts = (developmentScripts as any)[category];
  if (!categoryScripts) {
    throw new Error(`Unknown script category: ${category}`);
  }
  
  const scriptPath = categoryScripts[script];
  if (!scriptPath) {
    throw new Error(`Unknown script: ${script} in category: ${category}`);
  }
  
  return scriptPath;
};

export const listAvailableScripts = (): string[] => {
  const scripts: string[] = [];
  Object.entries(developmentScripts).forEach(([category, categoryScripts]) => {
    Object.entries(categoryScripts).forEach(([script, path]) => {
      if (script !== 'description') {
        scripts.push(`${category}.${script}`);
      }
    });
  });
  return scripts;
};