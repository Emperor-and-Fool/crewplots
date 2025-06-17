import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export class OnDemandMongoService {
  private static instance: OnDemandMongoService;
  private mongoProcess: ChildProcess | null = null;
  private isStarting = false;
  private isReady = false;
  private keepaliveTimeout: NodeJS.Timeout | null = null;
  private readonly keepaliveTime = 5 * 60 * 1000; // 5 minutes
  private readonly dockerMode = process.env.DOCKER_ENV === 'true';

  constructor() {
    console.log('[OnDemandMongo] Service initialized, Docker mode:', this.dockerMode);
  }

  static getInstance(): OnDemandMongoService {
    if (!OnDemandMongoService.instance) {
      OnDemandMongoService.instance = new OnDemandMongoService();
    }
    return OnDemandMongoService.instance;
  }

  async ensureReady(): Promise<boolean> {
    if (this.dockerMode) {
      console.log('[OnDemandMongo] Docker mode - skipping local service activation');
      return false;
    }

    if (this.isReady) {
      this.resetKeepalive();
      return true;
    }

    if (this.isStarting) {
      console.log('[OnDemandMongo] Already starting, waiting...');
      return this.waitForReady();
    }

    return this.start();
  }

  private async start(): Promise<boolean> {
    this.isStarting = true;
    console.log('[OnDemandMongo] Starting MongoDB server...');

    try {
      await this.ensureDataDirectory();
      
      const mongoArgs = [
        '--dbpath', './mongodb_data',
        '--port', '27017',
        '--bind_ip', '0.0.0.0',
        '--noauth',
        '--logpath', 'mongodb_ondemand.log',
        '--quiet'
      ];

      this.mongoProcess = spawn('mongod', mongoArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Handle process events
      this.mongoProcess.on('error', (error) => {
        console.error('[OnDemandMongo] Process error:', error.message);
        this.cleanup();
      });

      this.mongoProcess.on('exit', (code, signal) => {
        console.log(`[OnDemandMongo] Process exited with code ${code}, signal ${signal}`);
        this.cleanup();
      });

      // Wait for MongoDB to be ready
      const ready = await this.waitForConnection();
      
      if (ready) {
        this.isReady = true;
        this.isStarting = false;
        this.resetKeepalive();
        console.log('[OnDemandMongo] ✅ MongoDB server ready');
        return true;
      } else {
        console.log('[OnDemandMongo] ❌ MongoDB failed to start');
        this.cleanup();
        return false;
      }

    } catch (error) {
      console.error('[OnDemandMongo] Start error:', error);
      this.cleanup();
      return false;
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.resolve('./mongodb_data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('[OnDemandMongo] Created data directory');
    }
  }

  private async waitForConnection(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Test connection by attempting to connect
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        await client.db('admin').admin().ping();
        await client.close();
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return false;
  }

  private async waitForReady(timeout = 10000): Promise<boolean> {
    const start = Date.now();
    while (this.isStarting && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.isReady;
  }

  private resetKeepalive(): void {
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
    }
    
    this.keepaliveTimeout = setTimeout(() => {
      console.log('[OnDemandMongo] Keepalive expired, stopping service');
      this.stop();
    }, this.keepaliveTime);
  }

  private cleanup(): void {
    this.isReady = false;
    this.isStarting = false;
    this.mongoProcess = null;
    
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
      this.keepaliveTimeout = null;
    }
  }

  async stop(): Promise<void> {
    console.log('[OnDemandMongo] Stopping MongoDB service');
    
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
      this.keepaliveTimeout = null;
    }

    if (this.mongoProcess) {
      this.mongoProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          if (this.mongoProcess) {
            this.mongoProcess.kill('SIGKILL');
          }
          resolve(void 0);
        }, 5000);

        if (this.mongoProcess) {
          this.mongoProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve(void 0);
          });
        }
      });
    }

    this.cleanup();
    console.log('[OnDemandMongo] Service stopped');
  }

  getStatus() {
    return {
      serverRunning: this.isReady,
      dockerMode: this.dockerMode,
      processExists: !!this.mongoProcess
    };
  }
}

export const onDemandMongoService = OnDemandMongoService.getInstance();