const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
  owo: { username: 'owo_officer', password: 'password123' }
};

let tokens = {};

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

async function createTestApplicationInAccountsClear() {
  console.log('🔧 Creating test application in ACCOUNTS_CLEAR stage...');
  
  // Get required data
  const [personsResponse, plotsResponse, sectionsResponse, statusesResponse, stagesResponse] = await Promise.all([
    apiRequest('GET', '/api/persons', null, tokens.admin),
    apiRequest('GET', '/api/plots', null, tokens.admin),
    apiRequest('GET', '/api/workflow/sections', null, tokens.admin),
    apiRequest('GET', '/api/workflow/statuses', null, tokens.admin),
    apiRequest('GET', '/api/workflow/stages', null, tokens.admin)
  ]);
  
  const persons = personsResponse.data.persons || [];
  const plots = plotsResponse.data.plots || [];
  const sections = sectionsResponse.data.sections || [];
  const statuses = statusesResponse.data.statuses || [];
  const stages = stagesResponse.data.stages || [];
  
  const sectionMap = new Map(sections.map(s => [s.code, s.id]));
  const statusMap = new Map(statuses.map(s => [s.code, s.id]));
  const stageMap = new Map(stages.map(s => [s.code, s.id]));
  
  // Create application
  const applicationData = {
    sellerId: persons[0].id,
    buyerId: persons[1].id,
    plotId: plots[0].id,
    transferType: 'SALE',
    applicationDate: new Date().toISOString(),
    attachments: []
  };
  
  const createResponse = await apiRequest('POST', '/api/applications', applicationData, tokens.admin);
  const applicationId = createResponse.data.application.id;
  console.log(`✅ Test application created: ${applicationId}`);
  
  // Create ACCOUNTS clearance
  await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
    sectionId: sectionMap.get('ACCOUNTS'),
    statusId: statusMap.get('CLEAR'),
    remarks: 'Accounts clearance approved for testing'
  }, tokens.admin);
  console.log('✅ ACCOUNTS clearance created');
  
  // Create accounts breakdown with string values
  await apiRequest('POST', `/api/applications/${applicationId}/accounts`, {
    arrears: '1000',
    surcharge: '100',
    nonUser: '500',
    transferFee: '2000',
    attorneyFee: '1000',
    water: '200',
    suiGas: '300',
    additional: '0'
  }, tokens.admin);
  console.log('✅ Accounts breakdown created');
  
  // Verify payment to move to ACCOUNTS_CLEAR
  await apiRequest('POST', `/api/applications/${applicationId}/accounts/verify-payment`, {
    challanNumber: 'TEST-' + Date.now(),
    paidAmount: 5100,
    remarks: 'Test payment verification'
  }, tokens.admin);
  console.log('✅ Payment verified - should be in ACCOUNTS_CLEAR stage');
  
  return applicationId;
}

