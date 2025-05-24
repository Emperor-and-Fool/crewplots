import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { redisSupervisor } from "./redis-supervisor";

const app = express();

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Optimized request logging middleware 
app.use((req, res, next) => {
  // Only track API requests to reduce overhead
  if (!req.path.startsWith("/api")) {
    return next();
  }

  const start = Date.now();
  let capturedResponse: any;

  // Only capture response for debugging if needed
  if (process.env.NODE_ENV === 'development') {
    const originalJson = res.json;
    res.json = function (body) {
      capturedResponse = body;
      return originalJson.call(this, body);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
    
    // Add response preview in development only
    if (process.env.NODE_ENV === 'development' && capturedResponse) {
      const preview = JSON.stringify(capturedResponse).slice(0, 40) + "…";
      logLine += ` :: ${preview}`;
    }

    log(logLine);
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
