import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

import { mongoConnection } from "./db-mongo";
// Keepalive service removed - using on-demand Redis service instead
import { cacheService } from "./services/cache-service";


const app = express();

// Optimized body parsing middleware with smaller limits for better performance
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Authentication debugging (minimal, only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.includes('login') && req.method === 'POST') {
      console.log('Login attempt:', { 
        method: req.method, 
        contentType: req.get('Content-Type')
      });
    }
    next();
  });
}

// Debug hanging requests - DISABLED general logging
// app.use((req, res, next) => {
//   const start = process.hrtime.bigint();
//   const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);

//   // Log everything to find hanging request
//   console.log(`⏱️ [${timestamp}] START: ${req.method} ${req.path}`);

//   res.on("finish", () => {
//     const duration = Number(process.hrtime.bigint() - start) / 1000000;
//     console.log(`✅ [${timestamp}] DONE: ${req.method} ${req.path} ${res.statusCode} in ${duration.toFixed(0)}ms`);
//   });

//   res.on("close", () => {
//     const duration = Number(process.hrtime.bigint() - start) / 1000000;
//     console.log(`❌ [${timestamp}] CLOSED: ${req.method} ${req.path} after ${duration.toFixed(0)}ms`);
//   });

//   next();
// });

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("Server error:", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize MongoDB connection (non-blocking)
  mongoConnection.connect().catch((error) => {
    console.log('MongoDB connection failed, document storage features disabled');
  });

  // Initialize on-demand cache service (no persistent processes)
  console.log('✅ On-demand cache service initialized - Redis will start when needed');
  console.log('Cache status:', cacheService.getStatus());

  // Using on-demand Redis service instead of persistent keepalive
  console.log('Redis supervisor disabled - using on-demand Redis service');
  // const redisStarted = await redisSupervisor.start();

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await cacheService.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await cacheService.shutdown();
    process.exit(0);
  });
})();
