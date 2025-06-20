# Cookie & Session Management in Crew Plots Pro

## Key Cookie Configuration

The most reliable session cookie configuration for our environment:

```javascript
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax",    // Safe choice for same-origin applications
      secure: true,       // Required for HTTPS deployment
      httpOnly: true,     // Prevents JavaScript access (security)
      maxAge: 86400000    // 24 hours
    }
  })
);
```

## SameSite & Secure Settings

### Critical Rule
Never use `SameSite: "None"` without also setting `secure: true`

Chrome 80+ and other modern browsers silently discard cookies with:
- `SameSite=None` + `secure: false` (or missing secure flag)

This leads to hard-to-diagnose auth problems where:
1. Login appears successful (server returns 200)
2. Session cookie is sent but silently dropped by browser
3. Next request has no cookie, user appears logged out

### Appropriate SameSite Values

- `lax` (recommended): Allows cookies to be sent with top-level navigations and with same-site requests
- `strict`: Cookies only sent with same-site requests (may break social logins, 3rd party auth)
- `none`: Cookies sent with all requests (requires `secure: true`)

## Authentication Flow Recommendations

1. **Do not rely on redirects for SPA auth flows**
   ```javascript
   // BAD: Redirecting to login page
   if (!req.isAuthenticated()) {
     return res.redirect('/login');
   }
   
   // GOOD: Returning JSON status
   if (!req.isAuthenticated()) {
     return res.status(200).json({
       authenticated: false
     });
   }
   ```

2. **Include detailed debugging in auth responses**
   ```javascript
   // In development, include useful debugging info
   if (!req.isAuthenticated()) {
     return res.status(200).json({
       authenticated: false,
       debug: {
         sessionExists: !!req.session,
         sessionId: req.sessionID,
         cookieHeader: req.headers.cookie
       }
     });
   }
   ```

3. **Clear all session cookies on logout**
   ```javascript
   app.get('/api/auth/logout', (req, res) => {
     req.logout((err) => {
       if (err) {
         return res.status(500).json({ error: 'Logout failed' });
       }
       
       // Clear the session cookie
       res.clearCookie('connect.sid');
       
       // Clear additional cookies if used
       res.clearCookie('crewplots.sid');
       
       res.redirect('/login');
     });
   });
   ```

## Troubleshooting Common Issues

### 1. User appears logged in but can't access protected pages

- **Symptom**: Auth endpoints show authenticated:true but data endpoints return 401
- **Likely cause**: Multiple session cookies with conflicting domains/paths
- **Solution**: Standardize on one session cookie name and configuration

### 2. Session lost on page reload

- **Symptom**: User loses session on browser refresh
- **Likely cause**: Cookie not being stored or sent with requests
- **Solution**: Check cookie config, ensure SameSite is appropriate

### 3. Intermittent authentication issues

- **Symptom**: Sometimes works, sometimes doesn't
- **Likely cause**: Race condition in session initialization
- **Solution**: Add timeouts between authenticating and fetching data

## Clearing Existing Sessions

For administrators, implement a function to clear all sessions when making major cookie configuration changes:

```javascript
// Route handler to clear all sessions
app.post('/api/admin/clear-sessions', isAdmin, async (req, res) => {
  try {
    // If using PostgreSQL session store
    await db.delete(sessions);
    
    res.status(200).json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ error: 'Failed to clear sessions' });
  }
});
```

## Best Practices for Production

1. **Set appropriate cookie expiration**
   - Short-lived for sensitive applications (1-2 hours)
   - Medium-lived for regular apps (24 hours)
   - Long-lived with refresh tokens for "remember me" (7-30 days)

2. **Use secure database session store**
   - Never use MemoryStore in production
   - Use PostgreSQL/Redis/MongoDB session stores for distributed systems
   - Implement proper session pruning to avoid database bloat

3. **Monitor session statistics**
   - Track active sessions count
   - Watch for unusual session creation patterns
   - Alert on session store issues

4. **Implement graceful degradation**
   - Handle session store outages
   - Provide meaningful errors when authentication fails