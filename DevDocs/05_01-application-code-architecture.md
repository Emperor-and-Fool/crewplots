# Application Code Architecture Guide

## Core Philosophy

The Crew Plots Pro codebase follows a **"Complete Backend Assembly"** philosophy where the server compiles complete data packages before sending them to the frontend. This eliminates cross-referencing on the client side and ensures data consistency.

### Key Principles
1. **Single Request, Complete Response** - Each API call returns fully compiled data
2. **Type-Safe Throughout** - TypeScript and Zod schemas ensure consistency
3. **Service Layer Pattern** - Business logic separated from route handlers
4. **Role-Based Data Filtering** - Permissions applied at service level
5. **Shared Schema Authority** - Single source of truth for data structures

## Project Structure

```
├── client/src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Shadcn/ui base components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── applicants/     # Applicant management components
│   │   └── notes/          # Messaging system components
│   ├── pages/              # Route-level page components
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions and configurations
├── server/
│   ├── routes/             # API route handlers (thin controllers)
│   │   └── messages/       # Nested route organization
│   ├── services/           # Business logic layer
│   ├── middleware/         # Authentication & validation
│   └── db.ts              # Database connection and setup
├── shared/
│   └── schema.ts          # Shared TypeScript types and Zod schemas
```

## Frontend Architecture (React + TypeScript)

### Component Organization
Components are organized by feature area with clear separation of concerns:

```typescript
// Feature-based component structure
components/
├── ui/                    # Base UI components (buttons, forms, etc.)
├── applicants/           # Applicant-specific components
│   └── applicant-form.tsx
├── dashboard/            # Dashboard widgets
│   ├── applicants-summary.tsx
│   └── staff-overview.tsx
└── notes/               # Messaging system components
    └── notes-manager.tsx
```

### Form Handling Pattern
All forms use React Hook Form with Zod validation:

```typescript
// Standard form implementation pattern
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";

export function ComponentForm({ data, isEditing = false }: FormProps) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: data || {
      // Provide defaults for all required fields
      username: "",
      email: "",
      role: "applicant"
    }
  });

  const mutation = useMutation({
    mutationFn: (data: InsertUser) => 
      apiRequest(isEditing ? `/api/endpoint/${id}` : '/api/endpoint', {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/endpoint'] });
      toast({ title: "Success message" });
    }
  });
}
```

### Data Fetching Pattern
TanStack Query for all server state with strong typing:

```typescript
// Standard data fetching pattern
const { data: items, isLoading } = useQuery<ItemType[]>({
  queryKey: ['/api/items'],
  // queryFn is automatically set up via queryClient configuration
});

// For mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data: InsertItem) => apiRequest('/api/items', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/items'] });
  }
});
```

### Routing and Protection
Protected routes with role-based access:

```typescript
// Route protection pattern in App.tsx
<Route path="/admin">
  {serverAuthState.authenticated ? 
    <RoleProtectedRoute 
      component={AdminPanel} 
      requiredRoles={["manager", "administrator"]} 
    /> : 
    <Redirect to="/login" />
  }
</Route>
```

## Backend Architecture (Express.js + TypeScript)

### Route Handler Pattern
Keep route handlers thin - delegate to service layer:

```typescript
// Thin controller pattern
import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { messagingService } from '../services/messaging-service';

const router = express.Router();

router.get('/notes/:workflow', authenticateUser, async (req, res) => {
  try {
    const { workflow } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Delegate business logic to service layer
    const compiledNotes = await messagingService.getNotesByWorkflow(
      userId, 
      workflow, 
      userRole
    );
    
    res.json(compiledNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### Service Layer Pattern
Business logic with complete data compilation:

```typescript
// Service layer with data compilation
export class MessagingService {
  async getNotesByWorkflow(userId: number, workflow: string, userRole: string): Promise<CompiledNote[]> {
    // 1. Fetch base data
    const workflowNotes = await db
      .select()
      .from(messages)
      .where({...conditions});

    // 2. Apply role-based filtering
    const filteredNotes = workflowNotes.filter(note => 
      this.checkRolePermissions(note, userRole)
    );

    // 3. Compile complete data packages
    const compiledNotes: CompiledNote[] = [];
    for (const note of filteredNotes) {
      const compiled = await this.compileNoteData(note, userId, userRole);
      compiledNotes.push(compiled);
    }

    return compiledNotes;
  }

