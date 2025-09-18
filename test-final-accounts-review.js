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

async function resetTestApplication() {
  console.log('🔄 Resetting test application to ACCOUNTS_CLEAR stage...');
  
  const testApplicationId = 'cmfoc8p8s002c1185bbu0obzl'; // Known test application
  
  // Get stages
  const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
  const stages = stagesResponse.data.stages || [];
  const stageMap = new Map(stages.map(s => [s.code, s.id]));
  
  // Move to ACCOUNTS_CLEAR stage
  try {
    await apiRequest('POST', `/api/workflow/applications/${testApplicationId}/transition`, {
      toStageId: stageMap.get('ACCOUNTS_CLEAR'),
      remarks: 'Test reset - moving to ACCOUNTS_CLEAR'
    }, tokens.admin);
    console.log('✅ Application moved to ACCOUNTS_CLEAR stage');
  } catch (error) {
    console.log('⚠️  Application might already be in ACCOUNTS_CLEAR stage');
  }
  
  // Clear any existing ACCOUNTS reviews
  try {
    const reviewsResponse = await apiRequest('GET', `/api/applications/${testApplicationId}/reviews`, null, tokens.admin);
    const reviews = reviewsResponse.data.reviews || [];
    const accountsReviews = reviews.filter(r => r.section.code === 'ACCOUNTS');
    
    for (const review of accountsReviews) {
      // Note: There's no delete review endpoint, so we'll just note existing reviews
      console.log(`⚠️  Existing ACCOUNTS review found: ${review.id} (${review.status})`);
    }
  } catch (error) {
    console.log('⚠️  Could not check existing reviews');
  }
  
  return testApplicationId;
}

