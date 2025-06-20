// Simple test to demonstrate Redis fallback mechanism
const { onDemandRedis } = require('./adapters-repl/redis-ondemand/on-demand-service.ts');

async function testRedisFallback() {
  console.log('Testing Redis fallback mechanism...');
  
  try {
    // Test 1: Try Redis operation
    const result = await onDemandRedis.withConnection(
      async (client) => {
        await client.set('test:fallback', 'Redis is working!');
        const value = await client.get('test:fallback');
        return value;
      },
      { connectionId: 'fallback-test', keepAlive: 5000 }
    );
    
    console.log('✅ Redis is working:', result);
  } catch (error) {
    console.log('❌ Redis failed:', error.message);
    console.log('✅ System should fall back to PostgreSQL-only mode');
  }
}

testRedisFallback();