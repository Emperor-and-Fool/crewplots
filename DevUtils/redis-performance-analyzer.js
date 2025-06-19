#!/usr/bin/env node

/**
 * Redis Performance Analyzer
 * Measures actual Redis performance with different connection patterns
 */

import Redis from 'ioredis';
import { writeFileSync } from 'fs';

class RedisPerformanceAnalyzer {
  constructor() {
    this.results = [];
  }

  async createClient(options = {}) {
    return new Redis({
      host: '127.0.0.1',
      port: 6379,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      enableAutoPipelining: true,
      ...options
    });
  }

  async measureOperation(name, operation) {
    const start = process.hrtime.bigint();
    try {
      const result = await operation();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      console.log(`   ${name}: ${duration.toFixed(2)}ms`);
      return { name, duration, success: true, result };
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      
      console.log(`   ${name}: FAILED (${duration.toFixed(2)}ms) - ${error.message}`);
      return { name, duration, success: false, error: error.message };
    }
  }

  async testConnectionSpeed() {
    console.log('\n🚀 Connection Speed Test');
    console.log('========================');

    const tests = [];

    // Test 1: Fresh connection each time
    tests.push(await this.measureOperation('Fresh Connection', async () => {
      const client = await this.createClient();
      await client.connect();
      await client.ping();
      await client.disconnect();
      return 'PONG';
    }));

    // Test 2: Reused connection
    const reusedClient = await this.createClient();
    await reusedClient.connect();
    
    tests.push(await this.measureOperation('Reused Connection', async () => {
      return await reusedClient.ping();
    }));

    tests.push(await this.measureOperation('Reused SET', async () => {
      return await reusedClient.set('test:perf', 'value');
    }));

    tests.push(await this.measureOperation('Reused GET', async () => {
      return await reusedClient.get('test:perf');
    }));

    await reusedClient.disconnect();

    return tests;
  }

  async testCacheOperations() {
    console.log('\n💾 Cache Operation Test');
    console.log('=======================');

    const client = await this.createClient();
    await client.connect();

    const tests = [];
    const testData = JSON.stringify({
      id: 43,
      content: '<p>Test note content</p>',
      userId: 2,
      metadata: { wordCount: 26, characterCount: 139 }
    });

    // Test cache operations
    tests.push(await this.measureOperation('SET 865B payload', async () => {
      return await client.set('session:test123:user:2:notes', testData);
    }));

    tests.push(await this.measureOperation('GET 865B payload', async () => {
      return await client.get('session:test123:user:2:notes');
    }));

    tests.push(await this.measureOperation('SETEX with TTL', async () => {
      return await client.setex('session:test456:user:2:notes', 300, testData);
    }));

    tests.push(await this.measureOperation('DEL operation', async () => {
      return await client.del('session:test123:user:2:notes');
    }));

    await client.disconnect();
    return tests;
  }

  async testConnectionPooling() {
    console.log('\n🏊 Connection Pooling Test');
    console.log('==========================');

    const tests = [];

    // Test concurrent connections
    const clients = [];
    const start = process.hrtime.bigint();

    try {
      for (let i = 0; i < 5; i++) {
        const client = await this.createClient();
        await client.connect();
        clients.push(client);
      }

      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      console.log(`   5 Concurrent Connections: ${duration.toFixed(2)}ms`);

      // Test concurrent operations
      const promises = clients.map((client, i) => 
        client.set(`concurrent:${i}`, `value${i}`)
      );

      const opStart = process.hrtime.bigint();
      await Promise.all(promises);
      const opEnd = process.hrtime.bigint();
      const opDuration = Number(opEnd - opStart) / 1000000;
      console.log(`   5 Concurrent SETs: ${opDuration.toFixed(2)}ms`);

      // Cleanup
      for (const client of clients) {
        await client.disconnect();
      }

      tests.push({ 
        name: 'Connection Pool', 
        duration: duration, 
        success: true,
        concurrent_ops: opDuration
      });

    } catch (error) {
      console.log(`   Connection Pool: FAILED - ${error.message}`);
      tests.push({ 
        name: 'Connection Pool', 
        duration: 0, 
        success: false, 
        error: error.message 
      });
    }

    return tests;
  }

