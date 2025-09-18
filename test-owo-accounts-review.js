const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
  owo: { username: 'owo_officer', password: 'password123' }
};

let tokens = {};
const testApplicationId = 'cmfoc8p8s002c1185bbu0obzl'; // From previous test

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

async function checkCurrentState() {
  console.log('🔍 Checking current application state...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}`, null, tokens.admin);
  const application = response.data.application;
  
  console.log(`📊 Current stage: ${application.currentStage?.name} (${application.currentStage?.code})`);
  
  // Check reviews
  const reviewsResponse = await apiRequest('GET', `/api/applications/${testApplicationId}/reviews`, null, tokens.admin);
  const reviews = reviewsResponse.data.reviews || [];
  
  console.log(`📝 Reviews: ${reviews.length}`);
  reviews.forEach(review => {
    console.log(`  - ${review.section.name} (${review.section.code}): ${review.status}`);
  });
  
  return { application, reviews };
}

async function checkAvailableTransitions() {
  console.log('🔄 Checking available transitions from OWO_REVIEW_ACCOUNTS...');
  
  try {
    const response = await apiRequest('GET', `/api/workflow/transitions/OWO_REVIEW_ACCOUNTS?applicationId=${testApplicationId}&dryRun=true`, null, tokens.admin);
    const transitions = response.data.transitions || [];
    
    console.log(`🔄 Available transitions: ${transitions.length}`);
    transitions.forEach(transition => {
      console.log(`  - To: ${transition.toStage.name} (${transition.toStage.code})`);
      console.log(`    Guard: ${transition.guardName}`);
      if (transition.guardResult) {
        console.log(`    Can transition: ${transition.guardResult.canTransition}`);
        console.log(`    Reason: ${transition.guardResult.reason}`);
      }
    });
    
    return transitions;
  } catch (error) {
    console.log('❌ Failed to get transitions:', error.response?.data?.message || error.message);
    return [];
  }
}

async function testTransitionToReadyForApproval() {
  console.log('🔄 Testing transition to READY_FOR_APPROVAL...');
  
  try {
    // Get READY_FOR_APPROVAL stage ID
    const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
    const stages = stagesResponse.data.stages || [];
    const readyForApprovalStage = stages.find(s => s.code === 'READY_FOR_APPROVAL');
    
    if (!readyForApprovalStage) {
      throw new Error('READY_FOR_APPROVAL stage not found');
    }
    
    console.log(`📊 READY_FOR_APPROVAL stage ID: ${readyForApprovalStage.id}`);
    
    // Attempt transition
    const transitionResponse = await apiRequest('POST', `/api/workflow/applications/${testApplicationId}/transition`, {
      toStageId: readyForApprovalStage.id,
      remarks: 'OWO review for Accounts completed - ready for approval'
    }, tokens.owo);
    
    console.log('✅ Transition to READY_FOR_APPROVAL successful!');
    console.log(`📊 New stage: ${transitionResponse.data.application.currentStage.name} (${transitionResponse.data.application.currentStage.code})`);
    
    return transitionResponse.data;
    
  } catch (error) {
    console.log('❌ Transition failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('📋 Error details:', JSON.stringify(error.response.data.details, null, 2));
    }
    return null;
  }
}

async function runTest() {
  console.log('🚀 Starting OWO Accounts Review Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.owo = await login('owo');
    console.log('✅ Login successful\n');
    
    // Check current state
    const { application, reviews } = await checkCurrentState();
    console.log('');
    
    // Check if application is in OWO_REVIEW_ACCOUNTS stage
    if (application.currentStage.code !== 'OWO_REVIEW_ACCOUNTS') {
      console.log(`❌ Application is not in OWO_REVIEW_ACCOUNTS stage (currently: ${application.currentStage.code})`);
      console.log('⚠️  This test requires the application to be in OWO_REVIEW_ACCOUNTS stage');
      return;
    }
    
    // Check available transitions
    const transitions = await checkAvailableTransitions();
    console.log('');
    
    // Test transition to READY_FOR_APPROVAL
    const transitionResult = await testTransitionToReadyForApproval();
    console.log('');
    
    if (transitionResult) {
      // Check final state
      console.log('📋 After transition:');
      await checkCurrentState();
      console.log('');
      
      console.log('🎉 OWO ACCOUNTS REVIEW TEST COMPLETED!');
      console.log('✅ Transition to READY_FOR_APPROVAL successful');
      console.log('✅ Application is now ready for final approval');
    } else {
      console.log('❌ OWO ACCOUNTS REVIEW TEST FAILED!');
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
