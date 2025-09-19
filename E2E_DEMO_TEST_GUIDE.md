# E2E Demo Test Guide

This guide helps you test the **Run E2E Demo** button that automates the complete workflow from SUBMITTED to CLOSED.

## Prerequisites

1. Frontend server running on http://localhost:3002
2. Backend server running on http://localhost:3001
3. Database seeded with demo users and workflow stages

## Test Application Available

A test application has been created for you:
- **Application ID**: `cmfqgu54c000d1223oiaddq37`
- **Application Number**: `cmfqgu54c000e12231b3s53gy`
- **Current Stage**: SUBMITTED
- **Seller**: Ahmed Ali (12345-6789012-3)
- **Buyer**: Fatima Khan (98765-4321098-7)
- **Plot**: E2E-001 (Test Location)

## Step-by-Step Test Instructions

### 1. Login as Admin
1. Open http://localhost:3002 in your browser
2. Click "Login" (or "لاگ ان" if in Urdu)
3. Enter credentials:
   - **Username**: `admin`
   - **Password**: `password123`
4. Click "Login"

### 2. Navigate to Test Application
1. After login, navigate to: `/applications/cmfqgu54c000d1223oiaddq37`
2. Or use the full URL: `http://localhost:3002/applications/cmfqgu54c000d1223oiaddq37`

### 3. Verify Initial State
You should see:
- Application header showing "Application cmfqgu54c000e12231b3s53gy"
- Current stage: "Submitted • ACTIVE"
- Summary tab showing application details
- **Purple "Run E2E Demo" button** in the top-right header area

### 4. Run E2E Demo
1. Click the **"Run E2E Demo"** button (purple button with play icon)
2. A modal should appear titled "E2E Workflow Demo Progress"
3. The demo will automatically start executing the following stages:

#### Expected Workflow Progression:
1. **Under Scrutiny** - Complete intake review
2. **Sent to BCA & Housing** - Send for clearances  
3. **BCA & Housing Clear** - Generate clearance PDFs
4. **OWO Review - BCA & Housing** - Review clearances
5. **Sent to Accounts** - Send to accounts
6. **Accounts Clear** - Calculate fees and verify payment
7. **OWO Review - Accounts** - Review accounts
8. **Ready for Approval** - Prepare for approval
9. **Approved** - Approve application
10. **Post-Entries** - Create transfer deed
11. **Closed** - Close case

### 5. Monitor Progress
Watch the progress modal as it:
- Shows each step with status indicators:
  - ⭕ Pending (gray circle)
  - 🔄 Running (blue spinning circle)
  - ✅ Completed (green checkmark)
  - ❌ Failed (red X)
- Updates the current step being executed
- Shows action descriptions for each step
- Displays any error messages if failures occur

### 6. Verify UI Updates
As each step completes:
- The application page should refresh automatically
- The header should show the new current stage
- The Summary tab should reflect the updated stage
- The workflow actions should update for the new stage

### 7. Final Verification
When the demo completes successfully:
- Application should be in **"Closed"** stage
- All steps in the modal should show green checkmarks
- The application header should show "Closed • ACTIVE"
- You can close the modal by clicking the X button

## Expected Results

✅ **E2E Demo Button**:
- Visible only to ADMIN users
- Purple color with play icon
- Located in application header next to Export button

✅ **Progress Modal**:
- Shows all 11 workflow steps
- Real-time status updates
- Clear visual indicators
- Stop button available during execution
- Error handling and display

✅ **Workflow Automation**:
- Completes all stages from SUBMITTED to CLOSED
- Generates placeholder data as needed:
  - BCA and Housing clearance PDFs
  - Accounts breakdown with fees
  - Payment verification
  - Transfer deed with witnesses
- Uses same APIs as manual UI operations
- Updates application state after each transition

✅ **UI Integration**:
- Application page refreshes after each step
- Stage information updates in real-time
- No manual intervention required
- Seamless user experience

## Troubleshooting

### If E2E Demo Button Not Visible:
- Ensure you're logged in as `admin` user
- Check browser console for JavaScript errors
- Verify you're on the correct application page

### If Demo Fails to Start:
- Check that both frontend and backend servers are running
- Verify the application is in SUBMITTED stage
- Check browser network tab for API errors

### If Demo Stops Mid-Execution:
- Check the error message in the progress modal
- Look at browser console for detailed errors
- Verify backend logs for API failures
- The demo can be restarted from the current stage

### If Application Doesn't Update:
- Refresh the page manually
- Check that the API calls are completing successfully
- Verify the application ID is correct

## Technical Details

- **Component**: `E2EDemoButton.tsx`
- **Location**: `frontend/src/components/E2EDemoButton.tsx`
- **Integration**: Added to `frontend/src/app/applications/[id]/page.tsx`
- **API Endpoints**: Uses existing workflow and application APIs
- **Authentication**: Requires ADMIN role
- **Error Handling**: Graceful failure with detailed messages
- **State Management**: Updates application state after each transition

## Success Criteria

The E2E Demo is working correctly if:
1. ✅ Button is visible to ADMIN users only
2. ✅ Modal opens and shows workflow steps
3. ✅ All 11 stages execute successfully
4. ✅ Application reaches CLOSED stage
5. ✅ UI updates reflect each transition
6. ✅ No manual API calls required
7. ✅ Placeholder data is generated appropriately
8. ✅ Error handling works for failures