async function testAcceptanceCriteria(applicationId) {
  console.log('\n🎯 Testing Acceptance Criteria...\n');
  
  // Check initial state
  console.log('📊 Initial State Check:');
  const initialResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
  const initialApplication = initialResponse.data.application;
  console.log(`   Current stage: ${initialApplication.currentStage.name} (${initialApplication.currentStage.code})`);
  
  if (initialApplication.currentStage.code !== 'ACCOUNTS_CLEAR') {
    console.log('❌ Application is not in ACCOUNTS_CLEAR stage - cannot proceed with test');
    return false;
  }
  
  // Check initial reviews
  const initialReviewsResponse = await apiRequest('GET', `/api/applications/${applicationId}/reviews`, null, tokens.admin);
  const initialReviews = initialReviewsResponse.data.reviews || [];
  console.log(`   Initial reviews: ${initialReviews.length}`);
  
  // ACCEPTANCE TEST 1: Create ACCOUNTS review (Mark Accounts Reviewed)
  console.log('\n✅ ACCEPTANCE TEST 1: Review row appears');
  
  const sectionsResponse = await apiRequest('GET', '/api/workflow/sections', null, tokens.admin);
  const sections = sectionsResponse.data.sections || [];
  const accountsSection = sections.find(s => s.code === 'ACCOUNTS');
  
  const reviewResponse = await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
    sectionId: accountsSection.id,
    remarks: 'Accounts clearance reviewed and approved by OWO',
    status: 'APPROVED',
    autoTransition: true
  }, tokens.owo);
  
  console.log('   ✅ ACCOUNTS review created successfully');
  console.log(`   Review ID: ${reviewResponse.data.review.id}`);
  
  // Verify review row appears
  const afterReviewsResponse = await apiRequest('GET', `/api/applications/${applicationId}/reviews`, null, tokens.admin);
  const afterReviews = afterReviewsResponse.data.reviews || [];
  const accountsReview = afterReviews.find(r => r.section.code === 'ACCOUNTS');
  
  if (accountsReview) {
    console.log('   ✅ Review row appears: ACCOUNTS review found');
  } else {
    console.log('   ❌ Review row does not appear');
    return false;
  }
  
  // ACCEPTANCE TEST 2: Stage updates
  console.log('\n✅ ACCEPTANCE TEST 2: Stage updates');
  
  if (reviewResponse.data.autoTransition) {
    console.log('   ✅ Auto-transition occurred:');
    console.log(`   From: ${reviewResponse.data.autoTransition.fromStage.name}`);
    console.log(`   To: ${reviewResponse.data.autoTransition.toStage.name}`);
    
    if (reviewResponse.data.autoTransition.toStage.code === 'OWO_REVIEW_ACCOUNTS') {
      console.log('   ✅ Stage updates to OWO_REVIEW_ACCOUNTS');
    } else {
      console.log('   ❌ Stage did not update to OWO_REVIEW_ACCOUNTS');
      return false;
    }
  } else {
    console.log('   ❌ No auto-transition occurred');
    return false;
  }
  
  // ACCEPTANCE TEST 3: READY_FOR_APPROVAL becomes available
  console.log('\n✅ ACCEPTANCE TEST 3: READY_FOR_APPROVAL becomes available');
  
  const transitionsResponse = await apiRequest('GET', `/api/workflow/transitions/OWO_REVIEW_ACCOUNTS?applicationId=${applicationId}&dryRun=true`, null, tokens.admin);
  const transitions = transitionsResponse.data.transitions || [];
  
  console.log(`   Available transitions from OWO_REVIEW_ACCOUNTS: ${transitions.length}`);
  transitions.forEach(t => {
    console.log(`     - To: ${t.toStage.name} (${t.toStage.code})`);
    console.log(`       Can transition: ${t.guardResult?.canTransition}`);
    console.log(`       Reason: ${t.guardResult?.reason}`);
  });
  
  const readyForApprovalTransition = transitions.find(t => t.toStage.code === 'READY_FOR_APPROVAL');
  
  if (readyForApprovalTransition && readyForApprovalTransition.guardResult?.canTransition) {
    console.log('   ✅ READY_FOR_APPROVAL is available (dry-run transitions reports available)');
    console.log('   ✅ "Send to Housing Officer" button would be enabled');
  } else {
    console.log('   ❌ READY_FOR_APPROVAL is not available');
    return false;
  }
  
  return true;
}

async function runAcceptanceTest() {
  console.log('🚀 Starting "Mark Accounts Reviewed" Acceptance Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.owo = await login('owo');
    console.log('✅ Login successful\n');
    
    // Create test application
    const applicationId = await createTestApplicationInAccountsClear();
    
    // Test acceptance criteria
    const success = await testAcceptanceCriteria(applicationId);
    
    console.log('\n🎯 FINAL RESULTS:');
    
    if (success) {
      console.log('🎉 ALL ACCEPTANCE TESTS PASSED!');
      console.log('');
      console.log('✅ Acceptance Criteria Validated:');
      console.log('   ✅ Review row appears');
      console.log('   ✅ Stage updates (ACCOUNTS_CLEAR → OWO_REVIEW_ACCOUNTS)');
      console.log('   ✅ READY_FOR_APPROVAL becomes available');
      console.log('   ✅ "Send to Housing Officer" button would be enabled');
      console.log('');
      console.log('🎯 Task 11 - OWO review for Accounts: COMPLETE');
    } else {
      console.log('❌ SOME ACCEPTANCE TESTS FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
runAcceptanceTest().then(() => {
  console.log('\n🏁 Acceptance test completed');
}).catch(error => {
  console.error('💥 Test crashed:', error.message);
});
