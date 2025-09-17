const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Helper function to login and get token
async function login(username, password) {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  if (response.success) {
    return response.data.token;
  }
  throw new Error(`Login failed: ${response.error}`);
}

async function testSendToAccounts() {
  console.log('🚀 TESTING SEND TO ACCOUNTS FUNCTIONALITY');
  console.log('==========================================\n');

  try {
    // Step 1: Login as different users
    console.log('🔐 Logging in users...');
    const tokens = {
      admin: await login('admin', 'password123'),
      owo: await login('owo_officer', 'password123'),
      bca: await login('bca_officer', 'password123'),
      housing: await login('housing_officer', 'password123'),
      accounts: await login('accounts_officer', 'password123')
    };
    console.log('✅ All users logged in successfully');

    // Step 2: Get workflow stages and sections
    console.log('\n📋 Getting workflow data...');
    const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
    const stages = stagesResponse.data.stages;
    const stageMap = new Map(stages.map(s => [s.code, s.id]));

    const sectionsResponse = await apiRequest('GET', '/api/workflow/sections', null, tokens.admin);
    const sections = sectionsResponse.data.sections;
    const sectionMap = new Map(sections.map(s => [s.code, s.id]));

    const statusResponse = await apiRequest('GET', '/api/workflow/statuses', null, tokens.admin);
    const statuses = statusResponse.data.statuses;
    const statusMap = new Map(statuses.map(s => [s.code, s.id]));

    console.log('✅ Workflow data retrieved');

    // Step 3: Get demo persons and plots
    console.log('\n📋 Getting demo data...');
    const personsResponse = await apiRequest('GET', '/api/persons', null, tokens.admin);
    const persons = personsResponse.data.persons;

    const plotsResponse = await apiRequest('GET', '/api/plots', null, tokens.admin);
    const plots = plotsResponse.data.plots;

    if (persons.length < 2) {
      throw new Error('Need at least 2 persons for seller and buyer');
    }
    if (plots.length < 1) {
      throw new Error('Need at least 1 plot for transfer');
    }

    // Step 4: Create a test application with required attachments
    console.log('\n📝 Creating test application...');
    const requiredAttachments = [
      { docType: 'AllotmentLetter', fileName: 'allotment.pdf', isOriginalSeen: true },
      { docType: 'PrevTransferDeed', fileName: 'prev_deed.pdf', isOriginalSeen: true },
      { docType: 'CNIC_Seller', fileName: 'seller_cnic.pdf', isOriginalSeen: true },
      { docType: 'CNIC_Buyer', fileName: 'buyer_cnic.pdf', isOriginalSeen: true },
      { docType: 'UtilityBill_Latest', fileName: 'utility_bill.pdf', isOriginalSeen: true },
      { docType: 'Photo_Seller', fileName: 'seller_photo.jpg', isOriginalSeen: true },
      { docType: 'Photo_Buyer', fileName: 'buyer_photo.jpg', isOriginalSeen: true }
    ];

    const applicationData = {
      sellerId: persons[0].id, // First person as seller
      buyerId: persons[1].id,  // Second person as buyer
      plotId: plots[0].id,     // First plot
      transferType: 'SALE',
      applicationDate: new Date().toISOString(),
      attachments: requiredAttachments
    };

    const createResponse = await apiRequest('POST', '/api/applications', applicationData, tokens.admin);
    if (!createResponse.success) {
      throw new Error(`Failed to create application: ${createResponse.error}`);
    }

    const applicationId = createResponse.data.application.id;
    console.log(`✅ Test application created: ${applicationId}`);

    // Step 5: Set up application in OWO_REVIEW_BCA_HOUSING stage (bypass workflow for testing)
    console.log('\n🔄 Setting up application in OWO_REVIEW_BCA_HOUSING stage...');

    // For testing purposes, directly set the application to OWO_REVIEW_BCA_HOUSING stage
    // This bypasses the complex workflow setup and focuses on testing the "Send to Accounts" functionality
    const directStageUpdate = await apiRequest('PUT', `/api/applications/${applicationId}`, {
      currentStageId: stageMap.get('OWO_REVIEW_BCA_HOUSING')
    }, tokens.admin);

    if (!directStageUpdate.success) {
      throw new Error(`Failed to set stage to OWO_REVIEW_BCA_HOUSING: ${directStageUpdate.error}`);
    }
    console.log('✅ Application stage set to OWO_REVIEW_BCA_HOUSING');

    // Create BCA and Housing clearances (required for the workflow)
    await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
      sectionId: sectionMap.get('BCA'),
      statusId: statusMap.get('CLEAR'),
      remarks: 'BCA clearance granted (test setup)'
    }, tokens.bca);

    await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
      sectionId: sectionMap.get('HOUSING'),
      statusId: statusMap.get('CLEAR'),
      remarks: 'Housing clearance granted (test setup)'
    }, tokens.housing);
    console.log('✅ BCA and Housing clearances created');

    // Create OWO review for BCA/Housing (required for GUARD_OWO_REVIEW_COMPLETE)
    const owoReviewResponse = await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
      sectionId: sectionMap.get('OWO'),
      remarks: 'BCA and Housing clearances reviewed and approved by OWO (test setup)',
      status: 'APPROVED',
      autoTransition: false // Don't auto-transition since we manually set the stage
    }, tokens.owo);

    if (!owoReviewResponse.success) {
      throw new Error(`Failed to create OWO review: ${owoReviewResponse.error}`);
    }

    console.log('✅ OWO review created - application ready for Send to Accounts test');

    // Step 6: Check current application state after all transitions
    console.log('\n🔍 Checking current application state...');
    const appResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
    if (!appResponse.success) {
      throw new Error(`Failed to get application: ${appResponse.error}`);
    }
    const currentApp = appResponse.data.application;

    console.log(`📊 Current stage: ${currentApp.currentStage.name} (${currentApp.currentStage.code})`);

    // If not in the expected stage, let's see what happened
    if (currentApp.currentStage.code !== 'OWO_REVIEW_BCA_HOUSING') {
      console.log('⚠️  Application not in expected stage. Let\'s check what went wrong...');

      // Check clearances
      const clearancesResponse = await apiRequest('GET', `/api/applications/${applicationId}/clearances`, null, tokens.admin);
      if (clearancesResponse.success) {
        console.log('📋 Current clearances:');
        clearancesResponse.data.clearances.forEach(c => {
          console.log(`   ${c.section.code}: ${c.status.name}`);
        });
      }

      // Check reviews
      const reviewsResponse = await apiRequest('GET', `/api/applications/${applicationId}/reviews`, null, tokens.admin);
      if (reviewsResponse.success) {
        console.log('📝 Current reviews:');
        reviewsResponse.data.reviews.forEach(r => {
          console.log(`   ${r.section.code}: ${r.status}`);
        });
      }
    }

    // Step 7: Test "Send to Accounts" transition
    console.log('\n📤 Testing Send to Accounts transition...');

    // Test the transition to SENT_TO_ACCOUNTS
    const transitionResponse = await apiRequest('POST', `/api/workflow/applications/${applicationId}/transition`, {
      toStageId: stageMap.get('SENT_TO_ACCOUNTS')
    }, tokens.owo);

    if (!transitionResponse.success) {
      throw new Error(`Failed to transition to SENT_TO_ACCOUNTS: ${transitionResponse.error}`);
    }

    console.log('✅ Successfully transitioned to SENT_TO_ACCOUNTS');

    // Step 8: Verify the results
    console.log('\n🔍 Verifying results...');

    // Get updated application
    const finalAppResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, tokens.admin);
    const finalApp = finalAppResponse.data.application;

    console.log(`📊 Final Application Status:`);
    console.log(`   Application: ${finalApp.applicationNumber}`);
    console.log(`   Current Stage: ${finalApp.currentStage.name} (${finalApp.currentStage.code})`);

    // Check if Accounts clearance was created
    const clearancesResponse = await apiRequest('GET', `/api/applications/${applicationId}/clearances`, null, tokens.admin);
    const clearances = clearancesResponse.data.clearances;

    const accountsClearance = clearances.find(c => c.section.code === 'ACCOUNTS');

    console.log(`   Accounts Clearance: ${accountsClearance ? accountsClearance.status.name : 'Not found'}`);

    // Validate acceptance criteria
    const stageCorrect = finalApp.currentStage.code === 'SENT_TO_ACCOUNTS';
    const accountsClearanceExists = accountsClearance && accountsClearance.status.code === 'PENDING';

    if (stageCorrect && accountsClearanceExists) {
      console.log('\n🎉 ACCEPTANCE TEST PASSED!');
      console.log('✅ Stage updates to SENT_TO_ACCOUNTS');
      console.log('✅ Accounts tab becomes editable (clearance exists)');
      console.log('✅ Accounts Clearance shows PENDING');
    } else {
      console.log('\n❌ ACCEPTANCE TEST FAILED!');
      console.log(`Expected: Stage = SENT_TO_ACCOUNTS, Accounts Clearance = PENDING`);
      console.log(`Actual: Stage = ${finalApp.currentStage.code}, Accounts Clearance = ${accountsClearance?.status.code || 'Not found'}`);
    }

    console.log('\n🎉 SEND TO ACCOUNTS TEST COMPLETED!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSendToAccounts();