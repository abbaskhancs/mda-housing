# Bulk Actions Test Guide

## Overview
This guide demonstrates how to test the bulk actions functionality implemented for the BCA console.

## Prerequisites
1. Backend server running on `http://localhost:3001`
2. Frontend server running on `http://localhost:3000`
3. Test data with applications in BCA-pending state

## Test Steps

### 1. Access BCA Console
1. Navigate to `http://localhost:3000/console/bca`
2. Login with BCA credentials (username: `bca`, password: `password123`)
3. You should see the BCA Applications Queue with a data table

### 2. Verify Multi-Select Functionality
1. **Check Select All**: Click the checkbox in the table header
   - ✅ All selectable rows should be selected
   - ✅ Bulk Actions Toolbar should appear showing selected count
2. **Check Individual Selection**: Uncheck header, then select individual rows
   - ✅ Only pending applications should be selectable (checkboxes enabled)
   - ✅ Already processed applications should have disabled checkboxes
3. **Check Selection State**: Selected rows should have blue background highlighting

### 3. Test Bulk CLEAR Operation
1. Select 2+ pending applications using checkboxes
2. Click **"Set Clear"** button in the Bulk Actions Toolbar
3. **Verify Confirmation Modal**:
   - ✅ Modal should show "Confirm Set Clear" title
   - ✅ Message should indicate number of selected items
   - ✅ Remarks field should be optional (not required)
4. Click **"Set Clear"** to confirm
5. **Verify Results**:
   - ✅ Success toast should show "Bulk operation completed: X successful, Y failed"
   - ✅ Applications should refresh and show updated BCA status as "Clear"
   - ✅ Selection should be cleared automatically
   - ✅ Any failures should show individual error toasts

### 4. Test Bulk OBJECTION Operation
1. Select 2+ pending applications
2. Click **"Set Objection"** button (red button)
3. **Verify Confirmation Modal**:
   - ✅ Modal should show "Confirm Set Objection" title
   - ✅ Remarks field should be **required** with red asterisk
   - ✅ Confirm button should be disabled until remarks are entered
4. Enter detailed objection remarks
5. Click **"Set Objection"** to confirm
6. **Verify Results**:
   - ✅ Success toast should appear
   - ✅ Applications should show BCA status as "Objection"
   - ✅ Objection remarks should be saved

### 5. Test Error Handling
1. **Test with Invalid Application**: 
   - If possible, select an application that cannot be processed
   - ✅ Should show per-row error message in toast
2. **Test Network Error**:
   - Disconnect network during bulk operation
   - ✅ Should show appropriate error message
3. **Test Validation**:
   - Try to submit objection without remarks
   - ✅ Confirm button should remain disabled

### 6. Test UI/UX Features
1. **Loading States**:
   - ✅ Confirmation modal should show loading spinner during processing
   - ✅ Bulk Actions Toolbar should be disabled during processing
2. **Clear Selection**:
   - ✅ "Clear" button in toolbar should deselect all items
3. **Row Filtering**:
   - ✅ Only applications with "Pending" BCA status should be selectable
   - ✅ Applications with "Clear" or "Objection" status should have disabled checkboxes

## Expected API Calls

### Bulk Clear Operation
```
POST /api/applications/bulk/clearances
{
  "applications": ["app-id-1", "app-id-2"],
  "sectionId": "bca-section-id",
  "statusId": "clear-status-id",
  "remarks": "Optional remarks"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Bulk clearance operation completed: 2 successful, 0 failed",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "applicationId": "app-id-1",
      "applicationNumber": "A001",
      "success": true,
      "clearance": { ... },
      "autoTransition": { ... }
    },
    {
      "applicationId": "app-id-2", 
      "applicationNumber": "A002",
      "success": true,
      "clearance": { ... }
    }
  ]
}
```

## Acceptance Criteria Verification

### ✅ Multi-select rows functionality
- Checkboxes in table header and rows
- Select all / individual selection
- Visual feedback for selected rows

### ✅ Bulk actions (CLEAR/OBJECTION)
- Bulk Actions Toolbar with action buttons
- Proper action filtering (only meaningful actions shown)

### ✅ Confirmation modal
- Modal appears for each bulk action
- Required remarks validation for objections
- Loading states during processing

### ✅ Per-row error handling
- Individual application processing
- Detailed error messages for failures
- Success/failure tracking and reporting

### ✅ Status updates
- Applications refresh after bulk operation
- BCA clearance statuses updated correctly
- Workflow transitions triggered appropriately

## Troubleshooting

### No Applications Visible
- Ensure applications exist in SENT_TO_BCA_HOUSING stage
- Check QueueFilters are not filtering out applications
- Verify BCA user has proper permissions

### Checkboxes Disabled
- Only applications with "Pending" BCA status are selectable
- Applications already processed (Clear/Objection) cannot be bulk processed

### Bulk Operation Fails
- Check browser console for detailed error messages
- Verify backend server is running and accessible
- Check network tab for API request/response details

## Implementation Files
- **DataTable**: `frontend/src/components/DataTable.tsx` (enhanced with multi-select)
- **Bulk Toolbar**: `frontend/src/components/BulkActionsToolbar.tsx`
- **Confirmation Modal**: `frontend/src/components/ui/confirmation-modal.tsx`
- **BCA Console**: `frontend/src/app/console/bca/page.tsx` (updated with bulk actions)
- **Backend API**: `backend/src/routes/applications.ts` (bulk clearances endpoint)
- **Frontend API**: `frontend/src/services/api.ts` (bulk clearances method)
