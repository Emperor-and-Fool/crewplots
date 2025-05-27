# Component Library Documentation

## Overview
CrewPlotsManager uses a combination of shadcn/ui components and custom-built components to create a cohesive user interface. This document covers all UI components, their usage patterns, and implementation details.

## Custom Components

### MessagingSystem Component
**File**: `client/src/components/ui/messaging-system.tsx`

A real-time messaging interface for communication between admin users and applicants.

#### Features
- Auto-save functionality when navigating away
- Writer identification (shows who wrote each message)
- Rich text formatting toolbar
- Message type classification (notes vs communications)
- Real-time composition with debounced saving

#### Props Interface
```typescript
interface MessagingSystemProps {
  applicantId: number;
  currentUserId: number;
  messages: Message[];
  onMessageSave: (content: string) => void;
}
```

#### Usage Example
```typescript
<MessagingSystem
  applicantId={applicant.id}
  currentUserId={user.id}
  messages={messages}
  onMessageSave={handleMessageSave}
/>
```

#### Key Features
- **Auto-save**: Messages automatically save when focus is lost or when navigating away
- **Rich text toolbar**: Bold, italic, underline, bullet points, and emoji support
- **Message history**: Displays all previous messages with timestamps and author names
- **Real-time updates**: Integrates with Tanstack Query for live data

### ApplicantForm Component
**File**: `client/src/components/applicant-form.tsx`

Dynamic form component for editing applicant information with validation.

#### Props Interface
```typescript
interface ApplicantFormProps {
  applicant?: Applicant;
  isEditing: boolean;
}
```

#### Features
- React Hook Form integration with Zod validation
- Dynamic field visibility based on edit mode
- Location assignment dropdown
- Status update functionality
- File upload for documents

### StatusBadge Component
Reusable status indicator with consistent styling across the application.

#### Status Variants
```typescript
const statusStyles = {
  'new': 'bg-slate-200 text-slate-800',
  'contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'interviewed': 'bg-blue-100 text-blue-800 border-blue-200',
  'short-listed': 'bg-green-100 text-green-800 border-green-200',
  'hired': 'bg-green-500 text-white',
  'rejected': 'bg-red-500 text-white'
};
```

#### Usage
```typescript
<Badge variant="outline" className={statusStyles[applicant.status]}>
  {applicant.status}
</Badge>
```

## shadcn/ui Components Used

### Card Components
Used extensively throughout the application for content containers.

#### Basic Card Structure
```typescript
<Card className="p-4 rounded-lg shadow-sm border">
  <CardHeader className="pb-2">
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

#### Applicant Card Styling
```typescript
<Card className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1">
```

### Button Components
Consistent button styling with multiple variants.

#### Button Variants
```typescript
// Primary button
<Button>Primary Action</Button>

// Secondary/outline button
<Button variant="outline">Secondary Action</Button>

// Destructive button (for delete actions)
<Button variant="destructive">Delete</Button>

// Small buttons for compact spaces
<Button size="sm" variant="outline">
  <Icon className="h-3 w-3 mr-1" />
  Action
</Button>
```

### Form Components
Integrated form system with validation and error handling.

#### Form Structure
```typescript
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Field Label</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

#### Validation Integration
```typescript
const form = useForm({
  resolver: zodResolver(insertApplicantSchema),
  defaultValues: {
    name: applicant?.name || '',
    email: applicant?.email || '',
    phone: applicant?.phone || '',
    status: applicant?.status || 'new'
  }
});
```

### Dialog Components
Modal dialogs for confirmations and detailed views.

#### Confirmation Dialog
```typescript
<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <p>Are you sure you want to perform this action?</p>
    <div className="flex gap-2 mt-4">
      <Button variant="outline" onClick={() => setShowDialog(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleConfirm}>
        Confirm
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Input Components
Various input types with consistent styling.

#### Input Types Used
```typescript
// Standard text input
<Input type="text" placeholder="Enter text" />

// Email input with validation
<Input type="email" placeholder="email@example.com" />

// Phone input
<Input type="tel" placeholder="+1 (555) 123-4567" />

