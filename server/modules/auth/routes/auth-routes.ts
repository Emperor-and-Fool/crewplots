// AUTH ROUTES CATEGORIZATION
// =========================

// GLOBAL ROUTES (Authentication Core - belongs in auth module)
// - POST /register - User registration with VE30 validation
// - POST /login - User login with multi-format support
// - GET /user - Get current authenticated user  
// - GET /login-session - Session validation for auth checks
// - POST /logout - Logout handler (POST)
// - GET /logout - Logout handler (GET)
// - POST /change-password - Password change for authenticated users

// ADMIN/MANAGEMENT ROUTES (Could belong in separate admin module)
// - POST /clear-sessions - Admin-only session clearing
// - GET /clear-all-sessions - Admin session clearing with redirect

// DEVELOPMENT ROUTES (Development utilities - could be separate dev module)
// - GET /dev-logout - Development logout with HTML response
// - GET /autologin - Auto-login for development
// - GET /dev-login - Development login with HTML response

// TODO: Copy routes in correct order with all dependencies