import { redisCache } from './server/services/redis-cache.js';

async function testRedisIntegration() {
  console.log('🚀 Testing Redis Integration...\n');
  
  try {
    // Connect to Redis
    const connected = await redisCache.connect();
    console.log(`Redis Connection: ${connected ? '✅ Connected' : '❌ Failed'}`);
    
    if (!connected) {
      console.log('Starting Redis server first...');
      return;
    }

    // Test basic operations
    console.log('\n📝 Testing basic operations...');
    await redisCache.set('test:key', { message: 'Hello Redis!' });
    const value = await redisCache.get('test:key');
    console.log(`SET/GET test: ${value?.message === 'Hello Redis!' ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test session caching
    console.log('\n👤 Testing session caching...');
    const sessionData = { userId: 123, username: 'testuser', role: 'applicant' };
    await redisCache.cacheUserSession(123, sessionData, 60);
    const cachedSession = await redisCache.getUserSession(123);
    console.log(`Session cache: ${cachedSession?.username === 'testuser' ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test message caching
    console.log('\n💬 Testing message caching...');
    const messages = [
      { id: 1, content: 'Test message 1', userId: 123 },
      { id: 2, content: 'Test message 2', userId: 123 }
    ];
    await redisCache.cacheMessages(123, messages, 300);
    const cachedMessages = await redisCache.getCachedMessages(123);
    console.log(`Message cache: ${cachedMessages?.length === 2 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test profile caching
    console.log('\n👨‍💼 Testing profile caching...');
    const profile = { id: 123, name: 'Test User', email: 'test@example.com' };
    await redisCache.cacheUserProfile(123, profile, 1800);
    const cachedProfile = await redisCache.getCachedUserProfile(123);
    console.log(`Profile cache: ${cachedProfile?.name === 'Test User' ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test invalidation
    console.log('\n🗑️ Testing cache invalidation...');
    await redisCache.invalidateUserSession(123);
    const invalidatedSession = await redisCache.getUserSession(123);
    console.log(`Session invalidation: ${invalidatedSession === null ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test ping
    console.log('\n🏓 Testing ping...');
    const pingResult = await redisCache.ping();
    console.log(`Ping test: ${pingResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Cleanup
    await redisCache.del('test:key');
    await redisCache.invalidateMessages(123);
    await redisCache.invalidateUserProfile(123);
    
    console.log('\n🎉 Redis integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Redis integration test failed:', error);
  } finally {
    await redisCache.disconnect();
  }
}

testRedisIntegration();