const { spawn } = require('child_process');
const net = require('net');
const Redis = require('ioredis');
const path = require('path');

class RedisStabilityTest {
  constructor() {
    this.redisProcess = null;
    this.proxyServer = null;
    this.testResults = [];
    this.isRunning = false;
  }

  async startMiniRedis() {
    return new Promise((resolve, reject) => {
      console.log('Starting mini-redis server...');
      const miniRedisPath = path.join(process.cwd(), 'mini-redis');
      
      this.redisProcess = spawn('./simple-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let hasStarted = false;

      this.redisProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Mini Redis:', output.trim());
        // Strip ANSI escape codes and check for ready message
        const cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        if (cleanOutput.includes('Ready to accept connections') && !hasStarted) {
          hasStarted = true;
          console.log('✅ Mini Redis started successfully');
          resolve();
        }
      });

      this.redisProcess.stderr?.on('data', (data) => {
        console.error('Mini Redis stderr:', data.toString());
      });

      this.redisProcess.on('error', (error) => {
        if (!hasStarted) {
          reject(error);
        }
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Mini Redis process exited with code ${code}`);
        this.isRunning = false;
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!hasStarted) {
          reject(new Error('Mini Redis startup timeout'));
        }
      }, 10000);
    });
  }

  async startTcpProxy() {
    return new Promise((resolve, reject) => {
      console.log('Starting TCP proxy...');
      
      this.proxyServer = net.createServer((clientSocket) => {
        const redisSocket = net.createConnection(6379, '127.0.0.1');
        
        clientSocket.pipe(redisSocket);
        redisSocket.pipe(clientSocket);
        
        clientSocket.on('error', (err) => {
          console.log('Client socket error:', err.message);
          redisSocket.destroy();
        });
        
        redisSocket.on('error', (err) => {
          console.log('Redis socket error:', err.message);
          clientSocket.destroy();
        });
      });

      this.proxyServer.listen(6380, '127.0.0.1', () => {
        console.log('✅ TCP proxy listening on port 6380');
        resolve();
      });

      this.proxyServer.on('error', (error) => {
        console.error('Proxy server error:', error);
        reject(error);
      });
    });
  }

  async runBasicOperationsTest() {
    console.log('\n=== Basic Operations Test ===');
    const redis = new Redis({
      host: '127.0.0.1',
      port: 6380,
      lazyConnect: true,
      connectTimeout: 5000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    try {
      await redis.connect();
      console.log('✅ Connection established');

      // Test PING
      const ping = await redis.ping();
      console.log('✅ PING:', ping);

      // Test SET/GET
      await redis.set('test:basic', 'hello-world');
      const value = await redis.get('test:basic');
      console.log('✅ SET/GET:', value);

      // Test DEL
      const deleted = await redis.del('test:basic');
      console.log('✅ DEL:', deleted);

      // Test EXISTS
      const exists = await redis.exists('test:basic');
      console.log('✅ EXISTS:', exists);

      await redis.quit();
      return { success: true, message: 'Basic operations passed' };
    } catch (error) {
      await redis.quit();
      return { success: false, error: error.message };
    }
  }

  async runConcurrencyTest() {
    console.log('\n=== Concurrency Test ===');
    const connections = [];
    const promises = [];

    try {
      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const redis = new Redis({
          host: '127.0.0.1',
          port: 6380,
          lazyConnect: true,
          connectTimeout: 5000
        });
        connections.push(redis);
        
        promises.push(redis.connect().then(async () => {
          await redis.set(`test:concurrent:${i}`, `value-${i}`);
          const value = await redis.get(`test:concurrent:${i}`);
          return { id: i, value };
        }));
      }

      const results = await Promise.all(promises);
      console.log('✅ Concurrent operations completed:', results.length);

      // Cleanup
      for (const redis of connections) {
        await redis.quit();
      }

      return { success: true, message: 'Concurrency test passed', results: results.length };
    } catch (error) {
      // Cleanup on error
      for (const redis of connections) {
        try { await redis.quit(); } catch {}
      }
      return { success: false, error: error.message };
    }
  }

  async runStressTest() {
    console.log('\n=== Stress Test ===');
    const redis = new Redis({
      host: '127.0.0.1',
      port: 6380,
      lazyConnect: true,
      connectTimeout: 5000
    });

    try {
      await redis.connect();
      
      const operations = 1000;
      const startTime = Date.now();
      
      // Perform 1000 SET operations
      for (let i = 0; i < operations; i++) {
        await redis.set(`stress:test:${i}`, `data-${i}-${Date.now()}`);
      }
      
      const setTime = Date.now() - startTime;
      console.log(`✅ ${operations} SET operations in ${setTime}ms`);
      
      // Perform 1000 GET operations
      const getStartTime = Date.now();
      for (let i = 0; i < operations; i++) {
        await redis.get(`stress:test:${i}`);
      }
      
      const getTime = Date.now() - getStartTime;
      console.log(`✅ ${operations} GET operations in ${getTime}ms`);

      await redis.quit();
      return { 
        success: true, 
        message: 'Stress test passed',
        setTime,
        getTime,
        operations
      };
    } catch (error) {
      await redis.quit();
      return { success: false, error: error.message };
    }
  }

  async runLongevityTest() {
    console.log('\n=== Longevity Test (60 seconds) ===');
    const redis = new Redis({
      host: '127.0.0.1',
      port: 6380,
      lazyConnect: true,
      connectTimeout: 5000
    });

    try {
      await redis.connect();
      
      const duration = 60000; // 60 seconds
      const startTime = Date.now();
      let operations = 0;
      
      while (Date.now() - startTime < duration) {
        await redis.set(`longevity:${operations}`, `data-${operations}`);
        await redis.get(`longevity:${operations}`);
        operations++;
        
        if (operations % 100 === 0) {
          const elapsed = Date.now() - startTime;
          console.log(`Progress: ${operations} operations in ${elapsed}ms`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Longevity test completed: ${operations} operations in ${totalTime}ms`);

      await redis.quit();
      return { 
        success: true, 
        message: 'Longevity test passed',
        operations,
        duration: totalTime
      };
    } catch (error) {
      await redis.quit();
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Redis Stability Test Suite\n');
    
    try {
      // Start services
      await this.startMiniRedis();
      await this.startTcpProxy();
      this.isRunning = true;
      
      console.log('\n✅ All services started successfully');
      
      // Run tests
      const tests = [
        this.runBasicOperationsTest(),
        this.runConcurrencyTest(),
        this.runStressTest(),
        this.runLongevityTest()
      ];
      
      for (const test of tests) {
        const result = await test;
        this.testResults.push(result);
        
        if (!result.success) {
          console.error('❌ Test failed:', result.error);
        }
      }
      
      // Summary
      console.log('\n=== Test Summary ===');
      const passed = this.testResults.filter(r => r.success).length;
      const total = this.testResults.length;
      
      console.log(`Tests passed: ${passed}/${total}`);
      
      if (passed === total) {
        console.log('🎉 ALL TESTS PASSED - Redis proxy is stable!');
      } else {
        console.log('❌ Some tests failed - stability issues detected');
      }
      
      this.testResults.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} Test ${index + 1}: ${result.message || result.error}`);
      });
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\nCleaning up...');
    
    if (this.proxyServer) {
      this.proxyServer.close();
      console.log('✅ TCP proxy stopped');
    }
    
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      console.log('✅ Mini Redis stopped');
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const test = new RedisStabilityTest();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, cleaning up...');
    await test.cleanup();
    process.exit(0);
  });
  
  test.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = RedisStabilityTest;