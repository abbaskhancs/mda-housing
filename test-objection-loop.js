const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const OWO_CREDENTIALS = {
  username: 'owo_officer',
  password: 'password123'
};

const BCA_CREDENTIALS = {
  username: 'bca_officer',
  password: 'password123'
};

let owoToken = '';
let bcaToken = '';
let testApplicationId = '';

async function login(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestApplication() {
  try {
    console.log('🏗️  Creating test application...');
    
    // Create a simple application using actual demo data IDs
    const applicationData = {
      sellerId: 'cmf8492bm001kxjnwh9kgqhuc', // Ahmed Ali
      buyerId: 'cmf8492bm001lxjnw9lsc9x9a',  // Fatima Khan
      attorneyId: 'cmf8492bm001mxjnwcg92sp0u', // Muhammad Hassan
      plotId: 'cmf8492bv001pxjnwb3dktfeh',   // P-001
      transferType: 'SALE'
    };

    const response = await axios.post(`${BASE_URL}/api/applications`, applicationData, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    testApplicationId = response.data.application.id;
    console.log(`✅ Test application created: ${testApplicationId}`);
    return response.data.application;
  } catch (error) {
    console.error('❌ Failed to create test application:', error.response?.data || error.message);
    throw error;
  }
}

async function moveApplicationToBCAPending() {
  try {
    console.log('📋 Moving application through workflow stages...');

    // Get the application to check current stage
    let appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    console.log(`Current stage: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);

    // Step 1: SUBMITTED → UNDER_SCRUTINY
    if (appResponse.data.application.currentStage.code === 'SUBMITTED') {
      const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/SUBMITTED?applicationId=${testApplicationId}&dryRun=true`, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });

      const underScrutinyTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'UNDER_SCRUTINY');
      if (underScrutinyTransition && underScrutinyTransition.canTransition) {
        await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
          toStageId: underScrutinyTransition.toStageId,
          remarks: 'Moving to Under Scrutiny for processing'
        }, {
          headers: { Authorization: `Bearer ${owoToken}` }
        });
        console.log('✅ Moved to UNDER_SCRUTINY');
      }
    }

    // Step 2: UNDER_SCRUTINY → SENT_TO_BCA_HOUSING
    appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    if (appResponse.data.application.currentStage.code === 'UNDER_SCRUTINY') {
      const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/UNDER_SCRUTINY?applicationId=${testApplicationId}&dryRun=true`, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });

      const bcaHousingTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
      if (bcaHousingTransition && bcaHousingTransition.canTransition) {
        await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
          toStageId: bcaHousingTransition.toStageId,
          remarks: 'Sending to BCA & Housing for clearance'
        }, {
          headers: { Authorization: `Bearer ${owoToken}` }
        });
        console.log('✅ Moved to SENT_TO_BCA_HOUSING');
      }
    }

    // Step 3: SENT_TO_BCA_HOUSING → BCA_PENDING (this happens automatically when sent to BCA)
    // The BCA officer will see this in their pending queue

    return true;
  } catch (error) {
    console.error('❌ Failed to move application through workflow:', error.response?.data || error.message);
    throw error;
  }
}

async function createBCAObjection() {
  try {
    console.log('🚫 Creating BCA objection...');

    // First, check current application stage
    let appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });

    console.log(`Current stage before BCA action: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);

    // If application is in SENT_TO_BCA_HOUSING, BCA needs to move it to BCA_PENDING first
    if (appResponse.data.application.currentStage.code === 'SENT_TO_BCA_HOUSING') {
      console.log('📋 Moving application to BCA_PENDING...');

      const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/SENT_TO_BCA_HOUSING?applicationId=${testApplicationId}&dryRun=true`, {
        headers: { Authorization: `Bearer ${bcaToken}` }
      });

      const bcaPendingTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'BCA_PENDING');
      if (bcaPendingTransition && bcaPendingTransition.canTransition) {
        await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
          toStageId: bcaPendingTransition.toStageId,
          remarks: 'BCA taking application for review'
        }, {
          headers: { Authorization: `Bearer ${bcaToken}` }
        });
        console.log('✅ Moved to BCA_PENDING');
      }
    }

    // Get BCA and OBJECTION status IDs
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, {
        headers: { Authorization: `Bearer ${bcaToken}` }
      }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, {
        headers: { Authorization: `Bearer ${bcaToken}` }
      })
    ]);

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const objectionStatus = statusesResponse.data.statuses.find(s => s.code === 'OBJECTION');

    if (!bcaSection || !objectionStatus) {
      throw new Error('BCA section or OBJECTION status not found');
    }

    // Create BCA objection clearance
    const clearanceData = {
      sectionId: bcaSection.id,
      statusId: objectionStatus.id,
      remarks: 'Test objection: Missing NOC for built structure. Please provide NOC_BuiltStructure document.',
      signedPdfUrl: 'https://example.com/bca-objection.pdf'
    };

    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, clearanceData, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });

    console.log('✅ BCA objection created successfully');

    // Check if application moved to ON_HOLD_BCA (should happen automatically)
    appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    console.log(`📊 Application stage after objection: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to create BCA objection:', error.response?.data || error.message);
    throw error;
  }
}

