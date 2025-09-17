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
      status: error.response?.status,
      details: error.response?.data
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

async function testAccountsClearanceCreation() {
  console.log('🚀 TESTING ACCOUNTS CLEARANCE CREATION');
  console.log('=====================================\n');

  try {
    // Login and setup
    const tokens = {
      admin: await login('admin', 'password123'),
      owo: await login('owo_officer', 'password123')
    };

    // Get workflow data
    const stagesResponse = await apiRequest('GET', '/api/workflow/stages', null, tokens.admin);
    const stages = stagesResponse.data.stages;
    const stageMap = new Map(stages.map(s => [s.code, s.id]));

    const sectionsResponse = await apiRequest('GET', '/api/workflow/sections', null, tokens.admin);
    const sections = sectionsResponse.data.sections;
    const sectionMap = new Map(sections.map(s => [s.code, s.id]));

    // Get demo data
    const personsResponse = await apiRequest('GET', '/api/persons', null, tokens.admin);
    const persons = personsResponse.data.persons;
    
    const plotsResponse = await apiRequest('GET', '/api/plots', null, tokens.admin);
    const plots = plotsResponse.data.plots;

    // Create test application
    const applicationData = {
      sellerId: persons[0].id,
      buyerId: persons[1].id,
      plotId: plots[0].id,
      transferType: 'SALE',
      applicationDate: new Date().toISOString(),
      attachments: []
    };

    const createResponse = await apiRequest('POST', '/api/applications', applicationData, tokens.admin);
    const applicationId = createResponse.data.application.id;
    console.log(`✅ Test application created: ${applicationId}`);

    // Set up OWO review (prerequisite for the transition)
    await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
      sectionId: sectionMap.get('OWO'),
      remarks: 'BCA and Housing clearances reviewed and approved by OWO',
      status: 'APPROVED',
      autoTransition: false
    }, tokens.owo);
    console.log('✅ OWO review created');

    // Check clearances before transition
    const clearancesBeforeResponse = await apiRequest('GET', `/api/applications/${applicationId}/clearances`, null, tokens.admin);
    const clearancesBefore = clearancesBeforeResponse.data.clearances || [];
    const accountsClearanceBefore = clearancesBefore.find(c => c.section.code === 'ACCOUNTS');
    
    console.log(`📋 Accounts clearance before transition: ${accountsClearanceBefore ? accountsClearanceBefore.status.name : 'Not found'}`);

    // Perform the transition to SENT_TO_ACCOUNTS
    console.log('\n📤 Performing transition to SENT_TO_ACCOUNTS...');
    const transitionResponse = await apiRequest('POST', `/api/workflow/applications/${applicationId}/transition`, {
      toStageId: stageMap.get('SENT_TO_ACCOUNTS'),
      remarks: 'Testing Send to Accounts functionality'
    }, tokens.owo);

    if (!transitionResponse.success) {
      throw new Error(`Transition failed: ${transitionResponse.error}`);
    }
    console.log('✅ Transition successful');

    // Check clearances after transition
    const clearancesAfterResponse = await apiRequest('GET', `/api/applications/${applicationId}/clearances`, null, tokens.admin);
    const clearancesAfter = clearancesAfterResponse.data.clearances || [];
    const accountsClearanceAfter = clearancesAfter.find(c => c.section.code === 'ACCOUNTS');

    // Verify results
    console.log('\n🔍 Verification Results:');
    console.log(`📊 Application stage: ${transitionResponse.data.application.currentStage.name} (${transitionResponse.data.application.currentStage.code})`);
    console.log(`📋 Accounts clearance after transition: ${accountsClearanceAfter ? accountsClearanceAfter.status.name : 'Not found'}`);

    // Final validation
    const stageCorrect = transitionResponse.data.application.currentStage.code === 'SENT_TO_ACCOUNTS';
    const accountsClearanceCreated = accountsClearanceAfter && accountsClearanceAfter.status.code === 'PENDING';

    if (stageCorrect && accountsClearanceCreated) {
      console.log('\n🎉 FINAL ACCEPTANCE TEST PASSED!');
      console.log('✅ Stage updates to SENT_TO_ACCOUNTS');
      console.log('✅ Accounts tab becomes editable (clearance exists)');
      console.log('✅ Accounts Clearance shows PENDING');
      console.log('✅ GUARD_SENT_TO_ACCOUNTS successfully created the accounts clearance');
    } else {
      console.log('\n❌ FINAL ACCEPTANCE TEST FAILED!');
      console.log(`Expected: Stage = SENT_TO_ACCOUNTS, Accounts Clearance = PENDING`);
      console.log(`Actual: Stage = ${transitionResponse.data.application.currentStage.code}, Accounts Clearance = ${accountsClearanceAfter?.status.code || 'Not found'}`);
    }

    console.log('\n🎉 ACCOUNTS CLEARANCE TEST COMPLETED!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testAccountsClearanceCreation();
