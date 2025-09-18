const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
  owo: { username: 'owo_officer', password: 'password123' },
  accounts: { username: 'accounts_officer', password: 'password123' }
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
  
  // Check clearances
  const clearancesResponse = await apiRequest('GET', `/api/applications/${testApplicationId}/clearances`, null, tokens.admin);
  const clearances = clearancesResponse.data.clearances || [];
  
  console.log(`📋 Clearances: ${clearances.length}`);
  clearances.forEach(clearance => {
    console.log(`  - ${clearance.section.name} (${clearance.section.code}): ${clearance.status.name} (${clearance.status.code})`);
  });
  
  // Check reviews
  const reviewsResponse = await apiRequest('GET', `/api/applications/${testApplicationId}/reviews`, null, tokens.admin);
  const reviews = reviewsResponse.data.reviews || [];
  
  console.log(`📝 Reviews: ${reviews.length}`);
  reviews.forEach(review => {
    console.log(`  - ${review.section.name} (${review.section.code}): ${review.status}`);
  });
  
  return { application, clearances, reviews };
}

async function checkAvailableTransitions() {
  console.log('🔄 Checking available transitions...');
  
  try {
    const response = await apiRequest('GET', `/api/workflow/transitions/ACCOUNTS_CLEAR?applicationId=${testApplicationId}&dryRun=true`, null, tokens.admin);
    const transitions = response.data.transitions || [];
    
    console.log(`🔄 Available transitions from ACCOUNTS_CLEAR: ${transitions.length}`);
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

async function createAccountsReview() {
  console.log('📝 Creating ACCOUNTS review...');
  
  try {
    // Get ACCOUNTS section ID
    const sectionsResponse = await apiRequest('GET', '/api/workflow/sections', null, tokens.admin);
    const sections = sectionsResponse.data.sections || [];
    const accountsSection = sections.find(s => s.code === 'ACCOUNTS');
    
    if (!accountsSection) {
      throw new Error('ACCOUNTS section not found');
    }
    
    console.log(`📋 ACCOUNTS section ID: ${accountsSection.id}`);
    
    // Create ACCOUNTS review
    const reviewResponse = await apiRequest('POST', `/api/applications/${testApplicationId}/reviews`, {
      sectionId: accountsSection.id,
      remarks: 'Accounts clearance reviewed and approved by OWO',
      status: 'APPROVED',
      autoTransition: true // Enable auto-transition
    }, tokens.owo);
    
    console.log('✅ ACCOUNTS review created successfully');
    console.log(`📝 Review ID: ${reviewResponse.data.review.id}`);
    
    if (reviewResponse.data.autoTransition) {
      console.log('🔄 Auto-transition occurred:');
      console.log(`  From: ${reviewResponse.data.autoTransition.fromStage.name}`);
      console.log(`  To: ${reviewResponse.data.autoTransition.toStage.name}`);
    } else {
      console.log('❌ No auto-transition occurred');
    }
    
    return reviewResponse.data;
    
  } catch (error) {
    console.log('❌ Failed to create ACCOUNTS review:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('📋 Error details:', JSON.stringify(error.response.data.details, null, 2));
    }
    return null;
  }
}

async function runTest() {
  console.log('🚀 Starting Accounts Review Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.owo = await login('owo');
    tokens.accounts = await login('accounts');
    console.log('✅ Login successful\n');
    
    // Check current state
    const { application, clearances, reviews } = await checkCurrentState();
    console.log('');
    
    // Check if application is in ACCOUNTS_CLEAR stage
    if (application.currentStage.code !== 'ACCOUNTS_CLEAR') {
      console.log(`❌ Application is not in ACCOUNTS_CLEAR stage (currently: ${application.currentStage.code})`);
      console.log('⚠️  This test requires the application to be in ACCOUNTS_CLEAR stage');
      return;
    }
    
    // Check available transitions before creating review
    console.log('📋 Before creating ACCOUNTS review:');
    const transitionsBefore = await checkAvailableTransitions();
    console.log('');
    
    // Create ACCOUNTS review
    const reviewResult = await createAccountsReview();
    console.log('');
    
    if (reviewResult) {
      // Check current state after review
      console.log('📋 After creating ACCOUNTS review:');
      await checkCurrentState();
      console.log('');
      
      // Check available transitions after creating review
      await checkAvailableTransitions();
      console.log('');
      
      console.log('🎉 ACCOUNTS REVIEW TEST COMPLETED!');
      console.log('✅ Review created successfully');
      
      if (reviewResult.autoTransition) {
        console.log('✅ Auto-transition occurred');
      } else {
        console.log('⚠️  No auto-transition occurred - check if this is expected');
      }
    } else {
      console.log('❌ ACCOUNTS REVIEW TEST FAILED!');
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
