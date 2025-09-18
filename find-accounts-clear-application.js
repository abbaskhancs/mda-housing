const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
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

async function findApplicationsInStage(stageCodes, token) {
  console.log(`🔍 Looking for applications in stages: ${stageCodes.join(', ')}`);
  
  const applicationsResponse = await apiRequest('GET', '/api/applications', null, token);
  const applications = applicationsResponse.data.applications || [];
  
  console.log(`📊 Total applications found: ${applications.length}`);
  
  const stageApplications = {};
  stageCodes.forEach(code => {
    stageApplications[code] = [];
  });
  
  applications.forEach(app => {
    if (stageCodes.includes(app.currentStage.code)) {
      stageApplications[app.currentStage.code].push(app);
    }
  });
  
  stageCodes.forEach(code => {
    console.log(`📋 Applications in ${code}: ${stageApplications[code].length}`);
    stageApplications[code].forEach(app => {
      console.log(`   - ${app.id} (${app.seller?.name} → ${app.buyer?.name})`);
    });
  });
  
  return stageApplications;
}

async function createTestApplicationInAccountsClear(token) {
  console.log('🔧 Creating new test application and setting it up in ACCOUNTS_CLEAR...');
  
  // Get required data
  const [personsResponse, plotsResponse, sectionsResponse, statusesResponse, stagesResponse] = await Promise.all([
    apiRequest('GET', '/api/persons', null, token),
    apiRequest('GET', '/api/plots', null, token),
    apiRequest('GET', '/api/workflow/sections', null, token),
    apiRequest('GET', '/api/workflow/statuses', null, token),
    apiRequest('GET', '/api/workflow/stages', null, token)
  ]);
  
  const persons = personsResponse.data.persons || [];
  const plots = plotsResponse.data.plots || [];
  const sections = sectionsResponse.data.sections || [];
  const statuses = statusesResponse.data.statuses || [];
  const stages = stagesResponse.data.stages || [];
  
  const sectionMap = new Map(sections.map(s => [s.code, s.id]));
  const statusMap = new Map(statuses.map(s => [s.code, s.id]));
  const stageMap = new Map(stages.map(s => [s.code, s.id]));
  
  // Create application
  const applicationData = {
    sellerId: persons[0].id,
    buyerId: persons[1].id,
    plotId: plots[0].id,
    transferType: 'SALE',
    applicationDate: new Date().toISOString(),
    attachments: []
  };
  
  const createResponse = await apiRequest('POST', '/api/applications', applicationData, token);
  const applicationId = createResponse.data.application.id;
  console.log(`✅ Test application created: ${applicationId}`);
  
  // Create ACCOUNTS clearance
  await apiRequest('POST', `/api/applications/${applicationId}/clearances`, {
    sectionId: sectionMap.get('ACCOUNTS'),
    statusId: statusMap.get('CLEAR'),
    remarks: 'Accounts clearance approved for testing'
  }, token);
  console.log('✅ ACCOUNTS clearance created');
  
  // Try to move to ACCOUNTS_CLEAR stage by creating accounts breakdown and verifying payment
  try {
    // Create accounts breakdown
    await apiRequest('POST', `/api/applications/${applicationId}/accounts`, {
      arrears: 1000,
      surcharge: 100,
      nonUser: 500,
      transferFee: 2000,
      attorneyFee: 1000,
      water: 200,
      suiGas: 300,
      additional: 0
    }, token);
    console.log('✅ Accounts breakdown created');
    
    // Verify payment
    await apiRequest('POST', `/api/applications/${applicationId}/accounts/verify-payment`, {
      challanNumber: 'TEST-' + Date.now(),
      paidAmount: 5100,
      remarks: 'Test payment verification'
    }, token);
    console.log('✅ Payment verified');
    
  } catch (error) {
    console.log('⚠️  Could not set up accounts breakdown/payment:', error.response?.data?.message || error.message);
  }
  
  // Check final stage
  const finalResponse = await apiRequest('GET', `/api/applications/${applicationId}`, null, token);
  const finalApplication = finalResponse.data.application;
  console.log(`📊 Final stage: ${finalApplication.currentStage.name} (${finalApplication.currentStage.code})`);
  
  return applicationId;
}

async function runSearch() {
  console.log('🚀 Finding Applications in ACCOUNTS_CLEAR Stage...\n');
  
  try {
    const token = await login();
    console.log('✅ Login successful\n');
    
    // Look for applications in relevant stages
    const stageApplications = await findApplicationsInStage([
      'ACCOUNTS_CLEAR',
      'OWO_REVIEW_ACCOUNTS',
      'READY_FOR_APPROVAL',
      'ACCOUNTS_PENDING',
      'AWAITING_PAYMENT'
    ], token);
    
    console.log('');
    
    // If no applications in ACCOUNTS_CLEAR, create one
    if (stageApplications['ACCOUNTS_CLEAR'].length === 0) {
      console.log('⚠️  No applications found in ACCOUNTS_CLEAR stage');
      console.log('🔧 Creating a new test application...\n');
      
      const newApplicationId = await createTestApplicationInAccountsClear(token);
      console.log(`\n✅ New test application ready: ${newApplicationId}`);
    } else {
      console.log('✅ Found applications in ACCOUNTS_CLEAR stage');
      const accountsClearApp = stageApplications['ACCOUNTS_CLEAR'][0];
      console.log(`📋 Use this application for testing: ${accountsClearApp.id}`);
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error.message);
  }
}

runSearch().then(() => {
  console.log('\n🏁 Search completed');
}).catch(error => {
  console.error('💥 Search crashed:', error.message);
});
