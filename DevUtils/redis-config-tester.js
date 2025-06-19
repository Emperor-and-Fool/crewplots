#!/usr/bin/env node

/**
 * Redis Configuration Tester
 * Tests what configuration options the custom Redis binary accepts
 */

const { spawn } = require('child_process');
const Redis = require('ioredis');

// Test configurations to try
const testConfigs = [
  { name: 'Default', args: [] },
  { name: 'Port Override', args: ['--port', '6380'] },
  { name: 'Bind Override', args: ['--bind', '127.0.0.1'] },
  { name: 'Max Keys', args: ['--maxkeys', '50000'] },
  { name: 'Timeout', args: ['--timeout', '60'] },
  { name: 'Keep Alive', args: ['--keepalive', '300'] },
  { name: 'Config File', args: ['-c', '/tmp/redis.conf'] },
  { name: 'Help Flag', args: ['--help'] },
  { name: 'Version Flag', args: ['--version'] },
  { name: 'Verbose', args: ['-v'] },
  { name: 'Multiple Options', args: ['--maxkeys', '20000', '--timeout', '120'] }
];

async function testRedisConfig(config) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log(`   Args: ${config.args.join(' ')}`);
    
    const process = spawn('./repl-redis/production-redis', config.args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Kill process after 2 seconds
    setTimeout(() => {
      if (!process.killed) {
        process.kill('SIGTERM');
      }
    }, 2000);
    
    process.on('close', (code, signal) => {
      console.log(`   Exit: code=${code}, signal=${signal}`);
      if (stdout) console.log(`   STDOUT: ${stdout.trim()}`);
      if (stderr) console.log(`   STDERR: ${stderr.trim()}`);
      
      resolve({
        name: config.name,
        args: config.args,
        exitCode: code,
        signal: signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0 || signal === 'SIGTERM'
      });
    });
    
    process.on('error', (error) => {
      console.log(`   ERROR: ${error.message}`);
      resolve({
        name: config.name,
        args: config.args,
        error: error.message,
        success: false
      });
    });
  });
}

async function testRedisConnection(port = 6379) {
  try {
    const client = new Redis({
      host: '127.0.0.1',
      port: port,
      connectTimeout: 1000,
      lazyConnect: true
    });
    
    await client.connect();
    const result = await client.ping();
    await client.disconnect();
    
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

async function runTests() {
  console.log('🚀 Redis Configuration Testing Started');
  console.log('=====================================');
  
  const results = [];
  
  for (const config of testConfigs) {
    const result = await testRedisConfig(config);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.args.join(' ')}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Test current Redis connection
  console.log('\n🔗 CONNECTION TEST');
  console.log('==================');
  const canConnect = await testRedisConnection();
  console.log(`Current Redis (port 6379): ${canConnect ? '✅ Connected' : '❌ Failed'}`);
  
  console.log('\n✅ Testing Complete');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRedisConfig, testRedisConnection };