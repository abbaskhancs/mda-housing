/**
 * Test script to validate the Registers API implementation
 * This script tests the new current owner functionality and PDF export
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock authentication token (replace with actual token in real testing)
const AUTH_TOKEN = 'your-test-token-here';

async function testApplicationsWithCurrentOwner() {
  console.log('Testing applications API with current owner...');
  
  try {
    const response = await fetch(`${API_BASE}/applications`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Applications API response received');
    
    if (data.applications && data.applications.length > 0) {
      const firstApp = data.applications[0];
      console.log('Sample application structure:');
      console.log('- Application ID:', firstApp.id);
      console.log('- Plot Number:', firstApp.plot?.plotNumber);
      console.log('- Current Owner:', firstApp.plot?.currentOwner?.name || 'No current owner');
      console.log('- Current Owner CNIC:', firstApp.plot?.currentOwner?.cnic || 'N/A');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Applications API test failed:', error.message);
    return false;
  }
}

async function testRegistersPDFExport() {
  console.log('Testing registers PDF export...');
  
  try {
    const response = await fetch(`${API_BASE}/applications/registers/export-pdf`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Response is not a PDF');
    }
    
    const pdfBuffer = await response.buffer();
    console.log('✅ PDF export successful');
    console.log('- PDF size:', pdfBuffer.length, 'bytes');
    console.log('- Content-Type:', contentType);
    
    return true;
  } catch (error) {
    console.error('❌ PDF export test failed:', error.message);
    return false;
  }
}

async function testRegistersPDFExportWithFilters() {
  console.log('Testing registers PDF export with filters...');
  
  try {
    const params = new URLSearchParams({
      stage: 'APPROVED',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31'
    });
    
    const response = await fetch(`${API_BASE}/applications/registers/export-pdf?${params}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Response is not a PDF');
    }
    
    const pdfBuffer = await response.buffer();
    console.log('✅ Filtered PDF export successful');
    console.log('- PDF size:', pdfBuffer.length, 'bytes');
    
    return true;
  } catch (error) {
    console.error('❌ Filtered PDF export test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Registers API Tests...\n');
  
  const results = [];
  
  // Test 1: Applications API with current owner
  results.push(await testApplicationsWithCurrentOwner());
  console.log('');
  
  // Test 2: PDF export
  results.push(await testRegistersPDFExport());
  console.log('');
  
  // Test 3: PDF export with filters
  results.push(await testRegistersPDFExportWithFilters());
  console.log('');
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Registers implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testApplicationsWithCurrentOwner,
  testRegistersPDFExport,
  testRegistersPDFExportWithFilters,
  runTests
};
