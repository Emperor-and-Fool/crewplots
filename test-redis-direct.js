const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('Testing direct Redis connection...');
  
  const client = new Redis({
    host: '127.0.0.1',
    port: 6379,
    connectTimeout: 2000,
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1
  });

  try {
    console.log('Attempting connection...');
    await client.connect();
    console.log('Connection established');
    
    console.log('Sending PING...');
    const result = await client.ping();
    console.log('PING result:', result);
    
    console.log('Testing SET/GET...');
    await client.set('test:key', 'test:value');
    const value = await client.get('test:key');
    console.log('GET result:', value);
    
    await client.disconnect();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error cause:', error.cause);
    
    try {
      await client.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

testRedisConnection();