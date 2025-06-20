# Application Container Specification

## Base Configuration

### Container Image
- **Base**: `node:20-alpine` (Alpine Linux 3.18+)
- **Node.js**: v20.x LTS
- **npm**: v10.x
- **Package Manager**: npm (no yarn or pnpm)

### System Dependencies
```dockerfile
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*
```

## Complete Package Manifest

### Production Dependencies
```json
{
  "@hookform/resolvers": "^3.x",
  "@jridgewell/trace-mapping": "^0.x",
  "@neondatabase/serverless": "^0.x",
  "@radix-ui/react-accordion": "^1.x",
  "@radix-ui/react-alert-dialog": "^1.x",
  "@radix-ui/react-aspect-ratio": "^1.x",
  "@radix-ui/react-avatar": "^1.x",
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-collapsible": "^1.x",
  "@radix-ui/react-context-menu": "^2.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-dropdown-menu": "^2.x",
  "@radix-ui/react-hover-card": "^1.x",
  "@radix-ui/react-label": "^2.x",
  "@radix-ui/react-menubar": "^1.x",
  "@radix-ui/react-navigation-menu": "^1.x",
  "@radix-ui/react-popover": "^1.x",
  "@radix-ui/react-progress": "^1.x",
  "@radix-ui/react-radio-group": "^1.x",
  "@radix-ui/react-scroll-area": "^1.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-separator": "^1.x",
  "@radix-ui/react-slider": "^1.x",
  "@radix-ui/react-slot": "^1.x",
  "@radix-ui/react-switch": "^1.x",
  "@radix-ui/react-tabs": "^1.x",
  "@radix-ui/react-toast": "^1.x",
  "@radix-ui/react-toggle": "^1.x",
  "@radix-ui/react-toggle-group": "^1.x",
  "@radix-ui/react-tooltip": "^1.x",
  "@tanstack/react-query": "^5.x",
  "bcryptjs": "^2.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "cmdk": "^0.x",
  "connect-pg-simple": "^9.x",
  "date-fns": "^3.x",
  "drizzle-orm": "^0.x",
  "drizzle-zod": "^0.x",
  "embla-carousel-react": "^8.x",
  "express": "^4.x",
  "express-session": "^1.x",
  "framer-motion": "^11.x",
  "input-otp": "^1.x",
  "ioredis": "^5.x",
  "lucide-react": "^0.x",
  "memoizee": "^0.x",
  "memorystore": "^1.x",
  "mongodb": "^6.x",
  "multer": "^1.x",
  "next-themes": "^0.x",
  "openid-client": "^5.x",
  "passport": "^0.x",
  "passport-local": "^1.x",
  "react": "^18.x",
  "react-day-picker": "^8.x",
  "react-dom": "^18.x",
  "react-hook-form": "^7.x",
  "react-icons": "^5.x",
  "react-resizable-panels": "^2.x",
  "recharts": "^2.x",
  "tailwind-merge": "^2.x",
  "tailwindcss": "^3.x",
  "tailwindcss-animate": "^1.x",
  "tsx": "^4.x",
  "tw-animate-css": "^0.x",
  "typescript": "^5.x",
  "vaul": "^0.x",
  "wouter": "^3.x",
  "ws": "^8.x",
  "zod": "^3.x",
  "zod-validation-error": "^3.x"
}
```

### Development Dependencies
```json
{
  "@replit/vite-plugin-cartographer": "^2.x",
  "@replit/vite-plugin-runtime-error-modal": "^2.x",
  "@tailwindcss/typography": "^0.x",
  "@tailwindcss/vite": "^4.x",
  "@types/bcryptjs": "^2.x",
  "@types/connect-pg-simple": "^7.x",
  "@types/express": "^4.x",
  "@types/express-session": "^1.x",
  "@types/memoizee": "^0.x",
  "@types/multer": "^1.x",
  "@types/node": "^20.x",
  "@types/passport": "^1.x",
  "@types/passport-local": "^1.x",
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x",
  "@types/ws": "^8.x",
  "@vitejs/plugin-react": "^4.x",
  "autoprefixer": "^10.x",
  "drizzle-kit": "^0.x",
  "esbuild": "^0.x",
  "postcss": "^8.x",
  "vite": "^5.x"
}
```

## Application Architecture

### Frontend Stack
- **Framework**: React 18.x with TypeScript
- **Build Tool**: Vite 5.x for development and production builds
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React + React Icons

### Backend Stack
- **Framework**: Express.js 4.x
- **Runtime**: TypeScript with tsx for execution
- **Authentication**: Passport.js with local strategy
- **Session Management**: express-session with Redis store
- **Database ORM**: Drizzle ORM with Zod integration
- **File Uploads**: Multer for multipart handling
- **WebSockets**: ws library for real-time features

### Database Drivers
- **PostgreSQL**: Native pg driver with connection pooling
- **MongoDB**: Official MongoDB driver v6.x with GridFS
- **Redis**: ioredis v5.x with cluster support

## Build Configuration

### TypeScript Setup
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Vite Configuration
- React plugin for JSX transformation
- Path aliases for clean imports (@/, @shared/, @assets/)
- Proxy configuration for API calls
- Static asset handling
- Environment variable injection

### Tailwind Configuration
- Custom color palette
- Typography plugin
- Animation utilities
- Responsive breakpoints
- Dark mode support

## Runtime Configuration

### Port Configuration
- **Development**: 5000 (same as production)
- **Production**: 5000 (internal container port)
- **Health Check**: GET /health endpoint

### Environment Variables
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@postgres:5432/crewplots
MONGODB_URL=mongodb://root:pass@mongodb:27017
MONGODB_DB_NAME=crewplots_documents
REDIS_URL=redis://redis:6379
SESSION_SECRET=<secure_random_string>
ENCRYPTION_KEY=<32_byte_hex_string>
```

### Process Management
- Single process application
- Graceful shutdown handling
- Error logging and monitoring
- Health check endpoint

## Security Configuration

### Input Validation
- Zod schemas for all API inputs
- SQL injection prevention via prepared statements
- XSS protection through React's built-in escaping
- CSRF protection via session tokens

### Authentication & Authorization
- Password hashing with bcryptjs
- Session-based authentication
- Role-based access control
- Secure cookie configuration

### Data Protection
- MongoDB document encryption with AES-256
- Sensitive data isolation
- Audit logging for document access
- Secure file upload handling

## Performance Optimization

### Frontend Optimizations
- Code splitting with React.lazy
- Asset optimization via Vite
- Image lazy loading
- Efficient re-rendering with React Query

### Backend Optimizations
- Database connection pooling
- Redis caching for sessions
- Compressed responses
- Efficient database queries with Drizzle

### Build Optimizations
- Tree shaking for minimal bundle size
- Production minification
- Asset fingerprinting
- Static asset caching

## Development Workflow

### Hot Reloading
- Vite HMR for frontend changes
- tsx watch mode for backend changes
- Automatic TypeScript compilation
- Live browser refresh

### Type Safety
- End-to-end TypeScript coverage
- Shared types between frontend/backend
- Runtime validation with Zod
- Database schema type generation

This container specification provides the complete foundation for running the Crew Plots Pro application in a production Docker environment.