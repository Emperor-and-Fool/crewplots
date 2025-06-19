#!/usr/bin/env node

// Test script to verify Docker environment detection
import { onDemandRedis } from '../adapters-repl/redis-ondemand/on-demand-redis.js';

async function testDockerDetection() {
  console.log('🐳 Testing Docker Environment Detection');
  console.log('=====================================\n');

  // Test current environment
  console.log('Current environment variables:');
  console.log('DOCKER_ENV:', process.env.DOCKER_ENV);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log();

  // Test service status
  const status = onDemandRedis.getStatus();
  console.log('Service status:', JSON.stringify(status, null, 2));
  console.log();

  // Test with Docker environment set
  console.log('Testing with DOCKER_ENV=true...');
  process.env.DOCKER_ENV = 'true';
  
  try {
    await onDemandRedis.withConnection(async (redis) => {
      await redis.set('test', 'value');
      return await redis.get('test');
    }, { skipInDocker: true });
    
    console.log('❌ Should have been skipped in Docker environment');
  } catch (error) {
    console.log('✅ Correctly skipped in Docker environment:', error.message);
  }

  // Test with Docker environment disabled  
  console.log('\nTesting with skipInDocker=false...');
  try {
    const result = await onDemandRedis.withConnection(async (redis) => {
      await redis.set('test', 'value');
      return await redis.get('test');
    }, { skipInDocker: false });
    
    console.log('✅ Service worked with skipInDocker=false, result:', result);
  } catch (error) {
    console.log('⚠️  Service failed with skipInDocker=false:', error.message);
  }

  console.log('\n🎯 Docker environment detection test completed');
}

testDockerDetection().catch(console.error);