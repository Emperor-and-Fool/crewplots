import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export class RedisSupervisor {
  private redisProcess: ChildProcess | null = null;
  private isStarting = false;
  private restartCount = 0;
  private maxRestarts = 5;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
    process.on('exit', () => this.stop());
  }

  async start(): Promise<boolean> {
    if (this.isStarting || this.redisProcess) {
      console.log('Redis already starting or running');
      return true;
    }

    this.isStarting = true;
    
    try {
      // Ensure directories exist
      const logsDir = './redis-logs';
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }

      // Create Redis config optimized for memory constraints
      const configPath = path.join(logsDir, 'redis-app.conf');
      const redisConfig = `
# Redis Configuration for Application Integration - Memory Optimized
port 6379
bind 127.0.0.1
protected-mode no
daemonize no
pidfile ${logsDir}/redis-app.pid
logfile ${logsDir}/redis-app.log
loglevel notice
save ""
appendonly no
timeout 0
tcp-keepalive 60
maxmemory 32mb
maxmemory-policy allkeys-lru
# Memory optimization settings
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
`;
      
      writeFileSync(configPath, redisConfig);

      // Try the original Redis binary with different configuration
      const redisBinary = './Redis-replit/bin/redis-server';
      
      console.log('Starting Redis as application subprocess...');
      this.redisProcess = spawn(redisBinary, [configPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false, // Keep as child process of Node.js
        env: {
          ...process.env,
          LD_PRELOAD: '', // Disable jemalloc preloading
          MALLOC_ARENA_MAX: '1' // Limit memory arenas
        }
      });

      // Handle Redis output
      this.redisProcess.stdout?.on('data', (data) => {
        console.log(`Redis: ${data.toString().trim()}`);
      });

      this.redisProcess.stderr?.on('data', (data) => {
        console.error(`Redis Error: ${data.toString().trim()}`);
      });

      // Handle Redis process events
      this.redisProcess.on('spawn', () => {
        console.log(`Redis process spawned with PID: ${this.redisProcess?.pid}`);
        this.isStarting = false;
        this.restartCount = 0;
      });

      this.redisProcess.on('error', (error) => {
        console.error('Redis process error:', error);
        this.isStarting = false;
        this.attemptRestart();
      });

      this.redisProcess.on('exit', (code, signal) => {
        console.log(`Redis process exited with code ${code}, signal ${signal}`);
        this.redisProcess = null;
        this.isStarting = false;
        
        if (code !== 0 && this.restartCount < this.maxRestarts) {
          console.log(`Redis unexpected exit, attempting restart...`);
          this.attemptRestart();
        }
      });

      // Wait a moment for Redis to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return this.redisProcess !== null;
      
    } catch (error) {
      console.error('Failed to start Redis:', error);
      this.isStarting = false;
      return false;
    }
  }

  private attemptRestart() {
    if (this.restartCount >= this.maxRestarts) {
      console.error(`Redis failed to restart ${this.maxRestarts} times, giving up`);
      return;
    }

    this.restartCount++;
    console.log(`Attempting Redis restart ${this.restartCount}/${this.maxRestarts}...`);
    
    setTimeout(() => {
      this.start();
    }, 2000 * this.restartCount); // Exponential backoff
  }

  stop(): void {
    if (this.redisProcess) {
      console.log('Stopping Redis subprocess...');
      this.redisProcess.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.redisProcess && !this.redisProcess.killed) {
          console.log('Force killing Redis subprocess...');
          this.redisProcess.kill('SIGKILL');
        }
      }, 5000);
      
      this.redisProcess = null;
    }
  }

  isRunning(): boolean {
    return this.redisProcess !== null && !this.redisProcess.killed;
  }

  getPid(): number | undefined {
    return this.redisProcess?.pid;
  }
}

// Export singleton instance
export const redisSupervisor = new RedisSupervisor();