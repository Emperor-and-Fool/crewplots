#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');

class RESPClient {
  constructor(port = 6379) {
    this.port = port;
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, '127.0.0.1');
      
      this.socket.on('connect', () => {
        this.connected = true;
        console.log('✅ Connected to Redis server');
        resolve();
      });

      this.socket.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
        reject(err);
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.log('🔌 Connection closed');
      });
    });
  }

  async sendCommand(...args) {
    if (!this.connected) {
      throw new Error('Not connected to Redis server');
    }

    // Build RESP command
    let command = `*${args.length}\r\n`;
    for (const arg of args) {
      const argStr = String(arg);
      command += `$${argStr.length}\r\n${argStr}\r\n`;
    }

    return new Promise((resolve, reject) => {
      let response = '';
      
      const onData = (data) => {
        response += data.toString();
        
        // Check if we have a complete response
        if (this.isCompleteResponse(response)) {
          this.socket.removeListener('data', onData);
          resolve(this.parseResponse(response));
        }
      };

      this.socket.on('data', onData);
      this.socket.write(command);

      // Timeout after 5 seconds
      setTimeout(() => {
        this.socket.removeListener('data', onData);
        reject(new Error('Command timeout'));
      }, 5000);
    });
  }

  isCompleteResponse(response) {
    if (response.length < 2) return false;
    
    const firstChar = response[0];
    switch (firstChar) {
      case '+': // Simple string
      case '-': // Error
      case ':': // Integer
        return response.includes('\r\n');
      case '$': // Bulk string
        const lines = response.split('\r\n');
        if (lines.length < 2) return false;
        const length = parseInt(lines[0].substring(1));
        if (length === -1) return true; // Null bulk string
        return lines.length >= 3 && lines[1].length === length;
      default:
        return true;
    }
  }

  parseResponse(response) {
    const firstChar = response[0];
    switch (firstChar) {
      case '+': // Simple string
        return response.substring(1, response.indexOf('\r\n'));
      case '-': // Error
        return { error: response.substring(1, response.indexOf('\r\n')) };
      case ':': // Integer
        return parseInt(response.substring(1, response.indexOf('\r\n')));
      case '$': // Bulk string
        const lines = response.split('\r\n');
        const length = parseInt(lines[0].substring(1));
        if (length === -1) return null;
        return lines[1];
      default:
        return response;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startRedisServer() {
  console.log('🚀 Starting Redis server with EXPIRE support...');
  
  const server = spawn('./production-redis-expire', [], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  server.stdout.on('data', (data) => {
    console.log(`[Redis] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Redis Error] ${data.toString().trim()}`);
  });

  // Wait for server to start
  await sleep(2000);
  
  return server;
}

async function runExpireTests() {
  console.log('\n🧪 Testing EXPIRE and TTL Commands\n');
  
  const client = new RESPClient(6379);
  
  try {
    await client.connect();
    
    // Test 1: Basic EXPIRE functionality
    console.log('Test 1: Basic EXPIRE functionality');
    console.log('- Setting key "testkey" with value "testvalue"');
    let result = await client.sendCommand('SET', 'testkey', 'testvalue');
    console.log(`- SET result: ${result}`);
    
    console.log('- Setting EXPIRE on "testkey" for 10 seconds');
    result = await client.sendCommand('EXPIRE', 'testkey', '10');
    console.log(`- EXPIRE result: ${result} (should be 1)`);
    
    // Test 2: TTL command
    console.log('\nTest 2: TTL command');
    result = await client.sendCommand('TTL', 'testkey');
    console.log(`- TTL result: ${result} (should be between 1-10)`);
    
    // Test 3: EXPIRE on non-existent key
    console.log('\nTest 3: EXPIRE on non-existent key');
    result = await client.sendCommand('EXPIRE', 'nonexistent', '60');
    console.log(`- EXPIRE result: ${result} (should be 0)`);
    
    // Test 4: TTL on non-existent key
    console.log('\nTest 4: TTL on non-existent key');
    result = await client.sendCommand('TTL', 'nonexistent');
    console.log(`- TTL result: ${result} (should be -2)`);
    
    // Test 5: Key without expiration
    console.log('\nTest 5: Key without expiration');
    await client.sendCommand('SET', 'persistent', 'value');
    result = await client.sendCommand('TTL', 'persistent');
    console.log(`- TTL result: ${result} (should be -1)`);
    
    // Test 6: EXPIRE with invalid TTL
    console.log('\nTest 6: EXPIRE with invalid TTL');
    result = await client.sendCommand('EXPIRE', 'testkey', '0');
    console.log(`- EXPIRE result: ${result} (should be 0)`);
    
    // Test 7: Wait for expiration and verify key is gone
    console.log('\nTest 7: Wait for expiration (2 seconds)');
    await client.sendCommand('SET', 'shortlived', 'value');
    await client.sendCommand('EXPIRE', 'shortlived', '2');
    console.log('- Waiting 3 seconds for expiration...');
    await sleep(3000);
    
    result = await client.sendCommand('GET', 'shortlived');
    console.log(`- GET result after expiration: ${result} (should be null)`);
    
    result = await client.sendCommand('TTL', 'shortlived');
    console.log(`- TTL result after expiration: ${result} (should be -2)`);
    
    // Test 8: Session touch simulation (the critical test!)
    console.log('\nTest 8: Session touch simulation (HybridSessionStore pattern)');
    const sessionKey = 'sess:test-session-id';
    await client.sendCommand('SET', sessionKey, 'session-data');
    console.log('- Created session key');
    
    result = await client.sendCommand('EXPIRE', sessionKey, '3600');
    console.log(`- Session EXPIRE result: ${result} (should be 1)`);
    
    result = await client.sendCommand('TTL', sessionKey);
    console.log(`- Session TTL: ${result} seconds (should be ~3600)`);
    
    // Simulate session touch
    result = await client.sendCommand('EXPIRE', sessionKey, '3600');
    console.log(`- Session touch EXPIRE: ${result} (should be 1)`);
    
    console.log('\n🎉 All EXPIRE/TTL tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

async function main() {
  console.log('🔧 Redis EXPIRE Command Test Suite');
  console.log('=====================================');
  
  const server = await startRedisServer();
  
  try {
    await runExpireTests();
  } finally {
    console.log('\n🛑 Stopping Redis server...');
    server.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await sleep(1000);
    
    if (!server.killed) {
      console.log('🔨 Force killing Redis server...');
      server.kill('SIGKILL');
    }
  }
}

main().catch(console.error);