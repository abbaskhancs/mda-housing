const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let authToken = '';
let testApplicationId = '';

// Test credentials
const HOUSING_USER = {
  username: 'housing.officer',
  password: 'password123'
};

async function login() {
  try {
    console.log('🔐 Logging in as Housing Officer...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, HOUSING_USER);
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed - no token received');
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestApplication() {
  try {
    console.log('📝 Creating test application...');
    
    // First create persons
    const sellerResponse = await axios.post(`${BASE_URL}/api/persons`, {
      cnic: '12345-6789012-3',
      name: 'Test Seller Housing',
      fatherName: 'Father Name',
      address: 'Test Address',
      phone: '0300-1234567'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const buyerResponse = await axios.post(`${BASE_URL}/api/persons`, {
      cnic: '98765-4321098-7',
      name: 'Test Buyer Housing',
      fatherName: 'Father Name',
      address: 'Test Address',
      phone: '0300-7654321'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // Create plot
    const plotResponse = await axios.post(`${BASE_URL}/api/plots`, {
      plotNumber: 'H-TEST-001',
      blockNumber: 'H',
      sectorNumber: '1',
      area: 500,
      location: 'Test Housing Sector'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // Create application
    const applicationResponse = await axios.post(`${BASE_URL}/api/applications`, {
      sellerId: sellerResponse.data.person.id,
      buyerId: buyerResponse.data.person.id,
      plotId: plotResponse.data.plot.id,
      salePrice: 1000000,
      transferType: 'SALE'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    testApplicationId = applicationResponse.data.application.id;
    console.log(`✅ Test application created: ${applicationResponse.data.application.applicationNumber}`);
    
    return applicationResponse.data.application;
  } catch (error) {
    console.error('❌ Failed to create test application:', error.response?.data || error.message);
    return null;
  }
}

async function transitionToSentToBCAHousing() {
  try {
    console.log('🔄 Transitioning application to SENT_TO_BCA_HOUSING...');
    
    // Get stages
    const stagesResponse = await axios.get(`${BASE_URL}/api/workflow/stages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const sentToBCAHousingStage = stagesResponse.data.stages.find(s => s.code === 'SENT_TO_BCA_HOUSING');
    
    if (!sentToBCAHousingStage) {
      throw new Error('SENT_TO_BCA_HOUSING stage not found');
    }

    // Transition application
    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/transition`, {
      toStageId: sentToBCAHousingStage.id,
      remarks: 'Test transition to SENT_TO_BCA_HOUSING for housing console validation'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Application transitioned to SENT_TO_BCA_HOUSING');
    return true;
  } catch (error) {
    console.error('❌ Failed to transition application:', error.response?.data || error.message);
    return false;
  }
}

async function testHousingPendingEndpoint() {
  try {
    console.log('📋 Testing Housing pending applications endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/applications/housing/pending`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`✅ Found ${response.data.applications.length} pending Housing applications`);
    
    // Check if our test application is in the list
    const testApp = response.data.applications.find(app => app.id === testApplicationId);
    if (testApp) {
      console.log(`✅ Test application found in Housing pending list`);
      return response.data.applications;
    } else {
      console.log('⚠️  Test application not found in Housing pending list');
      return response.data.applications;
    }
  } catch (error) {
    console.error('❌ Failed to get Housing pending applications:', error.response?.data || error.message);
    return null;
  }
}

async function testPDFGeneration() {
  try {
    console.log('📄 Testing Housing clearance PDF generation...');
    
    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/housing/generate-pdf`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Housing clearance PDF generated successfully');
    console.log(`📎 PDF URL: ${response.data.signedUrl}`);
    
    return response.data.signedUrl;
  } catch (error) {
    console.error('❌ Failed to generate Housing clearance PDF:', error.response?.data || error.message);
    return null;
  }
}

async function testClearanceSave(pdfUrl, decision = 'CLEAR') {
  try {
    console.log(`💾 Testing clearance save with decision: ${decision}...`);
    
    // Get section and status IDs
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, { headers: { Authorization: `Bearer ${authToken}` } }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, { headers: { Authorization: `Bearer ${authToken}` } })
    ]);

    const housingSection = sectionsResponse.data.sections.find(s => s.code === 'HOUSING');
    const status = statusesResponse.data.statuses.find(s => s.code === decision);

    if (!housingSection || !status) {
      throw new Error('Housing section or status not found');
    }

    // Create clearance
    const clearanceData = {
      sectionId: housingSection.id,
      statusId: status.id,
      remarks: decision === 'OBJECTION' ? 'Test objection for Housing console validation' : 'Test clearance for Housing console validation',
      signedPdfUrl: pdfUrl
    };

    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, clearanceData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`✅ Clearance saved successfully with decision: ${decision}`);
    
    // Check if auto-transition occurred
    if (response.data.autoTransition) {
      console.log(`✅ Auto-transition occurred: ${response.data.autoTransition.fromStage?.code} → ${response.data.autoTransition.toStage?.code}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to save clearance:', error.response?.data || error.message);
    return null;
  }
}

async function testApplicationStatus() {
  try {
    console.log('🔍 Checking final application status...');
    
    const response = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const application = response.data.application;
    console.log(`📊 Application Status:`);
    console.log(`   Current Stage: ${application.currentStage.name}`);
    console.log(`   Clearances: ${application.clearances.length}`);
    
    application.clearances.forEach(clearance => {
      console.log(`   - ${clearance.section.name}: ${clearance.status.name}`);
    });
    
    return application;
  } catch (error) {
    console.error('❌ Failed to get application status:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Housing Console Tests\n');

  // Step 1: Login
  if (!(await login())) {
    return;
  }

  // Step 2: Create test application
  const application = await createTestApplication();
  if (!application) {
    return;
  }

  // Step 3: Transition to SENT_TO_BCA_HOUSING
  if (!(await transitionToSentToBCAHousing())) {
    return;
  }

  // Step 4: Test Housing pending endpoint
  const pendingApps = await testHousingPendingEndpoint();
  if (!pendingApps) {
    return;
  }

  // Step 5: Test PDF generation
  const pdfUrl = await testPDFGeneration();
  if (!pdfUrl) {
    return;
  }

  // Step 6: Test CLEAR decision
  console.log('\n--- Testing CLEAR Decision ---');
  const clearResult = await testClearanceSave(pdfUrl, 'CLEAR');
  if (clearResult) {
    await testApplicationStatus();
  }

  console.log('\n🎉 Housing Console Tests Completed!');
}

// Run the tests
runTests().catch(console.error);
