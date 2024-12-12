```markdown:components/README.md
# Components Documentation

## Admin Components

### UserPerms Component
A comprehensive user permissions management interface.

#### Features
- Display all users in a tabular format
- Real-time permission updates
- Role-based access control
- Permission hierarchy:
  - Root (highest)
  - Admin
  - Editor
  - Annotator
  - User (lowest)

#### Usage
```tsx
import UserPerms from "@/components/global/user-perms";

// In your admin page:
<UserPerms />
```

#### Security Features
- Root users cannot be modified
- Only Root users can assign Admin roles
- Admin permissions require Root access to modify
- Automatic current user permission validation

### UploadJson Component
A form interface for uploading JSON data for shlokas and their analyses.

#### Features
- Book metadata input fields
- JSON validation
- Error handling with toast notifications
- Responsive form layout

#### Usage
```tsx
import UploadJsonPage from "@/components/global/upload-json";

// In your upload page:
<UploadJsonPage />
```

#### Input Fields
1. **Book Information**
   - Book name (required)
   - Part 1 (optional)
   - Part 2 (optional)

2. **Data Fields**
   - Shloka Data (JSON format)
   - Analysis Data (JSON format)

#### Example JSON Structure

```json
// Shloka Data
{
  "chaptno": "1",
  "slokano": "1",
  "spart1": "Sanskrit text part 1",
  "spart2": "Sanskrit text part 2"
}

// Analysis Data
{
  "chaptno": "1",
  "slokano": "1",
  "sentno": "1",
  "word": "Sanskrit word",
  "analysis": "Detailed analysis"
  // ... other analysis fields
}
```

## Implementation Details

### UserPerms
- Uses ShadcnUI Table and Select components
- Implements real-time updates
- Handles permission-based rendering
- Includes loading and error states

### UploadJson
- Uses ShadcnUI Input, Textarea, and Button components
- Implements form validation
- Provides feedback through toast notifications
- Responsive grid layout

## Best Practices
1. **Permission Management**
   - Always verify user permissions before modifications
   - Implement proper error handling
   - Maintain permission hierarchy

2. **Data Upload**
   - Validate JSON format before submission
   - Handle large datasets appropriately
   - Provide clear feedback for success/failure

## Error Handling
Both components implement comprehensive error handling:
- Network request failures
- Invalid JSON format
- Permission denied scenarios
- Loading states

## Styling
Components use Tailwind CSS with custom classes for:
- Responsive design
- Dark mode support
- Consistent spacing
- Interactive states

## Dependencies
- ShadcnUI components
- Sonner for toast notifications
- Next.js routing
- React hooks for state management
```