const { spawn } = require('child_process');
const net = require('net');

class RedisProtocolTester {
  constructor() {
    this.redisProcess = null;
  }

  async startMiniRedis() {
    return new Promise((resolve, reject) => {
      console.log('Starting mini-redis...');
      this.redisProcess = spawn('./mini-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let hasStarted = false;
      this.redisProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Mini Redis:', output.trim());
        if (output.includes('Ready to accept connections') && !hasStarted) {
          hasStarted = true;
          resolve();
        }
      });

      this.redisProcess.stderr?.on('data', (data) => {
        console.error('Mini Redis stderr:', data.toString());
      });

      setTimeout(() => {
        if (!hasStarted) reject(new Error('Startup timeout'));
      }, 5000);
    });
  }

  async testRawProtocol() {
    console.log('\nTesting raw RESP protocol...');
    
    return new Promise((resolve, reject) => {
      const client = net.createConnection(6379, '127.0.0.1');
      
      client.on('connect', () => {
        console.log('✅ Connected to mini-redis');
        
        // Test PING command
        const pingCmd = '*1\r\n$4\r\nPING\r\n';
        console.log('Sending PING:', JSON.stringify(pingCmd));
        client.write(pingCmd);
      });
      
      client.on('data', (data) => {
        const response = data.toString();
        console.log('Response:', JSON.stringify(response));
        
        if (response === '+PONG\r\n') {
          console.log('✅ PING successful');
          
          // Test SET command
          const setCmd = '*3\r\n$3\r\nSET\r\n$4\r\ntest\r\n$5\r\nvalue\r\n';
          console.log('Sending SET:', JSON.stringify(setCmd));
          client.write(setCmd);
        } else if (response === '+OK\r\n') {
          console.log('✅ SET successful');
          
          // Test GET command
          const getCmd = '*2\r\n$3\r\nGET\r\n$4\r\ntest\r\n';
          console.log('Sending GET:', JSON.stringify(getCmd));
          client.write(getCmd);
        } else if (response.startsWith('$5\r\nvalue\r\n')) {
          console.log('✅ GET successful');
          client.end();
          resolve();
        } else {
          console.log('❌ Unexpected response:', response);
          client.end();
          reject(new Error('Unexpected response'));
        }
      });
      
      client.on('error', (err) => {
        console.error('❌ Connection error:', err);
        reject(err);
      });
      
      client.on('close', () => {
        console.log('Connection closed');
      });
    });
  }

  async cleanup() {
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
    }
  }

  async run() {
    try {
      await this.startMiniRedis();
      await this.testRawProtocol();
      console.log('🎉 Protocol test passed!');
    } catch (error) {
      console.error('💥 Test failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }
}

const tester = new RedisProtocolTester();
tester.run().then(() => process.exit(0)).catch(() => process.exit(1));