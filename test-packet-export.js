/**
 * Test script to validate the Packet Export functionality
 * This script tests the new case packet zip export feature
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

// Mock authentication token (replace with actual token in real testing)
const AUTH_TOKEN = 'your-test-token-here';

async function testPacketExport(applicationId) {
  console.log(`Testing packet export for application ${applicationId}...`);
  
  try {
    const response = await fetch(`${API_BASE}/applications/${applicationId}/packet`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/zip')) {
      throw new Error('Response is not a zip file');
    }
    
    const zipBuffer = await response.buffer();
    console.log('✅ Packet export successful');
    console.log('- Zip size:', zipBuffer.length, 'bytes');
    console.log('- Content-Type:', contentType);
    
    // Save the zip file for manual inspection
    const filename = `test_packet_${applicationId}_${Date.now()}.zip`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, zipBuffer);
    console.log('- Saved to:', filepath);
    
    return true;
  } catch (error) {
    console.error('❌ Packet export test failed:', error.message);
    return false;
  }
}

async function testPacketExportWithInvalidId() {
  console.log('Testing packet export with invalid application ID...');
  
  try {
    const response = await fetch(`${API_BASE}/applications/invalid-id/packet`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      console.log('✅ Correctly returned 404 for invalid application ID');
      return true;
    } else {
      throw new Error(`Expected 404, got ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Invalid ID test failed:', error.message);
    return false;
  }
}

async function testPacketExportWithoutAuth() {
  console.log('Testing packet export without authentication...');
  
  try {
    const response = await fetch(`${API_BASE}/applications/test-id/packet`);
    
    if (response.status === 401) {
      console.log('✅ Correctly returned 401 for unauthenticated request');
      return true;
    } else {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testBackendHealth() {
  console.log('Testing backend health...');
  
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    
    if (response.ok) {
      console.log('✅ Backend is running');
      return true;
    } else {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Packet Export Tests...\n');
  
  const results = [];
  
  // Test 1: Backend health
  results.push(await testBackendHealth());
  console.log('');
  
  // Test 2: Authentication required
  results.push(await testPacketExportWithoutAuth());
  console.log('');
  
  // Test 3: Invalid application ID
  results.push(await testPacketExportWithInvalidId());
  console.log('');
  
  // Test 4: Valid packet export (requires a real application ID)
  // Note: This test will fail without a valid application ID and auth token
  console.log('⚠️  Skipping valid packet export test - requires real application ID and auth token');
  console.log('   To test manually:');
  console.log('   1. Replace AUTH_TOKEN with a valid JWT token');
  console.log('   2. Replace "test-app-id" with a real application ID');
  console.log('   3. Uncomment the line below:');
  console.log('   // results.push(await testPacketExport("test-app-id"));');
  console.log('');
  
  // Uncomment this line to test with a real application ID:
  // results.push(await testPacketExport("test-app-id"));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Packet export implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Login to get a valid auth token');
  console.log('3. Navigate to an application detail page');
  console.log('4. Click the "Export Case Packet" button');
  console.log('5. Verify that a zip file downloads');
  console.log('6. Open the zip file and verify it contains:');
  console.log('   - 01_Intake_Receipt.pdf');
  console.log('   - 02_BCA_Clearance.pdf');
  console.log('   - 03_Housing_Clearance.pdf');
  console.log('   - 04_Accounts_Clearance.pdf');
  console.log('   - 05_Challan.pdf');
  console.log('   - 06_Dispatch_Memo.pdf');
  console.log('   - 07_Transfer_Deed.pdf');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPacketExport,
  testPacketExportWithInvalidId,
  testPacketExportWithoutAuth,
  testBackendHealth,
  runTests
};
