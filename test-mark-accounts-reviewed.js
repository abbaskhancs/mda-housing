const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
  owo: { username: 'owo_officer', password: 'password123' },
  accounts: { username: 'accounts_officer', password: 'password123' }
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

async function createTestApplication() {
  console.log('🔧 Creating test application...');
  
  // Get required data
  const [personsResponse, plotsResponse] = await Promise.all([
    apiRequest('GET', '/api/persons', null, tokens.admin),
    apiRequest('GET', '/api/plots', null, tokens.admin)
  ]);
  
  const persons = personsResponse.data.persons || [];
  const plots = plotsResponse.data.plots || [];
  
  if (persons.length < 2) {
    throw new Error('Need at least 2 persons for testing');
  }
  
  if (plots.length < 1) {
    throw new Error('Need at least 1 plot for testing');
  }
  
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
  
  return applicationId;
}

async function setupApplicationInAccountsClear(applicationId) {
  console.log('🔧 Setting up application in ACCOUNTS_CLEAR stage...');
  
  // Get section and status maps
  const [sectionsResponse, statusesResponse, stagesResponse] = await Promise.all([
    apiRequest('GET', '/api/workflow/sections', null, tokens.admin),
    apiRequest('GET', '/api/workflow/statuses', null, tokens.admin),
    apiRequest('GET', '/api/workflow/stages', null, tokens.admin)
  ]);
  
  const sections = sectionsResponse.data.sections || [];
  const statuses = statusesResponse.data.statuses || [];
  const stages = stagesResponse.data.stages || [];
  
  const sectionMap = new Map(sections.map(s => [s.code, s.id]));
  const statusMap = new Map(statuses.map(s => [s.code, s.id]));
  const stageMap = new Map(stages.map(s => [s.code, s.id]));
  
  // Create ACCOUNTS clearance
  await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
    sectionId: sectionMap.get('ACCOUNTS'),
    statusId: statusMap.get('CLEAR'),
    remarks: 'Accounts clearance approved for testing'
  }, tokens.accounts);
  console.log('✅ ACCOUNTS clearance created');
  
  // Manually set stage to ACCOUNTS_CLEAR (simulating the payment verification process)
  await apiRequest('POST', `/api/workflow/applications/${applicationId}/transition`, {
    toStageId: stageMap.get('ACCOUNTS_CLEAR'),
    remarks: 'Test setup - moving to ACCOUNTS_CLEAR'
  }, tokens.admin);
  console.log('✅ Application moved to ACCOUNTS_CLEAR stage');
  
  return { sectionMap, statusMap, stageMap };
}

