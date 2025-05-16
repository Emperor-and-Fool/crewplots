# Authentication System Guide

## Overview
This document outlines the authentication architecture for Crew Plots Pro, focusing on how to implement secure, reliable user authentication with proper session management.

## Authentication Architecture

```
┌─────────────┐     ┌───────────┐     ┌─────────┐     ┌────────────┐
│ React       │     │ Express   │     │ Redis   │     │ PostgreSQL │
│ Frontend    │<--->│ Backend   │<--->│ Session │<--->│ Database   │
│ Auth Context│     │ Passport  │     │ Store   │     │            │
└─────────────┘     └───────────┘     └─────────┘     └────────────┘
```

## Backend Implementation

### Session Configuration

```typescript
// Session configuration with Redis store
import session from 'express-session';
import RedisStore from 'connect-redis';
import { redisClient } from './redis';

export function configureSession() {
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'crewplots:session:',
  });

  return session({
    store: redisStore,
    secret: process.env.SESSION_SECRET!,
    name: 'crewplots.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    }
  });
}
```

### Passport Configuration

```typescript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export function configurePassport() {
  // Local strategy for username/password authentication
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Find user by username
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      // Log successful authentication
      console.log(`User authenticated successfully: ${username}`);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return done(null, { id: user.id, loggedIn: true });
    } catch (error) {
      console.error('Authentication error:', error);
      return done(error);
    }
  }));

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user: ${JSON.stringify(user)}`);
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser(async (sessionUser: any, done) => {
    try {
      console.log(`Deserializing session data: ${JSON.stringify(sessionUser)}`);
      
      // Get user from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, sessionUser.id),
      });

      if (!user) {
        return done(new Error('User not found'));
      }

      console.log(`User deserialized successfully: ${user.username}`);
      
      // Remove password before sending to client
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      console.error('Deserialization error:', error);
      return done(error);
    }
  });

  return passport;
}
```

### Authentication Routes

```typescript
import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';

export function setupAuthRoutes(app: Express) {
  // Login route
  app.post('/api/auth/login', 
    // Add rate limiting middleware here
    (req, res, next) => {
      // Start timing for performance monitoring
      const startTime = process.hrtime();
      
      passport.authenticate('local', (err, user, info) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        if (!user) {
          return res.status(401).json({ 
            message: info?.message || 'Authentication failed' 
          });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Session error:', loginErr);
            return next(loginErr);
          }
          
          // Record login success
          console.log(`User ${req.body.username} logged in successfully`);
          
          // Calculate response time
          const endTime = process.hrtime(startTime);
          const duration = (endTime[0] * 1000) + (endTime[1] / 1000000);
          console.log(`Login response time: ${duration.toFixed(2)}ms`);
          
          return res.json({ 
            message: 'Login successful',
            user: req.user 
          });
        });
      })(req, res, next);
    }
  );

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    const username = (req.user as any)?.username;
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destruction error:', sessionErr);
        }
        
        res.clearCookie('crewplots.sid');
        console.log(`User ${username} logged out successfully`);
        res.json({ message: 'Logout successful' });
      });
    });
  });

  // Current user route
  app.get('/api/auth/me', (req, res) => {
    console.log('Session data:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('Is authenticated (Passport):', req.isAuthenticated());
    console.log('User object from Passport:', req.user ? `User: ${(req.user as any).username}` : 'No user');
    
    // Start performance timing
    console.time('me:total');
    console.timeLog('me:total', 'after initial auth check');
    
    if (!req.isAuthenticated()) {
      console.timeLog('me:total', 'not authenticated');
      return res.json({ 
        authenticated: false,
        user: null
      });
    }
    
    console.timeLog('me:total', 'after isAuthenticated check');
    console.log(`Get /me - returning authenticated user: ${(req.user as any).username}`);
    
    res.json({
      authenticated: true,
      user: req.user
    });
    
    console.timeEnd('me:total');
  });

  // Auth middleware for protected routes
  app.use('/api/protected/*', (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });

  // Health check for authentication system
  app.get('/api/health/auth', (req, res) => {
    res.json({ 
      sessionStore: req.session ? 'available' : 'unavailable',
      passport: !!passport,
      sessionId: req.sessionID || 'none'
    });
  });
}
```

## Frontend Implementation

### Authentication Context

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define types
type User = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  // Other user properties
};

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthState | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Get current user
  const { data: authData, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Set loading state based on query
  useEffect(() => {
    console.log('Auth data changed:', authData);
    
    if (authData !== undefined) {
      setIsLoading(false);
    }
  }, [authData]);

  // Login function
  async function login(username: string, password: string) {
    console.time('auth:login-total');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      // Refresh auth state
      await refetch();
      
      // Invalidate relevant queries that depend on auth state
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      console.timeEnd('auth:login-total');
    }
  }

  // Logout function
  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      
      // Refresh auth state
      await refetch();
      
      // Clear all queries from cache
      queryClient.clear();
      
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Force refresh of user data
  async function refreshUser() {
    await refetch();
  }

  // Create auth state object
  const value = {
    isLoading,
    isAuthenticated: authData?.authenticated || false,
    user: authData?.user || null,
    login,
    logout,
    refreshUser
  };

  // Provide auth state to components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using auth in components
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
```

### Protected Route Component

```typescript
import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: string;
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth();

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Check role if specified
  if (requiredRole && user?.role !== requiredRole) {
    return <Redirect to="/unauthorized" />;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}
```

## Common Authentication Issues

### Cookie Configuration

Ensure cookie settings are properly configured for your environment:

```typescript
cookie: {
  httpOnly: true,
  // In production:
  secure: process.env.NODE_ENV === 'production',
  // For cross-site access in production:
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
}
```

### Session Timeout Handling

Add client-side session timeout detection:

```typescript
// In auth context
useEffect(() => {
  if (!isAuthenticated) return;
  
  // Check session health periodically
  const interval = setInterval(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin'
      });
      
      const data = await response.json();
      
      if (!data.authenticated && isAuthenticated) {
        // Session expired, update state
        console.log('Session expired, logging out');
        queryClient.setQueryData(['/api/auth/me'], { authenticated: false, user: null });
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, [isAuthenticated]);
```

### CSRF Protection

Add CSRF protection middleware:

```typescript
import csrf from 'csurf';

// Setup CSRF protection
const csrfProtection = csrf({ cookie: true });

// Apply to routes that change state
app.post('/api/auth/login', csrfProtection, ...);
app.post('/api/auth/logout', csrfProtection, ...);

// Provide CSRF token to frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Connection Issue Resilience

Add retry logic for authentication API calls:

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i+1} failed:`, error);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}
```