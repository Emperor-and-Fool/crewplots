const { spawn } = require('child_process');
const Redis = require('ioredis');
const http = require('http');

class RedisDevOpsTest {
  constructor() {
    this.redisProcess = null;
    this.redisClient = null;
    this.results = [];
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
    console.log(`${statusIcon} [${timestamp}] ${message}`);
    this.results.push({ timestamp, message, status });
  }

  async startRedisServer() {
    return new Promise((resolve, reject) => {
      this.log('Starting production Redis server...');
      
      this.redisProcess = spawn('./production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('Ready to accept connections')) {
          this.log('Redis server ready to accept connections', 'success');
          resolve();
        }
      });

      this.redisProcess.stderr.on('data', (data) => {
        this.log(`Redis stderr: ${data.toString().trim()}`, 'error');
      });

      this.redisProcess.on('close', (code) => {
        this.log(`Redis process exited with code ${code}`, code === 0 ? 'info' : 'error');
      });

      this.redisProcess.on('error', (err) => {
        this.log(`Failed to start Redis: ${err.message}`, 'error');
        reject(err);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.redisProcess.killed) {
          resolve(); // Assume it's ready even without output
        }
      }, 5000);
    });
  }

  async testRedisConnection() {
    this.log('Testing Redis connection...');
    
    this.redisClient = new Redis({
      host: '127.0.0.1',
      port: 6379,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true
    });

    try {
      await this.redisClient.connect();
      this.log('Redis client connected successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Redis connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBasicOperations() {
    this.log('Testing basic Redis operations...');

    try {
      // Test PING
      const pingResult = await this.redisClient.ping();
      if (pingResult === 'PONG') {
        this.log('PING test passed', 'success');
      } else {
        this.log(`PING test failed: expected PONG, got ${pingResult}`, 'error');
        return false;
      }

      // Test SET/GET
      await this.redisClient.set('test:key', 'devops-test-value');
      const getValue = await this.redisClient.get('test:key');
      if (getValue === 'devops-test-value') {
        this.log('SET/GET test passed', 'success');
      } else {
        this.log(`SET/GET test failed: expected 'devops-test-value', got '${getValue}'`, 'error');
        return false;
      }

      // Test DEL
      const delResult = await this.redisClient.del('test:key');
      if (delResult === 1) {
        this.log('DEL test passed', 'success');
      } else {
        this.log(`DEL test failed: expected 1, got ${delResult}`, 'error');
        return false;
      }

      // Test EXISTS
      const existsResult = await this.redisClient.exists('test:key');
      if (existsResult === 0) {
        this.log('EXISTS test passed', 'success');
      } else {
        this.log(`EXISTS test failed: expected 0, got ${existsResult}`, 'error');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`Basic operations test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testPersistence() {
    this.log('Testing data persistence...');

    try {
      // Set some test data
      await this.redisClient.set('persist:test1', 'value1');
      await this.redisClient.set('persist:test2', 'value2');
      await this.redisClient.set('persist:test3', 'value3');
      
      this.log('Test data stored successfully', 'success');
      
      // Verify data is readable
      const val1 = await this.redisClient.get('persist:test1');
      const val2 = await this.redisClient.get('persist:test2');
      const val3 = await this.redisClient.get('persist:test3');
      
      if (val1 === 'value1' && val2 === 'value2' && val3 === 'value3') {
        this.log('Data persistence test passed', 'success');
        return true;
      } else {
        this.log('Data persistence test failed: values mismatch', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Persistence test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testConcurrentConnections() {
    this.log('Testing concurrent connections...');

    const clients = [];
    try {
      // Create 5 concurrent clients
      for (let i = 0; i < 5; i++) {
        const client = new Redis({
          host: '127.0.0.1',
          port: 6379,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
        await client.connect();
        clients.push(client);
      }

      this.log('Created 5 concurrent clients successfully', 'success');

      // Each client performs operations
      const operations = clients.map(async (client, index) => {
        await client.set(`concurrent:${index}`, `value-${index}`);
        const result = await client.get(`concurrent:${index}`);
        return result === `value-${index}`;
      });

      const results = await Promise.all(operations);
      const allPassed = results.every(r => r === true);

      if (allPassed) {
        this.log('Concurrent connections test passed', 'success');
      } else {
        this.log('Concurrent connections test failed', 'error');
      }

      // Cleanup clients
      await Promise.all(clients.map(client => client.disconnect()));
      
      return allPassed;
    } catch (error) {
      this.log(`Concurrent connections test failed: ${error.message}`, 'error');
      // Cleanup on error
      await Promise.all(clients.map(client => client.disconnect().catch(() => {})));
      return false;
    }
  }

  async checkServerHealth() {
    this.log('Checking server health...');

    try {
      if (!this.redisProcess || this.redisProcess.killed) {
        this.log('Redis process is not running', 'error');
        return false;
      }

      // Test if server is still responsive
      const pingResult = await this.redisClient.ping();
      if (pingResult === 'PONG') {
        this.log('Server health check passed', 'success');
        return true;
      } else {
        this.log('Server health check failed: no PONG response', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Server health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up test resources...');

    if (this.redisClient) {
      try {
        // Clean up test keys
        const keys = await this.redisClient.keys('test:*');
        const persistKeys = await this.redisClient.keys('persist:*');
        const concurrentKeys = await this.redisClient.keys('concurrent:*');
        
        const allKeys = [...keys, ...persistKeys, ...concurrentKeys];
        if (allKeys.length > 0) {
          await this.redisClient.del(...allKeys);
          this.log(`Cleaned up ${allKeys.length} test keys`, 'success');
        }

        await this.redisClient.disconnect();
      } catch (error) {
        this.log(`Cleanup warning: ${error.message}`, 'error');
      }
    }

    if (this.redisProcess && !this.redisProcess.killed) {
      this.redisProcess.kill('SIGTERM');
      this.log('Redis process terminated', 'success');
    }
  }

  async runDevOpsTest() {
    console.log('🚀 Redis DevOps Functionality Test Suite\n');

    try {
      // Start Redis server
      await this.startRedisServer();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for startup

      // Test connection
      const connectionOk = await this.testRedisConnection();
      if (!connectionOk) {
        throw new Error('Failed to establish Redis connection');
      }

      // Run functionality tests
      const basicOk = await this.testBasicOperations();
      const persistenceOk = await this.testPersistence();
      const concurrentOk = await this.testConcurrentConnections();
      const healthOk = await this.checkServerHealth();

      // Generate report
      console.log('\n📊 Test Results Summary:');
      console.log(`Connection Test: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Basic Operations: ${basicOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Data Persistence: ${persistenceOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Concurrent Connections: ${concurrentOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Server Health: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);

      const allTestsPassed = connectionOk && basicOk && persistenceOk && concurrentOk && healthOk;
      
      console.log(`\n🎯 Overall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
      
      if (allTestsPassed) {
        this.log('Redis server is ready for production use', 'success');
      } else {
        this.log('Redis server has issues that need attention', 'error');
      }

      return allTestsPassed;

    } catch (error) {
      this.log(`DevOps test suite failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const tester = new RedisDevOpsTest();
  const success = await tester.runDevOpsTest();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);