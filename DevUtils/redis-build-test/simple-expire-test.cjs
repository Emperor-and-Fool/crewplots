#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');

async function testExpireCommand() {
  console.log('🔧 Simple EXPIRE Command Test');
  console.log('==============================');

  // Start Redis server
  console.log('🚀 Starting Redis server...');
  const server = spawn('./production-redis-expire', [], {
    stdio: 'pipe'
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Connect to Redis
  const client = net.createConnection(6379, '127.0.0.1');
  
  client.on('connect', () => {
    console.log('✅ Connected to Redis');
    
    // Test basic commands
    console.log('\n📝 Testing Commands:');
    
    // Test PING
    client.write('*1\r\n$4\r\nPING\r\n');
    
    setTimeout(() => {
      // Test SET
      console.log('- Sending SET command');
      client.write('*3\r\n$3\r\nSET\r\n$7\r\ntestkey\r\n$9\r\ntestvalue\r\n');
    }, 500);
    
    setTimeout(() => {
      // Test EXPIRE
      console.log('- Sending EXPIRE command');
      client.write('*3\r\n$6\r\nEXPIRE\r\n$7\r\ntestkey\r\n$2\r\n60\r\n');
    }, 1000);
    
    setTimeout(() => {
      // Test TTL
      console.log('- Sending TTL command');
      client.write('*2\r\n$3\r\nTTL\r\n$7\r\ntestkey\r\n');
    }, 1500);
    
    setTimeout(() => {
      // Test EXPIRE on non-existent key
      console.log('- Sending EXPIRE on non-existent key');
      client.write('*3\r\n$6\r\nEXPIRE\r\n$10\r\nnonexistent\r\n$2\r\n60\r\n');
    }, 2000);
    
    setTimeout(() => {
      console.log('\n🛑 Closing connection...');
      client.end();
      server.kill('SIGTERM');
    }, 3000);
  });

  client.on('data', (data) => {
    const response = data.toString();
    console.log('📥 Raw response:', JSON.stringify(response));
    
    // Simple parsing
    if (response.startsWith('+')) {
      console.log('✅ Simple string:', response.substring(1, response.indexOf('\r\n')));
    } else if (response.startsWith(':')) {
      console.log('🔢 Integer:', response.substring(1, response.indexOf('\r\n')));
    } else if (response.startsWith('-')) {
      console.log('❌ Error:', response.substring(1, response.indexOf('\r\n')));
    } else {
      console.log('📄 Other response type');
    }
  });

  client.on('error', (err) => {
    console.error('❌ Client error:', err.message);
  });

  client.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

testExpireCommand().catch(console.error);