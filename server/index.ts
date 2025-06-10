import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { redisSupervisor } from "./redis-supervisor";
import { mongoConnection } from "./db-mongo";

const app = express();

// Optimized body parsing middleware with smaller limits for better performance
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Minimal debug middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.includes('login') && req.method === 'POST') {
      console.log('DEBUG Login attempt:', { 
        method: req.method, 
        contentType: req.get('Content-Type'),
        hasBody: !!req.body && Object.keys(req.body).length > 0 
      });
    }
    next();
  });
}

// Streamlined request logging middleware for better performance
app.use((req, res, next) => {
  // Skip logging for non-API requests to reduce overhead
  if (!req.path.startsWith("/api")) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration.toFixed(0)}ms`);
  });

  next();
});

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

  // Initialize MongoDB connection
  try {
    await mongoConnection.connect();
  } catch (error) {
    console.log('MongoDB connection failed, continuing without document storage features');
  }

  // Redis supervisor temporarily disabled - investigating jemalloc compatibility issue
  console.log('Redis supervisor disabled until jemalloc memory issue is resolved');
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
})();
