#!/usr/bin/env node

const net = require('net');

// Simple Redis client for testing EXPIRE
class SimpleRedisClient {
  constructor(port = 6379) {
    this.port = port;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, '127.0.0.1');
      
      this.socket.on('connect', () => {
        console.log('✅ Connected to Redis server');
        resolve();
      });

      this.socket.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
        reject(err);
      });
    });
  }

  async sendRawCommand(command) {
    return new Promise((resolve) => {
      let response = '';
      
      const onData = (data) => {
        response += data.toString();
        if (response.includes('\r\n')) {
          this.socket.removeListener('data', onData);
          resolve(response.trim());
        }
      };

      this.socket.on('data', onData);
      this.socket.write(command);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

async function testExpireFixed() {
  console.log('🔧 Redis EXPIRE Command Test - Fixed Version');
  console.log('=============================================');

  const client = new SimpleRedisClient(6383);
  
  try {
    await client.connect();

    console.log('\n🧪 Testing EXPIRE functionality\n');

    // Test 1: SET key
    console.log('Test 1: Setting key "testkey"');
    let response = await client.sendRawCommand('*3\r\n$3\r\nSET\r\n$7\r\ntestkey\r\n$9\r\ntestvalue\r\n');
    console.log('SET result:', response);

    // Test 2: EXPIRE key
    console.log('\nTest 2: Setting EXPIRE on "testkey" for 10 seconds');
    response = await client.sendRawCommand('*3\r\n$6\r\nEXPIRE\r\n$7\r\ntestkey\r\n$2\r\n10\r\n');
    console.log('EXPIRE result:', response, '(should be :1)');

    // Test 3: TTL key
    console.log('\nTest 3: Checking TTL');
    response = await client.sendRawCommand('*2\r\n$3\r\nTTL\r\n$7\r\ntestkey\r\n');
    console.log('TTL result:', response, '(should be :10 or less)');

    // Test 4: Wait and check again
    console.log('\nTest 4: Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    response = await client.sendRawCommand('*2\r\n$3\r\nTTL\r\n$7\r\ntestkey\r\n');
    console.log('TTL after 3 seconds:', response, '(should be ~7 or less)');

    // Test 5: Check if key still exists
    console.log('\nTest 5: Getting key value');
    response = await client.sendRawCommand('*2\r\n$3\r\nGET\r\n$7\r\ntestkey\r\n');
    console.log('GET result:', response, '(should contain testvalue)');

    console.log('\n🎉 EXPIRE functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

// Run the test
testExpireFixed().catch(console.error);