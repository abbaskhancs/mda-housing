const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const OWO_CREDENTIALS = { username: 'owo_officer', password: 'password123' };
const BCA_CREDENTIALS = { username: 'bca_officer', password: 'password123' };

let owoToken = '';
let bcaToken = '';
let testApplicationId = '';

async function login(credentials) {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
  return response.data.token;
}

async function createApplicationWithDocuments() {
  try {
    console.log('🏗️  Creating test application with required documents...');
    
    // Create application
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

    testApplicationId = appResponse.data.application.id;
    console.log(`✅ Test application created: ${testApplicationId}`);
    
    // Upload all required documents
    const requiredDocs = [
      'AllotmentLetter',
      'PrevTransferDeed',
      'CNIC_Seller',
      'CNIC_Buyer',
      'UtilityBill_Latest',
      'Photo_Seller',
      'Photo_Buyer'
    ];
    
    console.log('📎 Uploading required documents...');
    
    for (const docType of requiredDocs) {
      const form = new FormData();
      const dummyContent = Buffer.from(`This is a dummy ${docType} document for testing`);
      
      form.append('attachments', dummyContent, {
        filename: `${docType.toLowerCase()}.pdf`,
        contentType: 'application/pdf'
      });
      form.append('docType_attachments', docType);
      form.append('isOriginalSeen_attachments', 'true');
      
      await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/attachments`, form, {
        headers: {
          Authorization: `Bearer ${owoToken}`,
          ...form.getHeaders()
        }
      });
      
      console.log(`  ✅ Uploaded ${docType}`);
    }
    
    console.log('✅ All required documents uploaded');
    return appResponse.data.application;
  } catch (error) {
    console.error('❌ Failed to create application with documents:', error.response?.data || error.message);
    throw error;
  }
}

async function moveApplicationThroughWorkflow() {
  try {
    console.log('📋 Moving application through workflow stages...');
    
    // Step 1: SUBMITTED → UNDER_SCRUTINY
    console.log('🔄 SUBMITTED → UNDER_SCRUTINY...');
    let transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/SUBMITTED?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    let transition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'UNDER_SCRUTINY');
    if (transition && transition.canTransition) {
      await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
        toStageId: transition.toStageId,
        remarks: 'Moving to Under Scrutiny - all documents verified'
      }, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });
      console.log('✅ Moved to UNDER_SCRUTINY');
    } else {
      throw new Error(`Cannot move to UNDER_SCRUTINY: ${transition?.reason}`);
    }
    
    // Step 2a: Create OWO review (required for GUARD_SCRUTINY_COMPLETE)
    console.log('📝 Creating OWO review...');

    // Get OWO section ID
    const sectionsResponse = await axios.get(`${BASE_URL}/api/workflow/sections`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    const owoSection = sectionsResponse.data.sections.find(s => s.code === 'OWO');

    if (!owoSection) {
      throw new Error('OWO section not found');
    }

    // Create OWO review
    const reviewData = {
      sectionId: owoSection.id,
      status: 'APPROVED',
      remarks: 'Initial scrutiny completed. All documents verified and application is ready for BCA & Housing clearance.',
      reviewedAt: new Date().toISOString()
    };

    await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/reviews`, reviewData, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    console.log('✅ OWO review created');

    // Step 2b: UNDER_SCRUTINY → SENT_TO_BCA_HOUSING
    console.log('🔄 UNDER_SCRUTINY → SENT_TO_BCA_HOUSING...');
    transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/UNDER_SCRUTINY?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });

    transition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
    if (transition && transition.canTransition) {
      await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
        toStageId: transition.toStageId,
        remarks: 'Sending to BCA & Housing for clearance'
      }, {
        headers: { Authorization: `Bearer ${owoToken}` }
      });
      console.log('✅ Moved to SENT_TO_BCA_HOUSING');
    } else {
      throw new Error(`Cannot move to SENT_TO_BCA_HOUSING: ${transition?.reason}`);
    }
    
    // Step 3: SENT_TO_BCA_HOUSING → BCA_PENDING (BCA officer action)
    console.log('🔄 SENT_TO_BCA_HOUSING → BCA_PENDING (BCA action)...');
    transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/SENT_TO_BCA_HOUSING?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });
    
    transition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'BCA_PENDING');
    if (transition && transition.canTransition) {
      await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
        toStageId: transition.toStageId,
        remarks: 'BCA taking application for review'
      }, {
        headers: { Authorization: `Bearer ${bcaToken}` }
      });
      console.log('✅ Moved to BCA_PENDING');
    } else {
      throw new Error(`Cannot move to BCA_PENDING: ${transition?.reason}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to move application through workflow:', error.message);
    throw error;
  }
}

async function createBCAObjection() {
  try {
    console.log('🚫 Creating BCA objection...');
    
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
    const appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${owoToken}` }
    });
    
    console.log(`📊 Application stage after objection: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);
    
    if (appResponse.data.application.currentStage.code === 'ON_HOLD_BCA') {
      console.log('🎉 Application automatically moved to ON_HOLD_BCA!');
      return true;
    } else {
      console.log('⚠️  Application did not move to ON_HOLD_BCA automatically');
      return false;
    }
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
    
    // Test Resend to BCA & Housing action (should be blocked until document upload)
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
    console.log('📎 Uploading missing document (NOC_BuiltStructure)...');
    
    const form = new FormData();
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

async function testResendAfterUpload() {
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
      await axios.post(`${BASE_URL}/api/workflow/applications/${testApplicationId}/transition`, {
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

async function runCompleteTest() {
  try {
    console.log('🚀 Starting Complete Objection Loop Test...\n');
    
    // Step 1: Login
    console.log('🔐 Logging in...');
    owoToken = await login(OWO_CREDENTIALS);
    bcaToken = await login(BCA_CREDENTIALS);
    console.log('✅ Login successful\n');
    
    // Step 2: Create application with all required documents
    await createApplicationWithDocuments();
    console.log('');
    
    // Step 3: Move through workflow stages
    await moveApplicationThroughWorkflow();
    console.log('');
    
    // Step 4: Create BCA objection
    const objectionCreated = await createBCAObjection();
    console.log('');
    
    if (!objectionCreated) {
      throw new Error('BCA objection did not trigger automatic stage transition');
    }
    
    // Step 5: Test objection loop actions
    await testObjectionLoopActions();
    console.log('');
    
    // Step 6: Upload missing document
    await uploadMissingDocument();
    console.log('');
    
    // Step 7: Test resend to BCA & Housing
    const success = await testResendAfterUpload();
    console.log('');
    
    if (success) {
      console.log('🎉 COMPLETE OBJECTION LOOP TEST PASSED!');
      console.log('✅ All acceptance criteria met:');
      console.log('   - BCA OBJECTION triggered ✅');
      console.log('   - Application moved to ON_HOLD_BCA ✅');
      console.log('   - Missing document uploaded ✅');
      console.log('   - "Resend to BCA & Housing" became enabled ✅');
      console.log('   - Loop completed to SENT_TO_BCA_HOUSING ✅');
    } else {
      console.log('❌ OBJECTION LOOP TEST FAILED');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the complete test
runCompleteTest();
