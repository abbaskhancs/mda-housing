const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const OWO_CREDENTIALS = { username: 'owo_officer', password: 'password123' };
const BCA_CREDENTIALS = { username: 'bca_officer', password: 'password123' };

let owoToken = '';
let bcaToken = '';

async function login(credentials) {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
  return response.data.token;
}

async function debugApplication(applicationId) {
  try {
    console.log('🔍 Debugging application:', applicationId);
    
    // Get application details
    const appResponse = await axios.get(`${BASE_URL}/api/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    const app = appResponse.data.application;
    console.log(`📊 Application Stage: ${app.currentStage.name} (${app.currentStage.code})`);
    console.log(`📋 Clearances: ${app.clearances.length}`);
    
    app.clearances.forEach(clearance => {
      console.log(`  - ${clearance.section.name}: ${clearance.status.name} (${clearance.status.code})`);
      console.log(`    Remarks: ${clearance.remarks}`);
    });
    
    // Check available transitions
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/${app.currentStage.code}?applicationId=${applicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log(`\n🔄 Available transitions from ${app.currentStage.code}:`);
    transitionsResponse.data.transitions.forEach(t => {
      console.log(`  - ${t.toStage.name} (${t.toStage.code})`);
      console.log(`    Can transition: ${t.canTransition}`);
      if (!t.canTransition) {
        console.log(`    Reason: ${t.reason || 'No reason provided'}`);
      }
      if (t.guardName) {
        console.log(`    Guard: ${t.guardName}`);
      }
    });
    
    return app;
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testWorkflowService() {
  try {
    console.log('🧪 Testing workflow service...');
    
    // Get all stages
    const stagesResponse = await axios.get(`${BASE_URL}/api/workflow/stages`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log('📋 Available stages:');
    stagesResponse.data.stages.forEach(stage => {
      console.log(`  - ${stage.name} (${stage.code})`);
    });
    
    // Check if ON_HOLD_BCA stage exists
    const onHoldBCA = stagesResponse.data.stages.find(s => s.code === 'ON_HOLD_BCA');
    if (onHoldBCA) {
      console.log(`✅ ON_HOLD_BCA stage found: ${onHoldBCA.name}`);
    } else {
      console.log('❌ ON_HOLD_BCA stage not found!');
    }
    
    // Get all transitions
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log('\n🔄 All transitions:');
    const relevantTransitions = transitionsResponse.data.transitions.filter(t => 
      t.fromStage.code === 'SENT_TO_BCA_HOUSING' || 
      t.toStage.code === 'ON_HOLD_BCA' ||
      t.fromStage.code === 'ON_HOLD_BCA'
    );
    
    relevantTransitions.forEach(t => {
      console.log(`  - ${t.fromStage.code} → ${t.toStage.code} (${t.guardName || 'No guard'})`);
    });
    
  } catch (error) {
    console.error('❌ Workflow service test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function run() {
  try {
    console.log('🔐 Logging in...');
    owoToken = await login(OWO_CREDENTIALS);
    bcaToken = await login(BCA_CREDENTIALS);
    console.log('✅ Login successful\n');
    
    await testWorkflowService();
    console.log('\n');
    
    // Use the application ID from the previous test
    const applicationId = 'cmfp6xpmc000312u90pfbixwt';
    await debugApplication(applicationId);
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

run();
