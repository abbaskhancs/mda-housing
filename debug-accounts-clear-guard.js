const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'password123' },
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

async function checkApplicationDetails() {
  console.log('🔍 Checking application details...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}`, null, tokens.admin);
  const application = response.data.application;
  
  console.log(`📊 Application ID: ${application.id}`);
  console.log(`📊 Current stage: ${application.currentStage?.name} (${application.currentStage?.code})`);
  console.log(`📊 Previous stage: ${application.previousStage?.name || 'None'} (${application.previousStage?.code || 'None'})`);
  
  return application;
}

async function checkAccountsBreakdown() {
  console.log('💰 Checking accounts breakdown...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}/accounts`, null, tokens.accounts);
  const accountsBreakdown = response.data.accountsBreakdown;
  
  console.log(`💳 Total amount: ${accountsBreakdown.totalAmount}`);
  console.log(`💳 Paid amount: ${accountsBreakdown.paidAmount}`);
  console.log(`💳 Payment verified: ${accountsBreakdown.paymentVerified}`);
  console.log(`💳 Challan number: ${accountsBreakdown.challanNo}`);
  
  return accountsBreakdown;
}

async function checkClearances() {
  console.log('📋 Checking clearances...');
  
  const response = await apiRequest('GET', `/api/applications/${testApplicationId}/clearances`, null, tokens.admin);
  const clearances = response.data.clearances || [];
  
  console.log(`📋 Total clearances: ${clearances.length}`);
  clearances.forEach(clearance => {
    console.log(`  - ${clearance.section.name} (${clearance.section.code}): ${clearance.status.name} (${clearance.status.code})`);
    if (clearance.clearedAt) {
      console.log(`    Cleared at: ${clearance.clearedAt}`);
    }
  });
  
  const accountsClearance = clearances.find(c => c.section.code === 'ACCOUNTS');
  return { clearances, accountsClearance };
}

async function testGuardDirectly() {
  console.log('🛡️ Testing GUARD_ACCOUNTS_CLEAR directly...');
  
  try {
    // Get available transitions
    const transitionsResponse = await apiRequest('GET', `/api/workflow/transitions/${testApplicationId}`, null, tokens.admin);
    const transitions = transitionsResponse.data.transitions || [];
    
    console.log(`🔄 Available transitions: ${transitions.length}`);
    transitions.forEach(transition => {
      console.log(`  - To: ${transition.toStage.name} (${transition.toStage.code}) - Guard: ${transition.guardName}`);
    });
    
    // Look for ACCOUNTS_CLEAR transition
    const accountsClearTransition = transitions.find(t => t.toStage.code === 'ACCOUNTS_CLEAR');
    
    if (accountsClearTransition) {
      console.log('✅ ACCOUNTS_CLEAR transition is available');
      
      // Try to execute the transition
      console.log('🔄 Attempting transition to ACCOUNTS_CLEAR...');
      const transitionResponse = await apiRequest('POST', '/api/workflow/transition', {
        applicationId: testApplicationId,
        toStageCode: 'ACCOUNTS_CLEAR'
      }, tokens.admin);
      
      console.log('✅ Transition successful!');
      console.log(`📊 New stage: ${transitionResponse.data.application.currentStage.name}`);
      
    } else {
      console.log('❌ ACCOUNTS_CLEAR transition is not available');
    }
    
  } catch (error) {
    console.log('❌ Guard test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.log('📋 Error details:', error.response.data.details);
    }
  }
}

async function checkWorkflowStages() {
  console.log('🏗️ Checking workflow stages...');
  
  const response = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
  const stages = response.data.stages || [];
  
  const accountsClearStage = stages.find(s => s.code === 'ACCOUNTS_CLEAR');
  
  if (accountsClearStage) {
    console.log(`✅ ACCOUNTS_CLEAR stage exists: ${accountsClearStage.name} (ID: ${accountsClearStage.id})`);
  } else {
    console.log('❌ ACCOUNTS_CLEAR stage not found');
    console.log('Available stages:');
    stages.forEach(stage => {
      console.log(`  - ${stage.name} (${stage.code})`);
    });
  }
  
  return accountsClearStage;
}

async function runDebug() {
  console.log('🔍 Starting GUARD_ACCOUNTS_CLEAR Debug...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    tokens.admin = await login('admin');
    tokens.accounts = await login('accounts');
    console.log('✅ Login successful\n');
    
    // Check application details
    await checkApplicationDetails();
    console.log('');
    
    // Check accounts breakdown
    await checkAccountsBreakdown();
    console.log('');
    
    // Check clearances
    await checkClearances();
    console.log('');
    
    // Check workflow stages
    await checkWorkflowStages();
    console.log('');
    
    // Test guard directly
    await testGuardDirectly();
    console.log('');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
runDebug().then(() => {
  console.log('\n🏁 Debug completed');
}).catch(error => {
  console.error('💥 Debug crashed:', error.message);
});
