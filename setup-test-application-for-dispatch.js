const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function login(role = 'admin') {
  try {
    const credentials = {
      admin: { username: 'admin', password: 'password123' },
      owo: { username: 'owo_officer', password: 'password123' }
    };
    
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

async function setupTestApplication() {
  console.log('🔧 Setting up test application for dispatch memo testing...\n');
  
  const adminToken = await login('admin');
  const owoToken = await login('owo');
  
  // Get required data
  console.log('📊 Getting required data...');
  const [personsResponse, plotsResponse, sectionsResponse, statusesResponse, stagesResponse] = await Promise.all([
    apiRequest('GET', '/api/persons', null, adminToken),
    apiRequest('GET', '/api/plots', null, adminToken),
    apiRequest('GET', '/api/workflow/sections', null, adminToken),
    apiRequest('GET', '/api/workflow/statuses', null, adminToken),
    apiRequest('GET', '/api/workflow/stages', null, adminToken)
  ]);
  
  const persons = personsResponse.data.persons || [];
  const plots = plotsResponse.data.plots || [];
  const sections = sectionsResponse.data.sections || [];
  const statuses = statusesResponse.data.statuses || [];
  const stages = stagesResponse.data.stages || [];
  
  const sectionMap = new Map(sections.map(s => [s.code, s.id]));
  const statusMap = new Map(statuses.map(s => [s.code, s.id]));
  const stageMap = new Map(stages.map(s => [s.code, s.id]));
  
  console.log(`   Persons: ${persons.length}, Plots: ${plots.length}`);
  console.log(`   Sections: ${sections.length}, Statuses: ${statuses.length}, Stages: ${stages.length}`);
  
  // Create application
  console.log('\n🏗️ Creating test application...');
  const applicationData = {
    sellerId: persons[0].id,
    buyerId: persons[1].id,
    plotId: plots[0].id
  };
  
  const createResponse = await apiRequest('POST', '/api/applications', applicationData, adminToken);
  const applicationId = createResponse.data.application.id;
  console.log(`✅ Application created: ${applicationId}`);
  
  // Add some test attachments (simulate document uploads)
  console.log('\n📎 Adding test attachments...');
  const attachmentTypes = ['FORM_1', 'CNIC_SELLER', 'CNIC_BUYER', 'CHALLAN'];
  
  for (const docType of attachmentTypes) {
    try {
      // This would normally be a file upload, but we'll simulate it
      console.log(`   Adding ${docType}...`);
      // Note: In a real scenario, you'd upload actual files
      // For testing, we'll assume attachments exist or skip this step
    } catch (error) {
      console.log(`   ⚠️ Could not add ${docType}: ${error.message}`);
    }
  }
  
  // Create clearances for BCA, HOUSING, and ACCOUNTS
  console.log('\n✅ Creating clearances...');
  const clearanceSections = ['BCA', 'HOUSING', 'ACCOUNTS'];
  
  for (const sectionCode of clearanceSections) {
    const sectionId = sectionMap.get(sectionCode);
    const statusId = statusMap.get('CLEAR');
    
    if (sectionId && statusId) {
      await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
        sectionId,
        statusId,
        remarks: `${sectionCode} clearance approved for testing`
      }, adminToken);
      console.log(`   ✅ ${sectionCode} clearance created`);
    }
  }
  
  // Create accounts breakdown
  console.log('\n💰 Creating accounts breakdown...');
  try {
    await apiRequest('POST', `/api/applications/${applicationId}/accounts`, {
      arrears: '1000',
      surcharge: '100',
      nonUser: '500',
      transferFee: '2000',
      attorneyFee: '1000',
      water: '200',
      suiGas: '300',
      additional: '100'
    }, adminToken);
    console.log('✅ Accounts breakdown created');
  } catch (error) {
    console.log(`⚠️ Could not create accounts breakdown: ${error.message}`);
  }

  // Verify payment to move to ACCOUNTS_CLEAR
  console.log('\n💳 Verifying payment...');
  try {
    await apiRequest('POST', `/api/applications/${applicationId}/accounts/verify-payment`, {
      challanNumber: 'TEST-DISPATCH-' + Date.now(),
      paidAmount: '5200',
      remarks: 'Test payment verification for dispatch memo'
    }, adminToken);
    console.log('✅ Payment verified - moved to ACCOUNTS_CLEAR');
  } catch (error) {
    console.log(`⚠️ Could not verify payment: ${error.message}`);
  }
  
  // Create ACCOUNTS review to move to OWO_REVIEW_ACCOUNTS
  console.log('\n📝 Creating ACCOUNTS review...');
  try {
    const accountsSectionId = sectionMap.get('ACCOUNTS');
    
    await apiRequest('POST', `/api/applications/${applicationId}/reviews`, {
      sectionId: accountsSectionId,
      remarks: 'Accounts reviewed and approved by OWO for dispatch memo testing',
      status: 'APPROVED',
      autoTransition: true
    }, owoToken);
    console.log('✅ ACCOUNTS review created - moved to OWO_REVIEW_ACCOUNTS');
  } catch (error) {
    console.log(`⚠️ Could not create ACCOUNTS review: ${error.message}`);
  }
  
  // Get final application state
  console.log('\n📊 Final application state:');
  const finalResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, adminToken);
  const finalApp = finalResponse.data.application;
  
  console.log(`   Application ID: ${finalApp.id}`);
  console.log(`   Current Stage: ${finalApp.currentStage.name} (${finalApp.currentStage.code})`);
  console.log(`   Seller: ${finalApp.seller.name}`);
  console.log(`   Buyer: ${finalApp.buyer.name}`);
  console.log(`   Plot: ${finalApp.plot.plotNumber}`);
  console.log(`   Attachments: ${finalApp.attachments.length}`);
  console.log(`   Clearances: ${finalApp.clearances.length}`);
  console.log(`   Reviews: ${finalApp.reviews.length}`);
  
  if (finalApp.currentStage.code === 'OWO_REVIEW_ACCOUNTS') {
    console.log('\n🎉 SUCCESS! Application is ready for dispatch memo testing');
    console.log(`   Application ${applicationId} is in OWO_REVIEW_ACCOUNTS stage`);
    console.log('   Ready to transition to READY_FOR_APPROVAL');
    console.log('   This will trigger auto-generation of dispatch memo');
    
    return applicationId;
  } else {
    console.log('\n⚠️ Application is not in expected stage');
    console.log(`   Expected: OWO_REVIEW_ACCOUNTS`);
    console.log(`   Actual: ${finalApp.currentStage.code}`);
    
    return applicationId; // Return anyway for debugging
  }
}

async function runSetup() {
  console.log('🚀 Setting up test application for dispatch memo auto-generation testing\n');
  
  try {
    const applicationId = await setupTestApplication();
    
    console.log('\n🎯 SETUP COMPLETE');
    console.log(`Application ID: ${applicationId}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: node test-dispatch-memo-auto-generation.js');
    console.log('2. This will test the auto-generation of dispatch memo');
    console.log('3. The memo should contain Form #1, clearances, attachments, etc.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

runSetup().then(() => {
  console.log('\n🏁 Setup completed');
}).catch(error => {
  console.error('💥 Setup crashed:', error.message);
});
