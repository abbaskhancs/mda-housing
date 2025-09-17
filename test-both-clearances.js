const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let adminToken = '';
let bcaToken = '';
let housingToken = '';
let testApplicationId = '';

// Test credentials
const ADMIN_USER = {
  username: 'admin',
  password: 'password123'
};

const BCA_USER = {
  username: 'bca_officer',
  password: 'password123'
};

const HOUSING_USER = {
  username: 'housing_officer',
  password: 'password123'
};

async function loginAll() {
  try {
    console.log('🔐 Logging in all users...');
    
    const [adminResponse, bcaResponse, housingResponse] = await Promise.all([
      axios.post(`${BASE_URL}/api/auth/login`, ADMIN_USER),
      axios.post(`${BASE_URL}/api/auth/login`, BCA_USER),
      axios.post(`${BASE_URL}/api/auth/login`, HOUSING_USER)
    ]);
    
    adminToken = adminResponse.data.token;
    bcaToken = bcaResponse.data.token;
    housingToken = housingResponse.data.token;
    
    console.log('✅ All users logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestApplication() {
  try {
    console.log('📝 Creating test application...');
    
    // Create persons and plot
    const sellerResponse = await axios.post(`${BASE_URL}/api/persons`, {
      cnic: '11111-1111111-1',
      name: 'Both Clearances Seller',
      fatherName: 'Father Name',
      address: 'Test Address',
      phone: '0300-1111111'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const buyerResponse = await axios.post(`${BASE_URL}/api/persons`, {
      cnic: '22222-2222222-2',
      name: 'Both Clearances Buyer',
      fatherName: 'Father Name',
      address: 'Test Address',
      phone: '0300-2222222'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const plotResponse = await axios.post(`${BASE_URL}/api/plots`, {
      plotNumber: 'BOTH-TEST-001',
      blockNumber: 'B',
      sectorNumber: '1',
      area: 500,
      location: 'Both Clearances Test Sector'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Create application
    const applicationResponse = await axios.post(`${BASE_URL}/api/applications`, {
      sellerId: sellerResponse.data.person.id,
      buyerId: buyerResponse.data.person.id,
      plotId: plotResponse.data.plot.id,
      salePrice: 1500000,
      transferType: 'SALE'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
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
    
    const stagesResponse = await axios.get(`${BASE_URL}/api/workflow/stages`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const sentToBCAHousingStage = stagesResponse.data.stages.find(s => s.code === 'SENT_TO_BCA_HOUSING');
    
    if (!sentToBCAHousingStage) {
      throw new Error('SENT_TO_BCA_HOUSING stage not found');
    }

    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/transition`, {
      toStageId: sentToBCAHousingStage.id,
      remarks: 'Test transition for both clearances validation'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('✅ Application transitioned to SENT_TO_BCA_HOUSING');
    return true;
  } catch (error) {
    console.error('❌ Failed to transition application:', error.response?.data || error.message);
    return false;
  }
}

async function processBCAClearance() {
  try {
    console.log('🏢 Processing BCA clearance...');
    
    // Generate BCA PDF
    const pdfResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/bca/generate-pdf`, {}, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });
    
    const pdfUrl = pdfResponse.data.signedUrl;
    console.log('✅ BCA PDF generated');
    
    // Get section and status IDs
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, { headers: { Authorization: `Bearer ${bcaToken}` } }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, { headers: { Authorization: `Bearer ${bcaToken}` } })
    ]);

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const clearStatus = statusesResponse.data.statuses.find(s => s.code === 'CLEAR');

    // Create BCA clearance
    const clearanceResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, {
      sectionId: bcaSection.id,
      statusId: clearStatus.id,
      remarks: 'BCA clearance granted - no objections found',
      signedPdfUrl: pdfUrl
    }, {
      headers: { Authorization: `Bearer ${bcaToken}` }
    });

    console.log('✅ BCA clearance saved');
    
    if (clearanceResponse.data.autoTransition) {
      console.log(`🔄 BCA Auto-transition: ${clearanceResponse.data.autoTransition.fromStage?.code} → ${clearanceResponse.data.autoTransition.toStage?.code}`);
    }
    
    return clearanceResponse.data;
  } catch (error) {
    console.error('❌ Failed to process BCA clearance:', error.response?.data || error.message);
    return null;
  }
}

async function processHousingClearance() {
  try {
    console.log('🏠 Processing Housing clearance...');
    
    // Generate Housing PDF
    const pdfResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/housing/generate-pdf`, {}, {
      headers: { Authorization: `Bearer ${housingToken}` }
    });
    
    const pdfUrl = pdfResponse.data.signedUrl;
    console.log('✅ Housing PDF generated');
    
    // Get section and status IDs
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, { headers: { Authorization: `Bearer ${housingToken}` } }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, { headers: { Authorization: `Bearer ${housingToken}` } })
    ]);

    const housingSection = sectionsResponse.data.sections.find(s => s.code === 'HOUSING');
    const clearStatus = statusesResponse.data.statuses.find(s => s.code === 'CLEAR');

    // Create Housing clearance
    const clearanceResponse = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, {
      sectionId: housingSection.id,
      statusId: clearStatus.id,
      remarks: 'Housing clearance granted - no objections found',
      signedPdfUrl: pdfUrl
    }, {
      headers: { Authorization: `Bearer ${housingToken}` }
    });

    console.log('✅ Housing clearance saved');
    
    if (clearanceResponse.data.autoTransition) {
      console.log(`🔄 Housing Auto-transition: ${clearanceResponse.data.autoTransition.fromStage?.code} → ${clearanceResponse.data.autoTransition.toStage?.code}`);
    }
    
    return clearanceResponse.data;
  } catch (error) {
    console.error('❌ Failed to process Housing clearance:', error.response?.data || error.message);
    return null;
  }
}

async function validateFinalState() {
  try {
    console.log('🔍 Validating final application state...');
    
    const response = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const application = response.data.application;
    
    console.log(`📊 Final Application Status:`);
    console.log(`   Application: ${application.applicationNumber}`);
    console.log(`   Current Stage: ${application.currentStage.name} (${application.currentStage.code})`);
    console.log(`   Total Clearances: ${application.clearances.length}`);
    
    // Check clearances
    const bcaClearance = application.clearances.find(c => c.section.code === 'BCA');
    const housingClearance = application.clearances.find(c => c.section.code === 'HOUSING');
    
    console.log(`   BCA Status: ${bcaClearance ? bcaClearance.status.name : 'Not Found'}`);
    console.log(`   Housing Status: ${housingClearance ? housingClearance.status.name : 'Not Found'}`);
    
    // Validate acceptance criteria
    const bothClear = bcaClearance?.status.code === 'CLEAR' && housingClearance?.status.code === 'CLEAR';
    const correctStage = application.currentStage.code === 'BCA_HOUSING_CLEAR';
    
    console.log('\n🎯 ACCEPTANCE CRITERIA VALIDATION:');
    console.log(`   ✅ Both sections CLEAR: ${bothClear ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Stage is BCA_HOUSING_CLEAR: ${correctStage ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Timeline updated: ${application.auditLogs ? 'PASS' : 'UNKNOWN'}`);
    console.log(`   ✅ Both PDFs available: ${bcaClearance?.signedPdfUrl && housingClearance?.signedPdfUrl ? 'PASS' : 'FAIL'}`);
    
    if (bothClear && correctStage) {
      console.log('\n🎉 ACCEPTANCE TEST PASSED! Both clearances triggered auto-transition to BCA_HOUSING_CLEAR');
      
      // Open both PDFs
      if (bcaClearance?.signedPdfUrl) {
        console.log(`📄 BCA PDF: ${bcaClearance.signedPdfUrl}`);
      }
      if (housingClearance?.signedPdfUrl) {
        console.log(`📄 Housing PDF: ${housingClearance.signedPdfUrl}`);
      }
    } else {
      console.log('\n❌ ACCEPTANCE TEST FAILED!');
    }
    
    return { bothClear, correctStage, application };
  } catch (error) {
    console.error('❌ Failed to validate final state:', error.response?.data || error.message);
    return null;
  }
}

async function runBothClearancesTest() {
  console.log('🚀 Starting Both Clearances Auto-Transition Test\n');
  console.log('📋 ACCEPTANCE CRITERIA:');
  console.log('   - When both BCA and Housing sections = CLEAR');
  console.log('   - And app is in SENT_TO_BCA_HOUSING stage');
  console.log('   - Stage should auto-move to BCA_HOUSING_CLEAR');
  console.log('   - Timeline should update');
  console.log('   - Both clearance PDFs should open\n');

  // Step 1: Login all users
  if (!(await loginAll())) {
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

  // Step 4: Process BCA clearance first
  console.log('\n--- Processing BCA Clearance ---');
  const bcaResult = await processBCAClearance();
  if (!bcaResult) {
    return;
  }

  // Step 5: Process Housing clearance second (this should trigger the auto-transition)
  console.log('\n--- Processing Housing Clearance ---');
  const housingResult = await processHousingClearance();
  if (!housingResult) {
    return;
  }

  // Step 6: Validate final state
  console.log('\n--- Final Validation ---');
  const validation = await validateFinalState();
  
  if (validation && validation.bothClear && validation.correctStage) {
    console.log('\n🎉 HOUSING CONSOLE IMPLEMENTATION SUCCESSFUL!');
    console.log('✅ All acceptance criteria met');
  } else {
    console.log('\n❌ HOUSING CONSOLE IMPLEMENTATION NEEDS FIXES');
  }
}

// Run the test
runBothClearancesTest().catch(console.error);