  private async compileNoteData(note: Message, userId: number, userRole: string): Promise<CompiledNote> {
    // Assemble complete data package including:
    // - Author information
    // - Permission flags
    // - Related document references
    // - Any other contextual data needed by frontend
  }
}
```

### Database Layer Pattern
Type-safe queries with Drizzle ORM:

```typescript
// Database query patterns
import { eq, and, desc, or } from 'drizzle-orm';
import { db } from '../db';
import { users, messages } from '@shared/schema';

// Simple queries
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Complex queries with joins
const notesWithAuthors = await db
  .select({
    id: messages.id,
    content: messages.content,
    authorName: users.name,
    authorRole: users.role
  })
  .from(messages)
  .leftJoin(users, eq(messages.authorId, users.id))
  .where(and(
    eq(messages.workflow, workflow),
    eq(messages.userId, userId)
  ))
  .orderBy(desc(messages.createdAt));
```

## Shared Schema Architecture

### Schema Definition Pattern
Central schema with Zod validation:

```typescript
// Schema definition in shared/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  role: text("role", { 
    enum: ["administrator", "manager", "crew_manager", "crew_member", "applicant"] 
  }).notNull().default("applicant"),
  // ... other fields
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
```

## Code Style Guidelines

### Comments and Documentation
Use JSDoc for functions, inline comments for complex logic:

```typescript
/**
 * Compiles complete note data for frontend consumption
 * @param note - Raw note from database
 * @param userId - Current user ID for permission calculation
 * @param userRole - Current user role for filtering
 * @returns Complete note with author info and permissions
 */
private async compileNoteData(note: Message, userId: number, userRole: string): Promise<CompiledNote> {
  // Check if user can edit this note (author or manager+)
  const canEdit = note.authorId === userId || 
    ['manager', 'administrator'].includes(userRole);
  
  // Compile author information
  const author = await this.getAuthorInfo(note.authorId);
  
  return {
    ...note,
    author,
    permissions: { canEdit, canDelete: canEdit, canShare: true }
  };
}
```

### Error Handling
Consistent error handling with proper logging:

```typescript
// Frontend error handling
const mutation = useMutation({
  mutationFn: async (data: InsertUser) => {
    const response = await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  }
});

// Backend error handling
router.post('/users', async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### TypeScript Best Practices
- Use strict TypeScript configuration
- Prefer interfaces for object shapes, types for unions
- Use const assertions for immutable data
- Leverage discriminated unions for state management

```typescript
// Good: Discriminated union for component states
type ComponentState = 
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: User[] };

// Good: Const assertion for configuration
const API_ENDPOINTS = {
  USERS: '/api/users',
  MESSAGES: '/api/messages',
  DOCUMENTS: '/api/documents'
} as const;
```

## Development Workflow

### Adding New Features
1. **Define Schema** - Add to `shared/schema.ts` first
2. **Create Service** - Implement business logic with data compilation
3. **Add Routes** - Thin controllers that delegate to services
4. **Build Components** - Frontend components using established patterns
5. **Add Tests** - Test service layer and critical components

### File Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: kebab-case (`user-service.ts`)
- **Directories**: kebab-case (`user-management/`)
- **API Routes**: RESTful paths (`/api/users/:id/notes`)

### Import Organization
```typescript
// 1. External libraries
import express from 'express';
import { z } from 'zod';

// 2. Internal modules (services, utils)
import { userService } from '../services/user-service';
import { authenticateUser } from '../middleware/auth';

// 3. Shared types and schemas
import { insertUserSchema, type User } from '@shared/schema';

// 4. Relative imports last
import './styles.css';
```

This architecture ensures maintainable, type-safe code with clear separation of concerns and consistent patterns throughout the application.