  async testMemoryLimits() {
    console.log('\n🧠 Memory Limits Test');
    console.log('=====================');

    const client = await this.createClient();
    await client.connect();

    const tests = [];
    let keyCount = 0;

    try {
      // Test how many keys we can actually store
      for (let i = 0; i < 15000; i++) {
        const key = `limit:test:${i}`;
        const result = await client.set(key, `value${i}`);
        
        if (result !== 'OK') {
          break;
        }
        
        keyCount++;
        
        if (i % 1000 === 0) {
          console.log(`   Stored ${i + 1} keys...`);
        }
      }

      console.log(`   Maximum keys stored: ${keyCount}`);
      
      // Test retrieval speed with full capacity
      const getStart = process.hrtime.bigint();
      const testKey = `limit:test:${Math.floor(keyCount / 2)}`;
      const value = await client.get(testKey);
      const getEnd = process.hrtime.bigint();
      const getDuration = Number(getEnd - getStart) / 1000000;
      
      console.log(`   GET at capacity: ${getDuration.toFixed(2)}ms`);

      tests.push({
        name: 'Memory Capacity',
        maxKeys: keyCount,
        getAtCapacity: getDuration,
        success: true
      });

    } catch (error) {
      console.log(`   Memory test failed at ${keyCount} keys: ${error.message}`);
      tests.push({
        name: 'Memory Capacity',
        maxKeys: keyCount,
        success: false,
        error: error.message
      });
    }

    await client.disconnect();
    return tests;
  }

  async generateReport() {
    console.log('\n📊 REDIS PERFORMANCE REPORT');
    console.log('============================');

    const connectionTests = await this.testConnectionSpeed();
    const cacheTests = await this.testCacheOperations();
    const poolTests = await this.testConnectionPooling();
    const memoryTests = await this.testMemoryLimits();

    console.log('\n📈 Performance Summary:');
    console.log('----------------------');

    const avgConnectionTime = connectionTests
      .filter(t => t.success && t.name.includes('Fresh'))
      .reduce((sum, t) => sum + t.duration, 0) / connectionTests.filter(t => t.success && t.name.includes('Fresh')).length;

    const avgCacheTime = cacheTests
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.duration, 0) / cacheTests.filter(t => t.success).length;

    console.log(`- Average connection time: ${avgConnectionTime?.toFixed(2) || 'N/A'}ms`);
    console.log(`- Average cache operation: ${avgCacheTime?.toFixed(2) || 'N/A'}ms`);
    console.log(`- Connection pooling: ${poolTests[0]?.success ? 'Supported' : 'Failed'}`);
    console.log(`- Maximum capacity: ${memoryTests[0]?.maxKeys || 'Unknown'} keys`);

    console.log('\n🎯 Recommendations:');
    console.log('-------------------');

    if (avgConnectionTime > 100) {
      console.log('- Connection overhead is high - use connection pooling');
    }

    if (avgCacheTime > 10) {
      console.log('- Cache operations are slow - check network latency');
    }

    if (memoryTests[0]?.maxKeys < 10000) {
      console.log('- Memory capacity is below expected 10,000 keys');
    }

    if (!poolTests[0]?.success) {
      console.log('- Connection pooling failed - investigate concurrent access');
    }

    return {
      connection: connectionTests,
      cache: cacheTests,
      pooling: poolTests,
      memory: memoryTests,
      summary: {
        avgConnectionTime,
        avgCacheTime,
        maxKeys: memoryTests[0]?.maxKeys
      }
    };
  }
}

async function runAnalysis() {
  const analyzer = new RedisPerformanceAnalyzer();
  
  try {
    const report = await analyzer.generateReport();
    
    // Save detailed results
    writeFileSync(
      './DevUtils/redis-performance-results.json', 
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n✅ Analysis complete. Results saved to DevUtils/redis-performance-results.json');
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

runAnalysis();

export { RedisPerformanceAnalyzer };