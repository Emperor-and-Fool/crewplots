const net = require('net');

class RedisTest {
  constructor(port) {
    this.port = port;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, '127.0.0.1');
      this.socket.on('connect', resolve);
      this.socket.on('error', reject);
    });
  }

  async command(cmd) {
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
      this.socket.write(cmd);
    });
  }

  disconnect() {
    if (this.socket) this.socket.end();
  }
}

async function test() {
  const redis = new RedisTest(6380);
  try {
    await redis.connect();
    console.log('✅ Connected to port 6380');
    
    // Session simulation
    let result = await redis.command('*3\r\n$3\r\nSET\r\n$18\r\nsess:test_session\r\n$20\r\n{"user":"testuser"}\r\n');
    console.log('SET session:', result);
    
    result = await redis.command('*3\r\n$6\r\nEXPIRE\r\n$18\r\nsess:test_session\r\n$4\r\n3600\r\n');
    console.log('EXPIRE result:', result);
    
    result = await redis.command('*2\r\n$3\r\nTTL\r\n$18\r\nsess:test_session\r\n');
    console.log('TTL result:', result);
    
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    redis.disconnect();
  }
}

test();
