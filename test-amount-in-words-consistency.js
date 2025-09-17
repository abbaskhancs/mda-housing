const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

// Helper function to login and get token
async function login(username, password) {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  if (response.success) {
    return response.data.token;
  }
  throw new Error(`Login failed: ${response.error}`);
}

async function testAmountInWordsConsistency() {
  console.log('🚀 TESTING AMOUNT-IN-WORDS CONSISTENCY');
  console.log('======================================\n');

  try {
    // Login as accounts officer
    const token = await login('accounts_officer', 'password123');

    // Get demo data
    const personsResponse = await apiRequest('GET', '/api/persons', null, token);
    const persons = personsResponse.data.persons;
    
    const plotsResponse = await apiRequest('GET', '/api/plots', null, token);
    const plots = plotsResponse.data.plots;

    // Create test application
    const applicationData = {
      sellerId: persons[0].id,
      buyerId: persons[1].id,
      plotId: plots[0].id,
      transferType: 'SALE',
      applicationDate: new Date().toISOString(),
      attachments: []
    };

    const createResponse = await apiRequest('POST', '/api/applications', applicationData, token);
    const applicationId = createResponse.data.application.id;
    console.log(`✅ Test application created: ${applicationId}`);

    // Test different amounts for consistency
    const testCases = [
      {
        name: 'Small Amount',
        feeHeads: { arrears: '1500', transferFee: '2500', additional: '1000' },
        expectedTotal: 5000
      },
      {
        name: 'Medium Amount',
        feeHeads: { arrears: '15000', surcharge: '5000', transferFee: '25000', water: '3000' },
        expectedTotal: 48000
      },
      {
        name: 'Large Amount',
        feeHeads: { arrears: '50000', surcharge: '15000', nonUser: '25000', transferFee: '100000', attorneyFee: '10000' },
        expectedTotal: 200000
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n💰 Testing ${testCase.name} (Total: ${testCase.expectedTotal})...`);

      // Update accounts breakdown
      const accountsResponse = await apiRequest('POST', `/api/applications/${applicationId}/accounts`, testCase.feeHeads, token);
      if (!accountsResponse.success) {
        throw new Error(`Failed to update accounts: ${accountsResponse.error}`);
      }

      const accountsBreakdown = accountsResponse.data.accountsBreakdown;
      console.log(`   Database Total: ${accountsBreakdown.totalAmount}`);
      console.log(`   Database Words: ${accountsBreakdown.totalAmountWords}`);

      // Verify total calculation
      if (Number(accountsBreakdown.totalAmount) !== testCase.expectedTotal) {
        throw new Error(`Total mismatch for ${testCase.name}: Expected ${testCase.expectedTotal}, Got ${accountsBreakdown.totalAmount}`);
      }

      // Generate challan
      const challanResponse = await apiRequest('POST', `/api/applications/${applicationId}/accounts/generate-challan`, {}, token);
      if (!challanResponse.success) {
        throw new Error(`Failed to generate challan: ${challanResponse.error}`);
      }

      console.log(`   Challan generated: ${challanResponse.data.challanNo}`);

      // Get updated breakdown to verify words are consistent
      const getAccountsResponse = await apiRequest('GET', `/api/applications/${applicationId}/accounts`, null, token);
      if (!getAccountsResponse.success) {
        throw new Error(`Failed to get accounts: ${getAccountsResponse.error}`);
      }

      const retrievedBreakdown = getAccountsResponse.data.accountsBreakdown;
      
      // Verify consistency
      if (retrievedBreakdown.totalAmountWords === accountsBreakdown.totalAmountWords) {
        console.log(`   ✅ Amount in words consistent: ${retrievedBreakdown.totalAmountWords}`);
      } else {
        throw new Error(`Amount in words inconsistency for ${testCase.name}`);
      }

      // Verify the words make sense for the amount
      const wordsContainAmount = retrievedBreakdown.totalAmountWords.includes('روپے');
      if (wordsContainAmount) {
        console.log(`   ✅ Words format is correct (contains 'روپے')`);
      } else {
        throw new Error(`Words format incorrect for ${testCase.name}: ${retrievedBreakdown.totalAmountWords}`);
      }
    }

    console.log('\n🎉 AMOUNT-IN-WORDS CONSISTENCY TEST PASSED!');
    console.log('✅ All amounts calculated correctly');
    console.log('✅ Amount-in-words generated consistently');
    console.log('✅ Words format is correct in Urdu');
    console.log('✅ Database and API responses are consistent');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testAmountInWordsConsistency();
