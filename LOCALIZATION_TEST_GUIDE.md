# Localization Test Guide

This guide helps you manually test the Urdu/English localization functionality.

## Prerequisites

1. Frontend server running on http://localhost:3000
2. Backend server running on http://localhost:3001

## Test Steps

### 1. Initial Language Check
1. Open http://localhost:3000 in your browser
2. **Expected**: Page should load in Urdu by default
   - Title: "ایم ڈی اے ہاؤسنگ میں خوش آمدید"
   - Subtitle: "ہاؤسنگ ٹرانسفر ورک فلو مینجمنٹ سسٹم"
   - Navigation: "ہوم", "لاگ ان"

### 2. Language Toggle Functionality
1. Look for the language toggle button in the top-right corner (globe icon with "اردو")
2. Click the language toggle button
3. **Expected**: Dropdown should appear with:
   - "اردو" (Urdu) - currently selected
   - "English" - alternative option
4. Click "English" option
5. **Expected**: Page should immediately switch to English:
   - Title: "Welcome to MDA Housing"
   - Subtitle: "Housing Transfer Workflow Management System"
   - Navigation: "Home", "Login"
   - Language toggle now shows "English"

### 3. Language Persistence Test
1. With the page in English, refresh the browser (F5 or Ctrl+R)
2. **Expected**: Page should remain in English after refresh
3. Switch back to Urdu using the language toggle
4. Refresh the page again
5. **Expected**: Page should remain in Urdu after refresh

### 4. Navigation Labels Test
1. Test both languages and verify navigation labels change:
   - **Urdu**: "ہوم", "لاگ ان"
   - **English**: "Home", "Login"

### 5. Login and Extended UI Test
1. Click "Login" (or "لاگ ان" in Urdu)
2. Login with demo credentials:
   - Username: `owo_user`
   - Password: `password123`
3. After login, verify navigation expands with role-based links:
   - **Urdu**: "ہوم", "نئی درخواست", "لاگ آؤٹ"
   - **English**: "Home", "New Application", "Logout"

### 6. Application Form Labels Test
1. Navigate to "New Application" (or "نئی درخواست")
2. Verify form sections and labels change with language:
   - **Urdu**: 
     - "نئی درخواست"
     - "فروخت کنندہ کی معلومات"
     - "خریدار کی معلومات"
     - "نام", "شناختی کارڈ", "والد کا نام"
   - **English**:
     - "New Application"
     - "Seller Information"
     - "Buyer Information"
     - "Name", "CNIC", "Father's Name"

### 7. Document Types Test
1. In the attachments section, click the document type dropdown
2. Verify document types are localized:
   - **Urdu**: "الاٹمنٹ لیٹر", "شناختی کارڈ (فروخت کنندہ)", etc.
   - **English**: "Allotment Letter", "CNIC (Seller)", etc.

### 8. Button and Message Test
1. Verify buttons change language:
   - **Urdu**: "درخواست بنائیں", "منسوخ کریں", "قطار شامل کریں +"
   - **English**: "Create Application", "Cancel", "+ Add row"

### 9. PDF Templates Test (Urdu Only)
1. Create a test application (you can use dummy data)
2. After successful creation, download the intake receipt PDF
3. **Expected**: PDF should be in Urdu regardless of UI language setting
   - Title: "درخواست برائے منتقلی پلاٹ - رسید"
   - All content in Urdu with proper RTL layout
   - Noto Nastaliq Urdu font

### 10. Cross-Page Persistence Test
1. Set language to English
2. Navigate between different pages (Home → Login → New Application)
3. **Expected**: Language should remain English across all pages
4. Switch to Urdu and repeat navigation
5. **Expected**: Language should remain Urdu across all pages

## Expected Results Summary

✅ **Language Toggle**: 
- Visible in top-right corner with globe icon
- Shows current language (اردو/English)
- Dropdown with both language options

✅ **UI Translation**:
- All navigation labels translate
- Form labels and sections translate
- Buttons and messages translate
- Document types translate
- Validation messages translate

✅ **Persistence**:
- Language choice persists across page refreshes
- Language choice persists across navigation
- Stored in browser localStorage

✅ **PDF Templates**:
- Always remain in Urdu regardless of UI language
- Proper RTL layout and Urdu fonts
- All template content in Urdu

## Troubleshooting

If localization is not working:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check localStorage**: Open DevTools → Application → Local Storage → check for `app_language` key
3. **Clear Cache**: Try hard refresh (Ctrl+Shift+R) or clear browser cache
4. **Check Network**: Ensure both frontend and backend servers are running

## Technical Implementation

- **Context**: `LocalizationContext` provides language state and translation function
- **Storage**: Language preference stored in `localStorage` as `app_language`
- **Default**: Urdu (`ur`) is the default language
- **Fallback**: English (`en`) used as fallback for missing translations
- **Components**: All major components use `useLocalization()` hook and `t()` function