// Textarea for longer content
<Textarea placeholder="Enter notes or comments" />
```

### Select Components
Dropdown selection with proper value handling.

#### Select Implementation
```typescript
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Important**: Always provide value prop for SelectItem components to avoid errors.

### Toast Notifications
User feedback system for actions and errors.

#### Toast Usage
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success notification
toast({
  title: "Success",
  description: "Action completed successfully",
});

// Error notification
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong",
});
```

## Icon Usage

### Lucide React Icons
Primary icon library for the application.

#### Common Icons Used
```typescript
import { 
  MessageSquare,    // Messaging functionality
  Paperclip,        // Document attachments
  UserCheck,        // Hire action
  Trash2,           // Delete action
  Eye,              // View action
  Edit,             // Edit action
  Plus,             // Add/create action
  Search,           // Search functionality
  Filter,           // Filter controls
  Download,         // Download action
  Upload,           // Upload action
  Calendar,         // Date/scheduling
  MapPin,           // Location
  Phone,            // Contact information
  Mail              // Email
} from 'lucide-react';
```

#### Icon Sizing Conventions
```typescript
// Standard size for inline icons
<Icon className="h-4 w-4" />

// Small icons for compact buttons
<Icon className="h-3 w-3" />

// Larger icons for emphasis
<Icon className="h-5 w-5" />

// Icons with spacing in buttons
<Icon className="h-4 w-4 mr-2" />
```

### React Icons (Company Logos)
Used specifically for company and service logos.

```typescript
import { SiCompanyName } from 'react-icons/si';
```

## Layout Components

### Grid Layouts
Responsive grid systems for different screen sizes.

#### 4-Column Applicant Layout
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Column content */}
</div>
```

#### 2-Column Detail Layout
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Left column - main content */}
  {/* Right column - sidebar */}
</div>
```

### Container Layouts
Consistent page containers with proper spacing.

```typescript
<div className="container mx-auto py-10 px-4">
  {/* Page content */}
</div>
```

## Animation and Transitions

### Hover Effects
Consistent hover animations across interactive elements.

#### Card Hover Animation
```typescript
className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1"
```

#### Button Hover States
```typescript
className="transition-colors duration-200 hover:bg-primary/90"
```

### Loading States
Visual feedback during data operations.

#### Loading Spinner
```typescript
{isLoading && (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)}
```

#### Skeleton Loading
```typescript
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

## Responsive Design Patterns

### Breakpoint Usage
Tailwind CSS responsive prefixes used throughout.

```typescript
// Mobile-first responsive classes
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
className="px-4 md:px-6 lg:px-8"
```

### Mobile Optimizations
- Touch-friendly button sizes (minimum 44px)
- Simplified layouts on smaller screens
- Collapsible navigation and content areas
- Swipe gestures support (future enhancement)

## Color System

### Status Colors
Consistent color usage for different states.

```typescript
const colors = {
  success: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  info: 'text-blue-600 bg-blue-50',
  neutral: 'text-gray-600 bg-gray-50'
};
```

### Theme Colors
Primary brand colors defined in Tailwind config.

```typescript
// Usage examples
className="bg-primary text-primary-foreground"
className="border-primary/20"
className="text-muted-foreground"
```

## Best Practices

### Component Development
1. **Type Safety**: Always use TypeScript interfaces for props
2. **Default Values**: Provide sensible defaults for optional props
3. **Error Boundaries**: Wrap components that might fail
4. **Accessibility**: Include proper ARIA labels and roles
5. **Performance**: Use React.memo for expensive components

### Styling Guidelines
1. **Consistent Spacing**: Use Tailwind's spacing scale (4, 8, 12, 16, etc.)
2. **Color Consistency**: Stick to defined color palette
3. **Typography Scale**: Use consistent font sizes and weights
4. **Component Composition**: Prefer composition over complex single components

### State Management
1. **Local State**: Use useState for component-specific state
2. **Server State**: Use Tanstack Query for API data
3. **Global State**: Use context for app-wide state (auth, theme)
4. **Form State**: Use React Hook Form for complex forms

This component library provides a solid foundation for consistent, accessible, and maintainable UI development throughout the CrewPlotsManager application.