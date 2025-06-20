# Applicant Management System

## Overview
The applicant management system is the core feature of CrewPlotsManager, providing a complete workflow for handling job applications from submission to hiring decisions.

## Applicant Workflow

### 4-Stage Card Layout
The applicant management interface uses a 4-column layout representing different stages:

#### 1. Not Reviewed Yet
- **Status**: `"new"`
- **Description**: Fresh applicant submissions that haven't been processed
- **Visual**: Clean white cards with standard styling
- **Actions**: Click to view details, short-list, or reject

#### 2. Short-listed  
- **Status**: `"short-listed"`
- **Description**: Promising candidates selected for further consideration
- **Visual**: White cards with green status badge
- **Actions**: Move to hire, interview, or look again

#### 3. Look Again
- **Status**: `"contacted"`, `"interviewed"`
- **Description**: Candidates under active consideration or requiring follow-up
- **Visual**: Cards with yellow (contacted) or blue (interviewed) badges
- **Actions**: Progress to hire or move to other stages

#### 4. Rejected
- **Status**: `"rejected"`
- **Description**: Declined applications
- **Visual**: Cards with red status badge
- **Actions**: Limited actions, mainly for record keeping

## Visual Indicators

### Message Status
```typescript
// Message indicator with status dot
{applicant.extraMessage ? (
  <div className="flex items-center gap-1">
    <MessageSquare className="h-4 w-4 text-blue-500" />
    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
  </div>
) : (
  <div className="flex items-center gap-1">
    <MessageSquare className="h-4 w-4 text-gray-300" />
    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
  </div>
)}
```

### Document Status
```typescript
// Document attachment indicator
{applicant.resumeUrl ? (
  <div className="flex items-center gap-1">
    <Paperclip className="h-4 w-4 text-green-500" />
    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
  </div>
) : (
  <div className="flex items-center gap-1">
    <Paperclip className="h-4 w-4 text-gray-300" />
    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
  </div>
)}
```

### Status Badges
```typescript
const statusBadges = {
  'new': 'bg-slate-200 text-slate-800',
  'contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'interviewed': 'bg-blue-100 text-blue-800 border-blue-200', 
  'short-listed': 'bg-green-100 text-green-800 border-green-200',
  'hired': 'bg-green-500 text-white',
  'rejected': 'bg-red-500 text-white'
}
```

## Card Components

### Applicant Card Structure
```typescript
interface ApplicantCardProps {
  applicant: Applicant;
  location?: Location;
  onClick: () => void;
}

// Card layout includes:
// - Header with name and visual indicators
// - Status badge(s)
// - Contact information (email, phone)
// - Location if assigned
// - Creation date
// - Hover effects and click handling
```

### Card Interactions
- **Hover Effects**: Subtle lift animation and border color change
- **Clickable**: Entire card navigates to detail view
- **Consistent Styling**: All cards use the same base styling regardless of status
- **Real-time Updates**: Status changes immediately reflect in UI

## Data Flow

### Applicant Data Structure
```typescript
interface Applicant {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: "new" | "contacted" | "interviewed" | "hired" | "rejected" | "short-listed";
  resumeUrl: string | null;
  notes: string | null;
  extraMessage: string | null;
  locationId: number | null;
  userId: number | null;
  createdAt: Date;
}
```

### API Operations
```typescript
// Fetch all applicants
GET /api/applicants
Response: Applicant[]

// Update applicant status
PATCH /api/applicants/:id
Body: { status: string, reviewerNotes?: string, locationId?: number }
Response: Applicant

// Delete applicant
DELETE /api/applicants/:id
Response: { success: boolean }
```

### Query Management
```typescript
// Tanstack Query setup
const { data: applicants, isLoading } = useQuery({
  queryKey: ['/api/applicants'],
  staleTime: 30000
});

// Status update mutation
const updateApplicant = useMutation({
  mutationFn: (data: UpdateApplicantData) => 
    apiRequest('PATCH', `/api/applicants/${data.id}`, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
  }
});
```

## Component Implementation

### Main Applicants Page
**File**: `client/src/pages/applicants.tsx`

Key features:
- 4-column responsive grid layout
- Real-time filtering by status
- Location-based filtering
- Drag-and-drop potential (future enhancement)
- Batch operations (future enhancement)

### Filter Logic
```typescript
const filteredApplicants = {
  new: applicants?.filter(app => app.status === 'new') || [],
  shortListed: applicants?.filter(app => 
    app.status === 'contacted' || 
    app.status === 'interviewed' || 
    app.status === 'short-listed'
  ) || [],
  lookAgain: applicants?.filter(app => 
    app.status === 'contacted' || 
    app.status === 'interviewed'
  ) || [],
  rejected: applicants?.filter(app => app.status === 'rejected') || []
};
```

### Action Handlers
```typescript
const handleShortList = async (applicant: Applicant) => {
  await updateApplicant.mutateAsync({
    id: applicant.id,
    status: 'short-listed',
    reviewerNotes: '',
    locationId: null
  });
  navigate('/applicants'); // Return to list view
};

const handleHire = async (applicant: Applicant) => {
  await updateApplicant.mutateAsync({
    id: applicant.id,
    status: 'hired'
  });
};

const handleDelete = async (applicant: Applicant) => {
  if (confirm(`Delete application from ${applicant.name}?`)) {
    await deleteApplicant.mutateAsync(applicant.id);
  }
};
```

## Performance Optimizations

### Query Caching
- 30-second stale time for applicant list
- Automatic cache invalidation on mutations
- Optimistic updates for instant UI feedback

### Component Optimization
- React.memo for card components
- Efficient re-renders with proper dependency arrays
- Lazy loading for large applicant lists

### Network Optimization
- Batch API requests where possible
- Debounced search/filter inputs
- Efficient data structures to minimize payload size

## Error Handling

### API Error Handling
```typescript
const { error } = useQuery({
  queryKey: ['/api/applicants'],
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
});

if (error) {
  return <ErrorState message="Failed to load applicants" onRetry={refetch} />;
}
```

### User Feedback
- Toast notifications for successful actions
- Loading states during operations
- Clear error messages with retry options
- Confirmation dialogs for destructive actions

## Integration Points

### Messaging System
- Bidirectional communication between admin and applicants
- Message indicators on cards
- Auto-save functionality
- Real-time message composition

#### Workflow Tagging
All messages created through the applicant portal are automatically tagged with the `application` workflow. This ensures:
- Proper data categorization in the dual-database architecture
- Role-based access control for applicant communications
- Workflow-specific storage and retrieval strategies
- Clear separation between applicant notes and staff communications

The system handles workflow assignment automatically without requiring manual selection, maintaining clean data organization across PostgreSQL metadata and MongoDB document storage.

### Document Management
- PDF/DOC resume upload and viewing
- Document status indicators
- Secure file storage and access
- File type validation

### Location Management
- Multi-location support
- Location-based filtering
- Assignment workflow
- Location-specific permissions (future enhancement)

## Future Enhancements

### Planned Features
- Drag-and-drop status changes
- Bulk operations (bulk status updates, batch emails)
- Advanced filtering and search
- Email integration for automated communication
- Interview scheduling system
- Applicant rating and scoring system
- Export functionality (PDF reports, CSV data)

### Technical Improvements
- Real-time updates via WebSocket
- Advanced caching strategies
- Progressive Web App features
- Mobile app integration
- Analytics and reporting dashboard