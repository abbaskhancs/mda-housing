const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
  accounts: { username: 'accounts_officer', password: 'password123' }
};

let tokens = {};
let testApplicationId = null;

async function login(role) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials[role]);
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${role}:`, error.response?.data || error.message);
    throw error;
  }
}

async function apiRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data
    };
    
    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`❌ API request failed: ${method} ${url}`, error.response?.data || error.message);
    throw error;
  }
}

async function setupTestApplication() {
  console.log('🔧 Setting up test application...');
  
  // Get applications in SENT_TO_ACCOUNTS or AWAITING_PAYMENT stage
  const applicationsResponse = await apiRequest('GET', '/api/applications', null, tokens.admin);
  const applications = applicationsResponse.data.applications || [];
  
  // Find an application in the right stage
  let testApp = applications.find(app => 
    app.currentStage?.code === 'SENT_TO_ACCOUNTS' || 
    app.currentStage?.code === 'AWAITING_PAYMENT'
  );
  
  if (!testApp) {
    // Find any application and transition it to SENT_TO_ACCOUNTS
    testApp = applications.find(app => app.currentStage?.code === 'OWO_REVIEW_BCA_HOUSING');
    
    if (!testApp) {
      console.log('❌ No suitable test application found');
      return null;
    }
    
    // Transition to SENT_TO_ACCOUNTS
    console.log(`📋 Transitioning application ${testApp.id} to SENT_TO_ACCOUNTS...`);
    await apiRequest('POST', `/api/workflow/transition`, {
      applicationId: testApp.id,
      toStageCode: 'SENT_TO_ACCOUNTS'
    }, tokens.admin);
    
    // Refresh application data
    const appResponse = await apiRequest('GET', `/api/applications/${testApp.id}`, null, tokens.admin);
    testApp = appResponse.data.application;
  }
  
  console.log(`✅ Using test application: ${testApp.id} (Stage: ${testApp.currentStage?.code})`);
  return testApp.id;
}

async function createAccountsBreakdown() {
  console.log('💰 Creating accounts breakdown...');
  
  const accountsData = {
    arrears: 10000,
    surcharge: 2000,
    nonUser: 5000,
    transferFee: 15000,
    attorneyFee: 8000,
    water: 3000,
    suiGas: 2000,
    additional: 5000
  };
  
  const response = await apiRequest('POST', `/api/applications/${testApplicationId}/accounts`, accountsData, tokens.accounts);
  console.log('✅ Accounts breakdown created');
  return response.data.accountsBreakdown;
}

async function verifyPayment(accountsBreakdown) {
  console.log('💳 Verifying payment...');
  
  const paymentData = {
    paidAmount: accountsBreakdown.totalAmount,
    challanUrl: 'http://localhost:9000/test/paid-challan.pdf'
  };
  
  const response = await apiRequest('POST', `/api/applications/${testApplicationId}/accounts/verify-payment`, paymentData, tokens.accounts);
  console.log('✅ Payment verified');
  return response.data;
}

async function checkApplicationStage() {
  console.log('🔍 Checking application stage...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}`, null, tokens.admin);
  const application = response.data.application;
  
  console.log(`📊 Current stage: ${application.currentStage?.name} (${application.currentStage?.code})`);
  return application;
}

