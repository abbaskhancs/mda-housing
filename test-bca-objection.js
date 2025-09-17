const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const ADMIN_USER = {
  username: 'admin',
  password: 'password123'
};

const BCA_USER = {
  username: 'bca_officer',
  password: 'password123'
};

let adminToken = '';
let bcaToken = '';
let testApplicationId = '';

async function loginAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_USER);
    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function loginBCA() {
  try {
    console.log('🔐 Logging in as BCA user...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, BCA_USER);
    bcaToken = response.data.token;
    console.log('✅ BCA login successful');
    return true;
  } catch (error) {
    console.error('❌ BCA login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestApplication() {
  try {
    console.log('📝 Creating test application...');
    
    // Get test data
    const [sellersResponse, buyersResponse, plotsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/persons?limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      axios.get(`${BASE_URL}/api/persons?limit=2`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      axios.get(`${BASE_URL}/api/plots?limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } })
    ]);

    const seller = sellersResponse.data.persons[0];
    const buyer = sellersResponse.data.persons[1] || buyersResponse.data.persons[0];
    const plot = plotsResponse.data.plots[0];

    if (!seller || !buyer || !plot) {
      throw new Error('Missing test data');
    }

    // Create application
    const applicationData = {
      sellerId: seller.id,
      buyerId: buyer.id,
      plotId: plot.id
    };

    const response = await axios.post(`${BASE_URL}/api/applications`, applicationData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    testApplicationId = response.data.application.id;
    console.log(`✅ Test application created: ${response.data.application.applicationNumber}`);
    
    return response.data.application;
  } catch (error) {
    console.error('❌ Failed to create test application:', error.response?.data || error.message);
    return null;
  }
}

async function testObjectionScenario() {
  try {
    console.log('\n🚨 Testing OBJECTION Scenario...');
    
    // Generate PDF first
    console.log('📄 Generating BCA clearance PDF...');
    const pdfResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/bca/generate-pdf`, {}, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });
    
    const pdfUrl = pdfResponse.data.signedUrl;
    console.log('✅ PDF generated');
    
    // Get section and status IDs
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, { headers: { Authorization: `Bearer ${bcaToken}` } }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, { headers: { Authorization: `Bearer ${bcaToken}` } })
    ]);

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const objectionStatus = statusesResponse.data.statuses.find(s => s.code === 'OBJECTION');

    if (!bcaSection || !objectionStatus) {
      throw new Error('BCA section or OBJECTION status not found');
    }

    // Check application status before objection
    const beforeResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });
    
    console.log(`📊 Before objection - Stage: ${beforeResponse.data.application.currentStage.name} (${beforeResponse.data.application.currentStage.code})`);

    // Create OBJECTION clearance
    const clearanceData = {
      sectionId: bcaSection.id,
      statusId: objectionStatus.id,
      remarks: 'Test objection: Building plans do not comply with safety regulations',
      signedPdfUrl: pdfUrl
    };

    console.log('💾 Saving OBJECTION clearance...');
    const clearanceResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, clearanceData, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });

    console.log('✅ OBJECTION clearance saved');
    
    // Check if auto-transition occurred
    if (clearanceResponse.data.autoTransition) {
      console.log('✅ Auto-transition occurred as expected');
      console.log(`   From: ${clearanceResponse.data.autoTransition.fromStage}`);
      console.log(`   To: ${clearanceResponse.data.autoTransition.toStage}`);
    } else {
      console.log('⚠️  No auto-transition occurred');
    }

    // Check application status after objection
    const afterResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });
    
    console.log(`📊 After objection - Stage: ${afterResponse.data.application.currentStage.name} (${afterResponse.data.application.currentStage.code})`);
    
    // Check clearances
    const bcaClearance = afterResponse.data.application.clearances.find(c => c.section.code === 'BCA');
    if (bcaClearance) {
      console.log(`📋 BCA Clearance Status: ${bcaClearance.status.name}`);
      console.log(`📝 BCA Clearance Remarks: ${bcaClearance.remarks}`);
    }
    
    // Verify the stage changed to ON_HOLD_BCA
    if (afterResponse.data.application.currentStage.code === 'ON_HOLD_BCA') {
      console.log('✅ SUCCESS: Application correctly moved to ON_HOLD_BCA stage');
      return true;
    } else {
      console.log(`❌ FAILURE: Expected ON_HOLD_BCA but got ${afterResponse.data.application.currentStage.code}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed objection test:', error.response?.data || error.message);
    return false;
  }
}

async function runObjectionTest() {
  console.log('🚀 Starting BCA OBJECTION Test\n');

  // Step 1: Login
  if (!(await loginAdmin()) || !(await loginBCA())) {
    return;
  }

  // Step 2: Create test application
  const application = await createTestApplication();
  if (!application) {
    return;
  }

  // Step 3: Test objection scenario
  const success = await testObjectionScenario();
  
  console.log('\n🎯 Test Results:');
  if (success) {
    console.log('✅ OBJECTION auto-transition test PASSED');
    console.log('✅ Application correctly moved to ON_HOLD_BCA stage');
    console.log('✅ BCA clearance with objection was saved');
  } else {
    console.log('❌ OBJECTION auto-transition test FAILED');
  }
}

// Run the test
runObjectionTest().catch(console.error);