async function testMarkAccountsReviewed(applicationId, sectionMap) {
  console.log('📝 Testing "Mark Accounts Reviewed" functionality...');
  
  // Check initial state
  console.log('📊 Initial state:');
  const initialResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
  const initialApplication = initialResponse.data.application;
  console.log(`   Stage: ${initialApplication.currentStage.name} (${initialApplication.currentStage.code})`);
  
  // Check initial reviews
  const initialReviewsResponse = await apiRequest('GET', `/api/applications/${applicationId}/reviews`, null, tokens.admin);
  const initialReviews = initialReviewsResponse.data.reviews || [];
  console.log(`   Reviews: ${initialReviews.length}`);
  
  // Check available transitions before review
  const transitionsBeforeResponse = await apiRequest('GET', `/api/workflow/transitions/ACCOUNTS_CLEAR?applicationId=${applicationId}&dryRun=true`, null, tokens.admin);
  const transitionsBefore = transitionsBeforeResponse.data.transitions || [];
  console.log(`   Available transitions: ${transitionsBefore.length}`);
  transitionsBefore.forEach(t => {
    console.log(`     - To: ${t.toStage.name} (Can transition: ${t.guardResult?.canTransition})`);
  });
  
  // Create ACCOUNTS review (Mark Accounts Reviewed)
  console.log('\n📝 Creating ACCOUNTS review (Mark Accounts Reviewed)...');
  const reviewResponse = await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
    sectionId: sectionMap.get('ACCOUNTS'),
    remarks: 'Accounts clearance reviewed and approved by OWO',
    status: 'APPROVED',
    autoTransition: true // Enable auto-transition
  }, tokens.owo);
  
  console.log('✅ ACCOUNTS review created successfully');
  console.log(`   Review ID: ${reviewResponse.data.review.id}`);
  
  if (reviewResponse.data.autoTransition) {
    console.log('✅ Auto-transition occurred:');
    console.log(`   From: ${reviewResponse.data.autoTransition.fromStage.name}`);
    console.log(`   To: ${reviewResponse.data.autoTransition.toStage.name}`);
  }
  
  // Check final state
  console.log('\n📊 Final state:');
  const finalResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
  const finalApplication = finalResponse.data.application;
  console.log(`   Stage: ${finalApplication.currentStage.name} (${finalApplication.currentStage.code})`);
  
  // Check final reviews
  const finalReviewsResponse = await apiRequest('GET', `/api/applications/${applicationId}/reviews`, null, tokens.admin);
  const finalReviews = finalReviewsResponse.data.reviews || [];
  console.log(`   Reviews: ${finalReviews.length}`);
  finalReviews.forEach(r => {
    console.log(`     - ${r.section.name} (${r.section.code}): ${r.status}`);
  });
  
  // Check available transitions after review (from OWO_REVIEW_ACCOUNTS)
  const transitionsAfterResponse = await apiRequest('GET', `/api/workflow/transitions/OWO_REVIEW_ACCOUNTS?applicationId=${applicationId}&dryRun=true`, null, tokens.admin);
  const transitionsAfter = transitionsAfterResponse.data.transitions || [];
  console.log(`   Available transitions: ${transitionsAfter.length}`);
  transitionsAfter.forEach(t => {
    console.log(`     - To: ${t.toStage.name} (Can transition: ${t.guardResult?.canTransition})`);
    if (t.toStage.code === 'READY_FOR_APPROVAL') {
      console.log(`       ✅ READY_FOR_APPROVAL is available!`);
    }
  });
  
  return {
    initialStage: initialApplication.currentStage.code,
    finalStage: finalApplication.currentStage.code,
    reviewCreated: finalReviews.length > initialReviews.length,
    autoTransitionOccurred: !!reviewResponse.data.autoTransition,
    readyForApprovalAvailable: transitionsAfter.some(t => t.toStage.code === 'READY_FOR_APPROVAL' && t.guardResult?.canTransition)
  };
}

async function runTest() {
  console.log('🚀 Starting "Mark Accounts Reviewed" Acceptance Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.owo = await login('owo');
    tokens.accounts = await login('accounts');
    console.log('✅ Login successful\n');
    
    // Create test application
    const applicationId = await createTestApplication();
    console.log('');
    
    // Setup application in ACCOUNTS_CLEAR stage
    const { sectionMap } = await setupApplicationInAccountsClear(applicationId);
    console.log('');
    
    // Test Mark Accounts Reviewed functionality
    const testResults = await testMarkAccountsReviewed(applicationId, sectionMap);
    console.log('');
    
    // Validate acceptance criteria
    console.log('🎯 Acceptance Test Results:');
    console.log(`   ✅ Review row appears: ${testResults.reviewCreated ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Stage updates: ${testResults.finalStage === 'OWO_REVIEW_ACCOUNTS' ? 'PASS' : 'FAIL'} (${testResults.initialStage} → ${testResults.finalStage})`);
    console.log(`   ✅ Auto-transition occurred: ${testResults.autoTransitionOccurred ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ READY_FOR_APPROVAL available: ${testResults.readyForApprovalAvailable ? 'PASS' : 'FAIL'}`);
    
    const allTestsPassed = testResults.reviewCreated && 
                          testResults.finalStage === 'OWO_REVIEW_ACCOUNTS' && 
                          testResults.autoTransitionOccurred && 
                          testResults.readyForApprovalAvailable;
    
    console.log('');
    if (allTestsPassed) {
      console.log('🎉 ALL ACCEPTANCE TESTS PASSED!');
      console.log('✅ "Mark Accounts Reviewed" functionality is working correctly');
    } else {
      console.log('❌ SOME ACCEPTANCE TESTS FAILED!');
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