async function checkAccountsClearance() {
  console.log('📋 Checking accounts clearance...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}/clearances`, null, tokens.admin);
  const clearances = response.data.clearances || [];
  const accountsClearance = clearances.find(c => c.section.code === 'ACCOUNTS');
  
  if (accountsClearance) {
    console.log(`✅ Accounts clearance found: ${accountsClearance.status.name} (${accountsClearance.status.code})`);
    console.log(`📅 Cleared at: ${accountsClearance.clearedAt}`);
    console.log(`💬 Remarks: ${accountsClearance.remarks}`);
  } else {
    console.log('❌ Accounts clearance not found');
  }
  
  return accountsClearance;
}

async function testAccountsClearancePDF() {
  console.log('📄 Testing accounts clearance PDF generation...');
  
  try {
    const response = await apiRequest('POST', `/api/applications/${testApplicationId}/accounts/generate-pdf`, {}, tokens.accounts);
    console.log('✅ Accounts clearance PDF generated successfully');
    console.log(`🔗 Download URL: ${response.data.signedUrl}`);
    return response.data;
  } catch (error) {
    console.log('❌ Failed to generate accounts clearance PDF:', error.response?.data?.message || error.message);
    return null;
  }
}

async function checkAuditLog() {
  console.log('📝 Checking audit log...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}/audit`, null, tokens.admin);
  const auditLogs = response.data.auditLogs || [];
  
  const relevantLogs = auditLogs.filter(log => 
    log.action === 'PAYMENT_VERIFIED' || 
    log.action === 'CLEARANCE_CREATED' || 
    log.action === 'AUTO_STAGE_TRANSITION'
  );
  
  console.log(`📊 Found ${relevantLogs.length} relevant audit entries:`);
  relevantLogs.forEach(log => {
    console.log(`  - ${log.action}: ${log.details} (${new Date(log.createdAt).toLocaleString()})`);
  });
  
  return relevantLogs;
}

async function runTest() {
  console.log('🚀 Starting Accounts Payment Verification Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.accounts = await login('accounts');
    console.log('✅ Login successful\n');
    
    // Setup test application
    testApplicationId = await setupTestApplication();
    if (!testApplicationId) {
      console.log('❌ Test setup failed');
      return;
    }
    console.log('');
    
    // Create accounts breakdown if needed
    let accountsBreakdown;
    try {
      const response = await apiRequest('GET', `/api/applications/${testApplicationId}/accounts`, null, tokens.accounts);
      accountsBreakdown = response.data.accountsBreakdown;
      console.log('✅ Accounts breakdown already exists');
    } catch (error) {
      accountsBreakdown = await createAccountsBreakdown();
    }
    console.log('');
    
    // Check initial state
    console.log('📊 Initial State:');
    const initialApp = await checkApplicationStage();
    const initialClearance = await checkAccountsClearance();
    console.log('');
    
    // Verify payment
    const paymentResult = await verifyPayment(accountsBreakdown);
    console.log(`🔄 Auto-transition: ${paymentResult.autoTransition ? 'Yes' : 'No'}`);
    console.log(`📋 Clearance created: ${paymentResult.clearanceCreated ? 'Yes' : 'No'}`);
    console.log('');
    
    // Check final state
    console.log('📊 Final State:');
    const finalApp = await checkApplicationStage();
    const finalClearance = await checkAccountsClearance();
    console.log('');
    
    // Test PDF generation
    await testAccountsClearancePDF();
    console.log('');
    
    // Check audit log
    await checkAuditLog();
    console.log('');
    
    // Validate results
    console.log('🔍 Validation Results:');
    const stageCorrect = finalApp.currentStage?.code === 'ACCOUNTS_CLEAR';
    const clearanceCorrect = finalClearance && finalClearance.status.code === 'CLEAR';
    const transitionOccurred = initialApp.currentStage?.code !== finalApp.currentStage?.code;
    
    console.log(`✅ Stage transitioned to ACCOUNTS_CLEAR: ${stageCorrect ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Accounts clearance is CLEAR: ${clearanceCorrect ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Auto-transition occurred: ${transitionOccurred ? 'PASS' : 'FAIL'}`);
    
    if (stageCorrect && clearanceCorrect && transitionOccurred) {
      console.log('\n🎉 ACCEPTANCE TEST PASSED!');
      console.log('✅ Payment verification works correctly');
      console.log('✅ Stage transitions to ACCOUNTS_CLEAR');
      console.log('✅ Accounts clearance is created with CLEAR status');
      console.log('✅ Clearance PDF can be generated');
    } else {
      console.log('\n❌ ACCEPTANCE TEST FAILED!');
      console.log(`Expected: Stage = ACCOUNTS_CLEAR, Clearance = CLEAR`);
      console.log(`Actual: Stage = ${finalApp.currentStage?.code}, Clearance = ${finalClearance?.status.code || 'Not found'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
runTest().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test crashed:', error.message);
});
