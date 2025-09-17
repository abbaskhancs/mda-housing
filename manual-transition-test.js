const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' }
};

let adminToken = null;
const testApplicationId = 'cmfoc8p8s002c1185bbu0obzl'; // From previous test

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials.admin);
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed:`, error.response?.data || error.message);
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

async function manualTransition() {
  console.log('🔄 Attempting manual transition to ACCOUNTS_CLEAR...');

  try {
    // First, get the ACCOUNTS_CLEAR stage ID
    const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, adminToken);
    const stages = stagesResponse.data.stages || [];
    const accountsClearStage = stages.find(s => s.code === 'ACCOUNTS_CLEAR');

    if (!accountsClearStage) {
      console.log('❌ ACCOUNTS_CLEAR stage not found');
      return null;
    }

    console.log(`📊 ACCOUNTS_CLEAR stage ID: ${accountsClearStage.id}`);

    const response = await apiRequest('POST', `/api/workflow/applications/${testApplicationId}/transition`, {
      toStageId: accountsClearStage.id,
      remarks: 'Manual transition test'
    }, adminToken);

    console.log('✅ Manual transition successful!');
    console.log(`📊 New stage: ${response.data.application.currentStage.name} (${response.data.application.currentStage.code})`);

    return response.data.application;

  } catch (error) {
    console.log('❌ Manual transition failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('📋 Error details:', JSON.stringify(error.response.data.details, null, 2));
    }
    return null;
  }
}

async function checkCurrentState() {
  console.log('🔍 Checking current application state...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}`, null, adminToken);
  const application = response.data.application;
  
  console.log(`📊 Current stage: ${application.currentStage?.name} (${application.currentStage?.code})`);
  
  return application;
}

async function runTest() {
  console.log('🚀 Starting Manual Transition Test...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    adminToken = await login();
    console.log('✅ Login successful\n');
    
    // Check current state
    await checkCurrentState();
    console.log('');
    
    // Attempt manual transition
    const result = await manualTransition();
    console.log('');
    
    if (result) {
      // Check final state
      await checkCurrentState();
      console.log('');
      
      console.log('🎉 MANUAL TRANSITION TEST PASSED!');
      console.log('✅ Application successfully transitioned to ACCOUNTS_CLEAR');
    } else {
      console.log('❌ MANUAL TRANSITION TEST FAILED!');
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
