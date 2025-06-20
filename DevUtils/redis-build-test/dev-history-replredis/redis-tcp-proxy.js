const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const REDIS_PORT = 6379;
const PROXY_PORT = 6380;

console.log('Starting Redis TCP Proxy Server...');

// Start mini-redis server
console.log('Starting Mini Redis server...');
const miniRedisPath = path.join(__dirname, 'mini-redis');
const redisProcess = spawn(miniRedisPath, [], { 
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
});

redisProcess.stdout.on('data', (data) => {
  console.log('Mini Redis:', data.toString().trim());
});

redisProcess.stderr.on('data', (data) => {
  console.error('Mini Redis Error:', data.toString().trim());
});

redisProcess.on('close', (code) => {
  console.log(`Mini Redis process exited with code ${code}`);
  process.exit(1);
});

// Wait for Redis to start, then create TCP proxy
setTimeout(() => {
  console.log('Creating TCP proxy server...');
  
  const proxyServer = net.createServer((clientSocket) => {
    console.log('New Redis client connected');
    
    // Connect to mini-redis
    const redisSocket = net.createConnection(REDIS_PORT, '127.0.0.1');
    
    redisSocket.on('connect', () => {
      console.log('Connected to mini-redis backend');
    });
    
    // Forward data from client to Redis
    clientSocket.on('data', (data) => {
      redisSocket.write(data);
    });
    
    // Forward data from Redis to client
    redisSocket.on('data', (data) => {
      clientSocket.write(data);
    });
    
    // Handle disconnections
    clientSocket.on('close', () => {
      console.log('Redis client disconnected');
      redisSocket.end();
    });
    
    redisSocket.on('close', () => {
      clientSocket.end();
    });
    
    clientSocket.on('error', (err) => {
      console.error('Client socket error:', err.message);
      redisSocket.destroy();
    });
    
    redisSocket.on('error', (err) => {
      console.error('Redis socket error:', err.message);
      clientSocket.destroy();
    });
  });
  
  proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`Redis TCP Proxy Server running on port ${PROXY_PORT}`);
    console.log(`Forwarding Redis protocol to port ${REDIS_PORT}`);
    console.log('Ready for ioredis connections');
  });
  
  proxyServer.on('error', (error) => {
    console.error('Proxy server error:', error);
    process.exit(1);
  });
  
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down Redis TCP Proxy...');
  redisProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Redis TCP Proxy...');
  redisProcess.kill();
  process.exit(0);
});