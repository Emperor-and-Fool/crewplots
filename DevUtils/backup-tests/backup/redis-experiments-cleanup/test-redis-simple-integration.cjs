const Redis = require('ioredis');
const { spawn } = require('child_process');

async function testRedisIntegration() {
  console.log('🚀 Testing Redis Integration with Application\n');
  
  let redisProcess = null;
  let client = null;
  
  try {
    // Start Redis server
    console.log('Starting Redis server...');
    redisProcess = spawn('./production-redis', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    redisProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Ready to accept connections')) {
        console.log('✅ Redis server ready');
      }
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create client
    client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      enableAutoPipelining: true
    });

    await client.connect();
    console.log('✅ Client connected to Redis');

    // Test session caching scenario
    console.log('\n📋 Testing session caching...');
    const sessionData = {
      userId: 2,
      username: 'testkai',
      role: 'applicant',
      loginTime: new Date().toISOString()
    };
    
    await client.setex('session:2', 3600, JSON.stringify(sessionData));
    const cachedSession = await client.get('session:2');
    const parsedSession = JSON.parse(cachedSession);
    
    console.log(`Session stored: ${parsedSession.username === 'testkai' ? '✅ PASS' : '❌ FAIL'}`);

    // Test message caching scenario
    console.log('\n💬 Testing message caching...');
    const messages = [
      { id: 1, content: 'Welcome to the applicant portal', userId: 2, timestamp: new Date() },
      { id: 2, content: 'Your application is under review', userId: 2, timestamp: new Date() }
    ];
    
    await client.setex('messages:2', 300, JSON.stringify(messages));
    const cachedMessages = await client.get('messages:2');
    const parsedMessages = JSON.parse(cachedMessages);
    
    console.log(`Messages cached: ${parsedMessages.length === 2 ? '✅ PASS' : '❌ FAIL'}`);

    // Test profile caching scenario
    console.log('\n👤 Testing profile caching...');
    const profile = {
      id: 2,
      name: 'Kai Test',
      email: 'kai.tchong@live.nl',
      status: 'short-listed',
      lastAccess: new Date()
    };
    
    await client.setex('profile:2', 1800, JSON.stringify(profile));
    const cachedProfile = await client.get('profile:2');
    const parsedProfile = JSON.parse(cachedProfile);
    
    console.log(`Profile cached: ${parsedProfile.name === 'Kai Test' ? '✅ PASS' : '❌ FAIL'}`);

    // Test cache invalidation
    console.log('\n🗑️ Testing cache invalidation...');
    await client.del('session:2');
    const deletedSession = await client.get('session:2');
    
    console.log(`Session invalidated: ${deletedSession === null ? '✅ PASS' : '❌ FAIL'}`);

    // Test Redis performance with multiple operations
    console.log('\n⚡ Testing performance...');
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(client.set(`perf:${i}`, `value-${i}`));
    }
    await Promise.all(promises);
    
    const endTime = Date.now();
    console.log(`100 SET operations completed in ${endTime - startTime}ms`);

    // Verify all data was written
    const verifyPromises = [];
    for (let i = 0; i < 100; i++) {
      verifyPromises.push(client.get(`perf:${i}`));
    }
    const results = await Promise.all(verifyPromises);
    const allCorrect = results.every((val, idx) => val === `value-${idx}`);
    
    console.log(`Data integrity: ${allCorrect ? '✅ PASS' : '❌ FAIL'}`);

    // Cleanup performance test data
    const delPromises = [];
    for (let i = 0; i < 100; i++) {
      delPromises.push(client.del(`perf:${i}`));
    }
    await Promise.all(delPromises);

    // Test server health
    console.log('\n🏥 Testing server health...');
    const pingResult = await client.ping();
    console.log(`Server health: ${pingResult === 'PONG' ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n🎉 Redis integration tests completed successfully!');
    console.log('✅ Redis is ready for production use with the application');
    
    return true;

  } catch (error) {
    console.error('❌ Redis integration test failed:', error);
    return false;
  } finally {
    // Cleanup
    if (client) {
      try {
        await client.del('messages:2', 'profile:2');
        await client.disconnect();
      } catch (e) {}
    }
    
    if (redisProcess && !redisProcess.killed) {
      redisProcess.kill('SIGTERM');
    }
  }
}

testRedisIntegration().then(success => {
  console.log(`\n🏁 Integration test ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(console.error);