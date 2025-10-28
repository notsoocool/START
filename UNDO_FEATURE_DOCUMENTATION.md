# Row Deletion Bug Fix & Undo Feature Documentation

## Overview

This document describes the fixes and new features implemented to address row deletion issues and add undo functionality.

## Issues Fixed

### 1. Delete Row Bug

**Problem**: When deleting a row (e.g., anvaya_no 2.1 of sentence number 2), entries with the same anvaya_no but different sentence numbers (e.g., 2.1 of sentence number 1) were also getting deleted intermittently.

**Root Cause**: Inconsistent type handling of the `sentno` field. The field could be stored or compared as either a string or number, leading to incorrect matching in the MongoDB query.

**Solution**:

-   Added explicit string conversion and trimming of both `anvaya_no` and `sentno` in the DELETE API endpoint
-   Changed the deletion method from `findOneAndDelete(query)` to first finding by query, then using `findByIdAndDelete(rowToDelete._id)` for absolute certainty
-   Updated the frontend to always send `sentno` as a trimmed string
-   Added consistent string conversion and trimming throughout the frontend comparison logic

**Files Modified**:

-   `app/api/analysis/[book]/[part1]/[part2]/[chaptno]/[slokano]/route.ts`
-   `app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/[id]/page.tsx`

## New Features

### 2. Undo Functionality for Deletions

**Feature**: Users can now undo row deletions within a configurable time period (default: 24 hours).

**Implementation**:

#### Backend

Created a new restore API endpoint at:

```
POST /api/analysis/[book]/[part1]/[part2]/[chaptno]/[slokano]/restore
```

This endpoint:

-   Accepts the deleted row data
-   Recreates the row in the database
-   Logs the restoration action in the history

**File**: `app/api/analysis/[book]/[part1]/[part2]/[chaptno]/[slokano]/restore/route.ts`

#### Frontend

Added undo functionality to the analysis page:

1. **State Management**:

    - Added `deletedRowsHistory` state to track deleted rows with timestamps
    - Configurable `UNDO_TIME_LIMIT` (default: 86400000ms = 24 hours)

2. **Delete Flow**:

    - When a row is deleted, the original data is stored with a timestamp
    - A success toast is shown with an "Undo" button
    - The undo history entry is stored with the toast ID

3. **Undo Flow**:

    - Clicking "Undo" calls the restore API endpoint
    - The page data is refreshed to show the restored row
    - The undo history entry is removed
    - The original delete toast is dismissed

4. **Cleanup**:
    - A useEffect hook runs every minute to clean up expired undo history entries
    - Expired entries are automatically removed from memory

**File**: `app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/[id]/page.tsx`

## Configuration

### Undo Time Limit

The undo time limit can be adjusted in the page component:

```typescript
const UNDO_TIME_LIMIT = 86400000; // 24 hours in milliseconds
```

Common values:

-   15 seconds: `15000`
-   1 minute: `60000`
-   15 minutes: `900000`
-   1 hour: `3600000`
-   24 hours: `86400000` (default)

## API Changes

### DELETE Endpoint Enhancement

The DELETE endpoint now returns the deleted row data to support undo:

**Request**:

```json
{
	"anvaya_no": "2.1",
	"sentno": "2"
}
```

**Response**:

```json
{
	"message": "Row deleted successfully",
	"deletedRow": {
		"_id": "...",
		"anvaya_no": "2.1",
		"sentno": "2",
		"word": "..."
		// ... all other fields
	}
}
```

### New RESTORE Endpoint

**URL**: `POST /api/analysis/[book]/[part1]/[part2]/[chaptno]/[slokano]/restore`

**Request**:

```json
{
	"deletedRow": {
		"_id": "...",
		"anvaya_no": "2.1",
		"sentno": "2",
		"word": "..."
		// ... all other fields
	}
}
```

**Response**:

```json
{
	"message": "Row restored successfully",
	"restoredRow": {
		"_id": "...",
		"anvaya_no": "2.1",
		"sentno": "2",
		"word": "..."
		// ... all other fields
	}
}
```

## User Experience

### Before

-   Deleting a row was permanent
-   Sometimes wrong rows were deleted due to the bug
-   No way to recover accidentally deleted data

### After

-   Delete operation shows confirmation dialog
-   Success toast includes an "Undo" button
-   Users have up to 24 hours to undo the deletion
-   Toast persists for the full undo time limit
-   Proper sentno filtering prevents wrong rows from being deleted

## Testing Recommendations

1. **Test Delete Bug Fix**:

    - Create multiple entries with same anvaya_no but different sentno values
    - Delete one entry
    - Verify only the intended entry is deleted
    - Check that other entries with the same anvaya_no are preserved

2. **Test Undo Feature**:

    - Delete a row
    - Immediately click "Undo" on the toast
    - Verify the row is restored correctly
    - Verify the toast is dismissed
    - Check that all related data (relations, etc.) are intact

3. **Test Undo Time Limit**:

    - Delete a row
    - Wait for the configured time limit to expire
    - Try to undo (should show error)
    - Verify expired entries are cleaned up from memory

4. **Test Edge Cases**:
    - Delete multiple rows in quick succession
    - Undo them in different orders
    - Delete, undo, then delete again
    - Navigate away and back (undo history should persist during session)

## Notes

-   The undo history is stored in component state and will be lost on page refresh
-   Each deletion is independent - undoing one deletion doesn't affect others
-   The cleanup interval runs every minute to remove expired entries
-   Database history logs track both deletions and restorations

