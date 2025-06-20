import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';

export class MiniRedisService {
  private redisProcess: ChildProcess | null = null;
  private proxyServer: net.Server | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('Starting Mini Redis service...');
    
    try {
      // Start mini-redis process
      await this.startMiniRedis();
      
      // Start TCP proxy
      await this.startTcpProxy();
      
      this.isRunning = true;
      console.log('Mini Redis service started successfully');
    } catch (error) {
      console.error('Failed to start Mini Redis service:', error);
      throw error;
    }
  }

  private async startMiniRedis(): Promise<void> {
    return new Promise((resolve, reject) => {
      const miniRedisPath = path.join(process.cwd(), 'mini-redis');
      
      this.redisProcess = spawn(miniRedisPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready to accept connections')) {
          resolve();
        }
      });

      this.redisProcess.stderr?.on('data', (data) => {
        console.error('Mini Redis stderr:', data.toString());
      });

      this.redisProcess.on('error', (error) => {
        reject(error);
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Mini Redis process exited with code ${code}`);
        this.isRunning = false;
      });

      // Timeout if Redis doesn't start
      setTimeout(() => reject(new Error('Mini Redis startup timeout')), 5000);
    });
  }

  private async startTcpProxy(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proxyServer = net.createServer((clientSocket) => {
        const redisSocket = net.createConnection(6379, '127.0.0.1');
        
        clientSocket.pipe(redisSocket);
        redisSocket.pipe(clientSocket);
        
        clientSocket.on('error', () => redisSocket.destroy());
        redisSocket.on('error', () => clientSocket.destroy());
      });

      this.proxyServer.listen(6380, '127.0.0.1', () => {
        console.log('Redis TCP proxy listening on port 6380');
        resolve();
      });

      this.proxyServer.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping Mini Redis service...');
    
    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }

    this.isRunning = false;
    console.log('Mini Redis service stopped');
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Global instance
export const miniRedisService = new MiniRedisService();