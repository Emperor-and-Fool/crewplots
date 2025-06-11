const { spawn } = require('child_process');

class RedisServiceManager {
  constructor() {
    this.redisProcess = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('Redis service already running');
      return;
    }

    try {
      console.log('🚀 Starting Redis service...');
      
      this.redisProcess = spawn('./production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('Ready to accept connections')) {
          console.log('✅ Redis server ready');
          this.isRunning = true;
        }
      });

      this.redisProcess.stderr.on('data', (data) => {
        console.error(`Redis Error: ${data.toString().trim()}`);
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}`);
        this.isRunning = false;
      });

      this.redisProcess.on('error', (err) => {
        console.error('Failed to start Redis:', err);
        this.isRunning = false;
      });

      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (this.redisProcess && !this.redisProcess.killed) {
        console.log('✅ Redis service started successfully');
      }

    } catch (error) {
      console.error('❌ Failed to start Redis service:', error);
      this.isRunning = false;
    }
  }

  async stop() {
    if (this.redisProcess && !this.redisProcess.killed) {
      this.redisProcess.kill('SIGTERM');
      console.log('Redis service stopped');
    }
    this.isRunning = false;
  }
}

// Start the service
const manager = new RedisServiceManager();

process.on('SIGTERM', () => {
  manager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  manager.stop();
  process.exit(0);
});

manager.start().catch(console.error);