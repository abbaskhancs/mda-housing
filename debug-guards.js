const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const OWO_CREDENTIALS = { username: 'owo_officer', password: 'password123' };

let owoToken = '';

async function login(credentials) {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
  return response.data.token;
}

async function debugGuards() {
  try {
    console.log('🔐 Logging in...');
    owoToken = await login(OWO_CREDENTIALS);
    console.log('✅ Login successful\n');
    
    // Create a test application
    console.log('🏗️  Creating test application...');
    const applicationData = {
      sellerId: 'cmf8492bm001kxjnwh9kgqhuc', // Ahmed Ali
      buyerId: 'cmf8492bm001lxjnw9lsc9x9a',  // Fatima Khan
      attorneyId: 'cmf8492bm001mxjnwcg92sp0u', // Muhammad Hassan
      plotId: 'cmf8492bv001pxjnwb3dktfeh',   // P-001
      transferType: 'SALE'
    };

    const appResponse = await axios.post(`${BASE_URL}/api/applications`, applicationData, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    const applicationId = appResponse.data.application.id;
    console.log(`✅ Test application created: ${applicationId}\n`);
    
    // Test SUBMITTED → UNDER_SCRUTINY transition
    console.log('🔍 Testing SUBMITTED → UNDER_SCRUTINY transition...');
    
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/SUBMITTED?applicationId=${applicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log('Available transitions from SUBMITTED:');
    transitionsResponse.data.transitions.forEach(t => {
      console.log(`  - ${t.toStage.name} (${t.toStage.code})`);
      console.log(`    Guard: ${t.guardName}`);
      console.log(`    Can transition: ${t.canTransition}`);
      console.log(`    Reason: ${t.reason || 'No reason provided'}`);
      console.log('');
    });
    
    // Try to execute the transition
    const underScrutinyTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'UNDER_SCRUTINY');
    if (underScrutinyTransition) {
      console.log('🚀 Attempting to execute SUBMITTED → UNDER_SCRUTINY transition...');
      
      try {
        const transitionResponse = await axios.post(`${BASE_URL}/api/workflow/applications/${applicationId}/transition`, {
          toStageId: underScrutinyTransition.toStageId,
          remarks: 'Test transition to Under Scrutiny'
        }, {
          headers: { Authorization: `Bearer ${owoToken}` }
        });
        
        console.log('✅ Transition successful!');
        console.log(`New stage: ${transitionResponse.data.application.currentStage.name}`);
      } catch (error) {
        console.log('❌ Transition failed:');
        console.log(error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error.response?.data || error.message);
  }
}

debugGuards();
