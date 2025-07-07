# Development Module

This module houses all development, testing, and experimental functionality for CrewPlots Pro. It follows the production-ready deployment strategy where commenting out the development module import serves as a deployment gate.

## Directory Structure

```
server/modules/development/
├── routes/               # Development API endpoints
│   ├── index.ts         # Main router
│   ├── email-dev.ts     # Email testing endpoints
│   ├── validation-test.ts # VE30 testing endpoints
│   └── experimental.ts  # Staging for uncertain routes
├── validation/          # Development validation framework
│   ├── DevelopmentValidationEngine.ts
│   └── packages/        # Development validation packages
│       └── emailTestPackage.ts
├── services/            # Development services
│   └── TestingService.ts
├── types/               # Development type definitions
│   └── DevelopmentTypes.ts
└── scripts/             # Development and testing scripts
    ├── index.ts         # Script registry
    ├── auth/            # Authentication tools
    │   └── force-logout.js
    ├── email/           # Email testing tools
    │   ├── test-template-init.js
    │   └── test-verification.js
    ├── mongodb-utils/   # MongoDB development utilities
    │   ├── README.md
    │   ├── delete-mongo-doc.js
    │   └── mongo-proxy-server.js
    ├── redis-build-test/ # Redis build testing and performance tools
    │   └── [40+ Redis development files]
    ├── deploy-test.md           # Deployment testing guide
    ├── test-docker-env.mjs      # Docker environment testing
    ├── test-on-demand-cache.mjs # On-demand cache testing
    ├── test-on-demand-integration.mjs # Integration testing
    ├── test-public-ids.js       # Public ID testing
    └── backup-tests/    # Legacy backup and test files
        └── root-scripts/
```

## Script Organization

### Authentication Scripts
- `force-logout.js` - Completely destroys all authentication state

### Email Scripts  
- `test-template-init.js` - Tests email template system with authentication
- `test-verification.js` - Tests email verification endpoints and VE30 integration

### Database Scripts
- `mongodb/mongodb-utils/` - MongoDB development utilities and proxy server
- `redis/redis-build-test/` - Redis build testing and performance analysis tools

### System Scripts
- `root-scripts/` - System-level testing and deployment verification

## Usage

### Running Scripts
Scripts can be executed directly from their locations or through the script registry:

```javascript
import { getScriptPath, listAvailableScripts } from './scripts/index.js';

// List all available scripts
const scripts = listAvailableScripts();

// Get specific script path
const logoutScript = getScriptPath('auth', 'forceLogout');
```

### API Endpoints
Development API endpoints are mounted at `/api/development/*` when the module is enabled.

### Deployment Gate
For production deployment, comment out the development module import in the main routes file:

```typescript
// Development module (comment out for production)
// import developmentRoutes from './modules/development/routes';
// app.use('/api/development', developmentRoutes);
```

## Architecture Notes

- All files migrated from `DevUtils/` folder while preserving functionality
- Follows same modular patterns as email and scheduler modules
- Provides staging area for experimental features before production integration
- Maintains clear separation between development tools and production code