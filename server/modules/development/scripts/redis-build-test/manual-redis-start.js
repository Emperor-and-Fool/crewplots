import { OnDemandRedisService } from '../../adapters-repl/redis-ondemand/on-demand-redis.js';

async function startRedisManually() {
  console.log('Starting Redis using on-demand service...');
  
  try {
    const redisService = OnDemandRedisService.getInstance();
    console.log('Redis service instance obtained');
    
    // Force start the Redis server
    await redisService.ensureRedisServer();
    console.log('Redis server started successfully');
    
    // Test basic connection
    const result = await redisService.withConnection(
      async (client) => {
        return await client.ping();
      },
      { connectionId: 'startup-test' }
    );
    
    console.log('Redis PING result:', result);
    console.log('Redis is now ready for application use');
    
  } catch (error) {
    console.error('Failed to start Redis:', error.message);
  }
}

startRedisManually();