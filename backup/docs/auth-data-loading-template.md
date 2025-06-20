# Authentication & Data Loading: Troubleshooting Template

## Authentication Issues Matrix

| Issue | Symptoms | Investigation | Solution |
|-------|----------|--------------|----------|
| Cookie not sent | Network tab: request without Cookie header, server returns 401/302 | Check credentials setting | Add `credentials: 'include'` to fetch calls |
| SameSite/Secure mismatch | Cookie visible in Application>Cookies but not sent | Check cookie settings | For HTTPS (like Replit): `sameSite: 'lax', secure: true` |
| Order of middleware | Random auth failures | Inspect Express code | `app.use(session())` before `app.use(passport.session())` |
| HTML redirect vs JSON | Response is HTML when React expects JSON | Look at response content | Return JSON with auth status instead of redirects |
| DB connection issues | Request never completes | Server logs, timeouts | Add timeouts, connection pooling, proper error handling |

## Server-Side Pattern (Express/Passport)
```javascript
// 1. COOKIE SETTINGS - Critical for Replit/deployment
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: "lax",    // Same-origin; Lax is safer than None
    secure: true,       // Required for HTTPS (always true on Replit)
    httpOnly: true,     // Security best practice
    maxAge: 86400000    // 24 hours
  }
}));

// 2. AUTH RESPONSES - Always JSON, never redirects for API routes
app.get('/api/auth/me', (req, res) => {
  // For debugging, include detailed session info in dev
  if (!req.isAuthenticated()) {
    return res.status(200).json({
      authenticated: false,
      debug: {
        sessionExists: !!req.session,
        sessionId: req.sessionID
      }
    });
  }
  // Success response
  res.json({
    authenticated: true,
    user: req.user
  });
});
```

## Client-Side Pattern (React)
```typescript
// 1. FETCH WITH TIMEOUT - Prevents infinite loading
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include' // Critical for cookies
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

// 2. AUTH STATE MANAGEMENT - Predictable loading states
const useAuthCheck = () => {
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const response = await fetchWithTimeout('/api/auth/me');
        const data = await response.json();
        
        if (isMounted) {
          setAuthState({
            isLoading: false,
            isAuthenticated: data.authenticated,
            user: data.user || null,
            error: null
          });
        }
      } catch (error) {
        if (isMounted) {
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: error.message
          });
        }
      }
    };

    checkAuth();
    
    // Clean up to prevent state updates after unmount
    return () => { isMounted = false; };
  }, []);

  return authState;
};
```

## Database Schema Changes Checklist

1. ✅ First update all queries referencing fields being modified
2. ✅ Then update the schema definition
3. ✅ Update interface type definitions to match schema
4. ✅ Update UI components using the data model
5. ✅ Test with existing data after changes
6. ✅ Restart server to apply changes

## Browser Dev Tools Debugging Flow

1. Check Network tab:
   - Look for auth API requests (e.g., `/api/auth/me`)
   - Examine response codes and content
   - Verify cookie headers are present in requests

2. Check Application > Cookies:
   - Confirm cookies exist
   - Verify Secure/SameSite settings

3. Check Console:
   - Look for fetch errors or CORS issues
   - Check auth state logging

## Hard-Earned Lessons

1. Never trust "works on localhost" - test with HTTPS early
2. Return JSON for API errors, not redirects
3. Add timeouts to prevent infinite spinners
4. Clear database sessions when cookie settings change
5. When you modify schema, update ALL references in queries
6. Race conditions in auth state vs data loading are real - handle loading states properly