async function testObjectionLoopActions() {
  try {
    console.log('🔄 Testing objection loop actions...');
    
    // Get available transitions from ON_HOLD_BCA
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/ON_HOLD_BCA?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log('📋 Available transitions from ON_HOLD_BCA:');
    transitionsResponse.data.transitions.forEach(t => {
      console.log(`  - ${t.toStage.name} (${t.toStage.code}) - ${t.canTransition ? '✅ Available' : '❌ Blocked: ' + t.reason}`);
    });
    
    // Test Fix & Resubmit action (back to UNDER_SCRUTINY)
    const fixResubmitTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'UNDER_SCRUTINY');
    if (fixResubmitTransition && fixResubmitTransition.canTransition) {
      console.log('✅ Fix & Resubmit action is available');
    } else {
      console.log('❌ Fix & Resubmit action is not available:', fixResubmitTransition?.reason);
    }
    
    // Test Resend to BCA & Housing action
    const resendTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
    if (resendTransition) {
      console.log(`${resendTransition.canTransition ? '✅' : '❌'} Resend to BCA & Housing: ${resendTransition.canTransition ? 'Available' : resendTransition.reason}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to test objection loop actions:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadMissingDocument() {
  try {
    console.log('📎 Uploading missing document...');
    
    // Simulate uploading a missing document
    const FormData = require('form-data');
    const form = new FormData();
    
    // Create a dummy file buffer
    const dummyFileContent = Buffer.from('This is a dummy NOC_BuiltStructure document for testing');
    form.append('attachments', dummyFileContent, {
      filename: 'noc_built_structure.pdf',
      contentType: 'application/pdf'
    });
    form.append('docType_attachments', 'NOC_BuiltStructure');
    form.append('isOriginalSeen_attachments', 'true');
    
    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/attachments`, form, {
      headers: {
        Authorization: `Bearer ${owoToken}`,
        ...form.getHeaders()
      }
    });
    
    console.log('✅ Missing document uploaded successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to upload missing document:', error.response?.data || error.message);
    throw error;
  }
}

async function testResendToBCAHousing() {
  try {
    console.log('🔄 Testing Resend to BCA & Housing after document upload...');
    
    // Get available transitions again after document upload
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/ON_HOLD_BCA?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    const resendTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
    if (resendTransition && resendTransition.canTransition) {
      console.log('✅ Resend to BCA & Housing is now enabled!');
      
      // Execute the transition
      const transitionResponse = await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
        toStageId: resendTransition.toStageId,
        remarks: 'Resending to BCA & Housing after uploading missing NOC_BuiltStructure document'
      }, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });
      
      console.log('✅ Successfully resent to BCA & Housing');
      
      // Check final application stage
      const appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });
      
      console.log(`📊 Final application stage: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);
      
      return true;
    } else {
      console.log('❌ Resend to BCA & Housing is still not available:', resendTransition?.reason);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to test resend to BCA & Housing:', error.response?.data || error.message);
    throw error;
  }
}

async function runTest() {
  try {
    console.log('🚀 Starting Objection Loop Test...\n');
    
    // Step 1: Login
    console.log('🔐 Logging in...');
    owoToken = await login(OWO_CREDENTIALS);
    bcaToken = await login(BCA_CREDENTIALS);
    console.log('✅ Login successful\n');
    
    // Step 2: Create test application
    await createTestApplication();
    console.log('');
    
    // Step 3: Move to BCA pending
    await moveApplicationToBCAPending();
    console.log('');
    
    // Step 4: Create BCA objection
    await createBCAObjection();
    console.log('');
    
    // Step 5: Test objection loop actions
    await testObjectionLoopActions();
    console.log('');
    
    // Step 6: Upload missing document
    await uploadMissingDocument();
    console.log('');
    
    // Step 7: Test resend to BCA & Housing
    const success = await testResendToBCAHousing();
    console.log('');
    
    if (success) {
      console.log('🎉 OBJECTION LOOP TEST COMPLETED SUCCESSFULLY!');
      console.log('✅ All acceptance criteria met:');
      console.log('   - BCA OBJECTION triggered ✅');
      console.log('   - Missing document uploaded ✅');
      console.log('   - "Resend to BCA & Housing" became enabled ✅');
      console.log('   - Loop completed successfully ✅');
    } else {
      console.log('❌ OBJECTION LOOP TEST FAILED');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
