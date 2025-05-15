import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Debug middleware for request bodies
app.use((req, res, next) => {
  if (req.path.includes('login')) {
    console.log('DEBUG Request headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});

// Body parsing middleware - adding multipart form support
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add debugging middleware before our routes
app.use((req, res, next) => {
  // Special logging for login attempts with multipart form data
  if (req.path.includes('login') && req.method === 'POST') {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('⚠️ MULTIPART FORM LOGIN DETECTED - body may not be parsed correctly');
      
      // For multipart form data, try to access form fields directly
      if (req.body && Object.keys(req.body).length === 0) {
        console.log('Empty body detected, original form data might not be parsed');
        
        // If we have no body data but do have the raw request, try to extract fields
        if (req.headers['content-type']?.includes('multipart/form-data') && req.is('multipart/form-data')) {
          console.log('Attempting to extract fields from multipart data');
        }
      }
    }
  }
  next();
});

// Debug middleware for parsed request body
app.use((req, res, next) => {
  if (req.path.includes('login')) {
    console.log('DEBUG Request body after parsing:', req.body);
    console.log('DEBUG Request cookies:', req.cookies);
    console.log('DEBUG Content-Type:', req.get('Content-Type'));
    console.log('DEBUG Request method:', req.method);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
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