async function testCompleteWorkflow(applicationId) {
  console.log('🎯 Testing complete "Mark Accounts Reviewed" workflow...\n');
  
  // Step 1: Check initial state
  console.log('📊 Step 1: Check initial state');
  const initialResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
  const initialApplication = initialResponse.data.application;
  console.log(`   Current stage: ${initialApplication.currentStage.name} (${initialApplication.currentStage.code})`);
  
  if (initialApplication.currentStage.code !== 'ACCOUNTS_CLEAR') {
    console.log('❌ Application is not in ACCOUNTS_CLEAR stage');
    return false;
  }
  
  // Step 2: Check available transitions before review
  console.log('\n📊 Step 2: Check available transitions before review');
  const transitionsBeforeResponse = await apiRequest('GET', `/api/workflow/transitions/ACCOUNTS_CLEAR?applicationId=${applicationId}&dryRun=true`, null, tokens.admin);
  const transitionsBefore = transitionsBeforeResponse.data.transitions || [];
  console.log(`   Available transitions: ${transitionsBefore.length}`);
  
  const readyForApprovalBefore = transitionsBefore.find(t => t.toStage.code === 'READY_FOR_APPROVAL');
  const owoReviewAccountsBefore = transitionsBefore.find(t => t.toStage.code === 'OWO_REVIEW_ACCOUNTS');
  
  console.log(`   READY_FOR_APPROVAL: ${readyForApprovalBefore ? (readyForApprovalBefore.guardResult?.canTransition ? 'Available' : 'Blocked') : 'Not found'}`);
  console.log(`   OWO_REVIEW_ACCOUNTS: ${owoReviewAccountsBefore ? (owoReviewAccountsBefore.guardResult?.canTransition ? 'Available' : 'Blocked') : 'Not found'}`);
  
  // Step 3: Create ACCOUNTS review (Mark Accounts Reviewed)
  console.log('\n📝 Step 3: Create ACCOUNTS review (Mark Accounts Reviewed)');
  
  // Get ACCOUNTS section ID
  const sectionsResponse = await apiRequest('GET', '/api/workflow/sections', null, tokens.admin);
  const sections = sectionsResponse.data.sections || [];
  const accountsSection = sections.find(s => s.code === 'ACCOUNTS');
  
  if (!accountsSection) {
    console.log('❌ ACCOUNTS section not found');
    return false;
  }
  
  const reviewResponse = await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
    sectionId: accountsSection.id,
    remarks: 'Accounts clearance reviewed and approved by OWO',
    status: 'APPROVED',
    autoTransition: true
  }, tokens.owo);
  
  console.log('✅ ACCOUNTS review created successfully');
  
  if (reviewResponse.data.autoTransition) {
    console.log('✅ Auto-transition occurred:');
    console.log(`   From: ${reviewResponse.data.autoTransition.fromStage.name}`);
    console.log(`   To: ${reviewResponse.data.autoTransition.toStage.name}`);
  } else {
    console.log('❌ No auto-transition occurred');
    return false;
  }
  
  // Step 4: Verify new stage
  console.log('\n📊 Step 4: Verify new stage');
  const afterReviewResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
  const afterReviewApplication = afterReviewResponse.data.application;
  console.log(`   Current stage: ${afterReviewApplication.currentStage.name} (${afterReviewApplication.currentStage.code})`);
  
  if (afterReviewApplication.currentStage.code !== 'OWO_REVIEW_ACCOUNTS') {
    console.log('❌ Application did not move to OWO_REVIEW_ACCOUNTS stage');
    return false;
  }
  
  // Step 5: Check available transitions after review
  console.log('\n📊 Step 5: Check available transitions after review');
  const transitionsAfterResponse = await apiRequest('GET', `/api/workflow/transitions/OWO_REVIEW_ACCOUNTS?applicationId=${applicationId}&dryRun=true`, null, tokens.admin);
  const transitionsAfter = transitionsAfterResponse.data.transitions || [];
  console.log(`   Available transitions: ${transitionsAfter.length}`);
  
  const readyForApprovalAfter = transitionsAfter.find(t => t.toStage.code === 'READY_FOR_APPROVAL');
  console.log(`   READY_FOR_APPROVAL: ${readyForApprovalAfter ? (readyForApprovalAfter.guardResult?.canTransition ? 'Available ✅' : 'Blocked ❌') : 'Not found ❌'}`);
  
  if (!readyForApprovalAfter || !readyForApprovalAfter.guardResult?.canTransition) {
    console.log('❌ READY_FOR_APPROVAL transition is not available');
    return false;
  }
  
  // Step 6: Test transition to READY_FOR_APPROVAL
  console.log('\n🔄 Step 6: Test transition to READY_FOR_APPROVAL');
  const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
  const stages = stagesResponse.data.stages || [];
  const readyForApprovalStage = stages.find(s => s.code === 'READY_FOR_APPROVAL');
  
  const finalTransitionResponse = await apiRequest('POST', `/api/workflow/applications/${applicationId}/transition`, {
    toStageId: readyForApprovalStage.id,
    remarks: 'OWO review for Accounts completed - ready for approval'
  }, tokens.owo);
  
  console.log('✅ Transition to READY_FOR_APPROVAL successful!');
  console.log(`   Final stage: ${finalTransitionResponse.data.application.currentStage.name}`);
  
  return true;
}

async function runTest() {
  console.log('🚀 Starting Final "Mark Accounts Reviewed" Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.owo = await login('owo');
    console.log('✅ Login successful\n');
    
    // Reset test application
    const applicationId = await resetTestApplication();
    console.log('');
    
    // Test complete workflow
    const success = await testCompleteWorkflow(applicationId);
    console.log('');
    
    // Final results
    if (success) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ "Mark Accounts Reviewed" functionality is working correctly');
      console.log('✅ Review row appears');
      console.log('✅ Stage updates to OWO_REVIEW_ACCOUNTS');
      console.log('✅ Auto-transition occurs');
      console.log('✅ READY_FOR_APPROVAL becomes available');
      console.log('✅ Final transition to READY_FOR_APPROVAL works');
    } else {
      console.log('❌ SOME TESTS FAILED!');
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
