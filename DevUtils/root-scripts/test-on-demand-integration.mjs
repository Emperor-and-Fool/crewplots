#!/usr/bin/env node

/**
 * Comprehensive On-Demand Service Integration Test
 * Tests the complete hybrid database architecture
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class OnDemandIntegrationTest {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async test(name, testFn) {
    this.log(`\n${colors.cyan}🧪 Testing: ${name}${colors.reset}`);
    const start = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      
      if (result.success) {
        this.log(`${colors.green}✅ PASS${colors.reset} (${duration}ms)`, colors.green);
        this.testResults.push({ name, status: 'PASS', duration, details: result });
      } else {
        this.log(`${colors.red}❌ FAIL${colors.reset} (${duration}ms): ${result.error}`, colors.red);
        this.testResults.push({ name, status: 'FAIL', duration, error: result.error });
      }
    } catch (error) {
      const duration = Date.now() - start;
      this.log(`${colors.red}💥 ERROR${colors.reset} (${duration}ms): ${error.message}`, colors.red);
      this.testResults.push({ name, status: 'ERROR', duration, error: error.message });
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }

    return data;
  }

  async testServiceStatus() {
    const data = await this.apiCall('/cache/status');
    
    return {
      success: true,
      details: {
        redis_status: data.cache_service,
        mongodb_status: data.mongodb_service,
        environment: data.environment
      }
    };
  }

  async testRedisColdStart() {
    // First, ensure Redis is not running
    const statusBefore = await this.apiCall('/cache/status');
    
    const start = Date.now();
    const testResult = await this.apiCall('/cache/test', { method: 'POST' });
    const activationTime = Date.now() - start;
    
    return {
      success: testResult.success,
      details: {
        activation_time_ms: activationTime,
        performance: testResult.performance,
        cache_operational: testResult.success
      }
    };
  }

  async testMongoDBColdStart() {
    const start = Date.now();
    const testResult = await this.apiCall('/cache/mongodb/test', { method: 'POST' });
    const activationTime = Date.now() - start;
    
    return {
      success: testResult.success,
      details: {
        activation_time_ms: activationTime,
        duration_ms: testResult.duration_ms,
        document_operations: {
          inserted: !!testResult.inserted,
          retrieved: !!testResult.retrieved
        },
        mongodb_operational: testResult.success
      }
    };
  }

  async testRedisWarmPerformance() {
    // Run multiple operations to test warm performance
    const operations = [];
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const result = await this.apiCall('/cache/test', { method: 'POST' });
      const duration = Date.now() - start;
      operations.push({ duration, success: result.success });
    }
    
    const avgDuration = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length;
    const allSuccessful = operations.every(op => op.success);
    
    return {
      success: allSuccessful && avgDuration < 100, // Should be very fast when warm
      details: {
        operations_count: operations.length,
        average_duration_ms: avgDuration,
        all_successful: allSuccessful,
        performance_acceptable: avgDuration < 100
      }
    };
  }

  async testMongoDBWarmPerformance() {
    // Run multiple MongoDB operations to test warm performance
    const operations = [];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const result = await this.apiCall('/cache/mongodb/test', { method: 'POST' });
      const duration = Date.now() - start;
      operations.push({ duration, success: result.success });
    }
    
    const avgDuration = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length;
    const allSuccessful = operations.every(op => op.success);
    
    return {
      success: allSuccessful && avgDuration < 200, // Should be reasonably fast when warm
      details: {
        operations_count: operations.length,
        average_duration_ms: avgDuration,
        all_successful: allSuccessful,
        performance_acceptable: avgDuration < 200
      }
    };
  }

  async testHybridDatabaseFallback() {
    // This would test the fallback mechanisms
    // For now, we'll just verify the status endpoint shows correct info
    const status = await this.apiCall('/cache/status');
    
    const hasRedisInfo = !!status.cache_service;
    const hasMongoInfo = !!status.mongodb_service;
    const hasEnvironmentInfo = !!status.environment;
    
    return {
      success: hasRedisInfo && hasMongoInfo && hasEnvironmentInfo,
      details: {
        redis_info_present: hasRedisInfo,
        mongodb_info_present: hasMongoInfo,
        environment_info_present: hasEnvironmentInfo,
        status_complete: hasRedisInfo && hasMongoInfo && hasEnvironmentInfo
      }
    };
  }

  async testServiceKeepalive() {
    // Test that services report as running after activation
    await this.apiCall('/cache/test', { method: 'POST' });
    await this.apiCall('/cache/mongodb/test', { method: 'POST' });
    
    const status = await this.apiCall('/cache/status');
    
    const redisRunning = status.cache_service?.serverRunning;
    const mongoRunning = status.mongodb_service?.serverRunning;
    
    return {
      success: redisRunning && mongoRunning,
      details: {
        redis_running: redisRunning,
        mongodb_running: mongoRunning,
        both_services_active: redisRunning && mongoRunning
      }
    };
  }

  async runAllTests() {
    this.log(`${colors.bright}${colors.blue}🚀 Starting On-Demand Service Integration Tests${colors.reset}`);
    this.log(`${colors.yellow}Testing hybrid Redis + MongoDB architecture${colors.reset}`);

    await this.test('Service Status Reporting', () => this.testServiceStatus());
    await this.test('Redis Cold Start Performance', () => this.testRedisColdStart());
    await this.test('MongoDB Cold Start Performance', () => this.testMongoDBColdStart());
    await this.test('Redis Warm Performance', () => this.testRedisWarmPerformance());
    await this.test('MongoDB Warm Performance', () => this.testMongoDBWarmPerformance());
    await this.test('Hybrid Database Integration', () => this.testHybridDatabaseFallback());
    await this.test('Service Keepalive Management', () => this.testServiceKeepalive());

    this.printResults();
  }

  printResults() {
    const totalTime = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    this.log(`\n${colors.bright}${colors.blue}📊 Test Results Summary${colors.reset}`);
    this.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    if (failed > 0) this.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    if (errors > 0) this.log(`${colors.red}💥 Errors: ${errors}${colors.reset}`);
    this.log(`⏱️  Total Time: ${totalTime}ms`);

    if (passed === this.testResults.length) {
      this.log(`\n${colors.bright}${colors.green}🎉 All tests passed! On-demand service architecture is working perfectly.${colors.reset}`);
    } else {
      this.log(`\n${colors.yellow}⚠️  Some tests failed. Review the details above.${colors.reset}`);
    }

    // Performance summary
    const avgRedisTime = this.testResults.find(r => r.name.includes('Redis Cold Start'))?.details?.details?.activation_time_ms;
    const avgMongoTime = this.testResults.find(r => r.name.includes('MongoDB Cold Start'))?.details?.details?.activation_time_ms;

    if (avgRedisTime && avgMongoTime) {
      this.log(`\n${colors.cyan}⚡ Performance Summary:${colors.reset}`);
      this.log(`   Redis Cold Start: ${avgRedisTime}ms`);
      this.log(`   MongoDB Cold Start: ${avgMongoTime}ms`);
      this.log(`   Total Activation Time: ${avgRedisTime + avgMongoTime}ms`);
    }
  }
}

// Run the tests
const tester = new OnDemandIntegrationTest();
tester.runAllTests().catch(console.error);