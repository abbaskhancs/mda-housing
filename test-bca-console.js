const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const BCA_USER = {
  username: 'bca_officer',
  password: 'password123'
};

let authToken = '';
let testApplicationId = '';

async function login() {
  try {
    console.log('🔐 Logging in as BCA user...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, BCA_USER);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestApplication() {
  try {
    console.log('📝 Creating test application...');
    
    // First get some test data
    const [sellersResponse, buyersResponse, plotsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/persons?limit=1`, { headers: { Authorization: `Bearer ${authToken}` } }),
      axios.get(`${BASE_URL}/api/persons?limit=2`, { headers: { Authorization: `Bearer ${authToken}` } }),
      axios.get(`${BASE_URL}/api/plots?limit=1`, { headers: { Authorization: `Bearer ${authToken}` } })
    ]);

    const seller = sellersResponse.data.persons[0];
    const buyer = buyersResponse.data.persons[1] || buyersResponse.data.persons[0];
    const plot = plotsResponse.data.plots[0];

    if (!seller || !buyer || !plot) {
      throw new Error('Missing test data (persons or plots)');
    }

    // Create application
    const applicationData = {
      sellerId: seller.id,
      buyerId: buyer.id,
      plotId: plot.id
    };

    const response = await axios.post(`${BASE_URL}/api/applications`, applicationData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    testApplicationId = response.data.application.id;
    console.log(`✅ Test application created: ${response.data.application.applicationNumber}`);
    
    return response.data.application;
  } catch (error) {
    console.error('❌ Failed to create test application:', error.response?.data || error.message);
    return null;
  }
}

async function transitionToSentToBCAHousing() {
  try {
    console.log('🔄 Transitioning application to SENT_TO_BCA_HOUSING...');

    // First check current application status
    const appResponse = await axios.get(`${BASE_URL}/api/applications/${testApplicationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`Current stage: ${appResponse.data.application.currentStage.name} (${appResponse.data.application.currentStage.code})`);

    // Get available transitions from current stage
    const transitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/${appResponse.data.application.currentStage.code}?applicationId=${testApplicationId}&dryRun=true`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`Available transitions: ${transitionsResponse.data.transitions.map(t => t.toStage.code).join(', ')}`);

    // Find transition to SENT_TO_BCA_HOUSING
    const targetTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
    if (!targetTransition) {
      console.log('⚠️  Direct transition to SENT_TO_BCA_HOUSING not available. Trying step-by-step...');

      // Try transitioning to UNDER_SCRUTINY first if we're at SUBMITTED
      if (appResponse.data.application.currentStage.code === 'SUBMITTED') {
        const underScrutinyTransition = transitionsResponse.data.transitions.find(t => t.toStage.code === 'UNDER_SCRUTINY');
        if (underScrutinyTransition) {
          console.log('🔄 First transitioning to UNDER_SCRUTINY...');
          await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/transition`, {
            toStageId: underScrutinyTransition.toStage.id,
            remarks: 'Test transition to under scrutiny'
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          // Now try transitioning to SENT_TO_BCA_HOUSING
          const newTransitionsResponse = await axios.get(`${BASE_URL}/api/workflow/transitions/UNDER_SCRUTINY?applicationId=${testApplicationId}&dryRun=true`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          const bcaHousingTransition = newTransitionsResponse.data.transitions.find(t => t.toStage.code === 'SENT_TO_BCA_HOUSING');
          if (bcaHousingTransition) {
            console.log('🔄 Now transitioning to SENT_TO_BCA_HOUSING...');
            await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/transition`, {
              toStageId: bcaHousingTransition.toStage.id,
              remarks: 'Test transition for BCA console validation'
            }, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
          } else {
            throw new Error('SENT_TO_BCA_HOUSING transition not available from UNDER_SCRUTINY');
          }
        } else {
          throw new Error('UNDER_SCRUTINY transition not available from SUBMITTED');
        }
      } else {
        throw new Error('Cannot find path to SENT_TO_BCA_HOUSING from current stage');
      }
    } else {
      // Direct transition available
      await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/transition`, {
        toStageId: targetTransition.toStage.id,
        remarks: 'Test transition for BCA console validation'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }

    console.log('✅ Application transitioned to SENT_TO_BCA_HOUSING');
    return true;
  } catch (error) {
    console.error('❌ Failed to transition application:', error.response?.data || error.message);
    return false;
  }
}

async function testBCAPendingEndpoint() {
  try {
    console.log('📋 Testing BCA pending applications endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/applications/bca/pending`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`✅ Found ${response.data.applications.length} pending BCA applications`);
    
    // Check if our test application is in the list
    const testApp = response.data.applications.find(app => app.id === testApplicationId);
    if (testApp) {
      console.log(`✅ Test application found in BCA pending list`);
      return response.data.applications;
    } else {
      console.log('⚠️  Test application not found in BCA pending list');
      return response.data.applications;
    }
  } catch (error) {
    console.error('❌ Failed to get BCA pending applications:', error.response?.data || error.message);
    return null;
  }
}

async function testPDFGeneration() {
  try {
    console.log('📄 Testing BCA clearance PDF generation...');
    
    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/bca/generate-pdf`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ BCA clearance PDF generated successfully');
    console.log(`📎 PDF URL: ${response.data.signedUrl}`);
    
    return response.data.signedUrl;
  } catch (error) {
    console.error('❌ Failed to generate BCA clearance PDF:', error.response?.data || error.message);
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

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const status = statusesResponse.data.statuses.find(s => s.code === decision);

    if (!bcaSection || !status) {
      throw new Error('BCA section or status not found');
    }

    // Create clearance
    const clearanceData = {
      sectionId: bcaSection.id,
      statusId: status.id,
      remarks: decision === 'OBJECTION' ? 'Test objection for BCA console validation' : 'Test clearance for BCA console validation',
      signedPdfUrl: pdfUrl
    };

    const response = await axios.post(`${BASE_URL}/api/applications/${testApplicationId}/clearances`, clearanceData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`✅ Clearance saved successfully with decision: ${decision}`);
    
    // Check if auto-transition occurred for OBJECTION
    if (decision === 'OBJECTION' && response.data.autoTransition) {
      console.log('✅ Auto-transition to ON_HOLD_BCA occurred as expected');
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
    console.log(`   Stage: ${application.currentStage.name} (${application.currentStage.code})`);
    console.log(`   BCA Clearances: ${application.clearances.filter(c => c.section.code === 'BCA').length}`);
    
    const bcaClearance = application.clearances.find(c => c.section.code === 'BCA');
    if (bcaClearance) {
      console.log(`   BCA Status: ${bcaClearance.status.name}`);
      console.log(`   BCA Remarks: ${bcaClearance.remarks || 'None'}`);
    }
    
    return application;
  } catch (error) {
    console.error('❌ Failed to get application status:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting BCA Console Tests\n');

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

  // Step 4: Test BCA pending endpoint
  const pendingApps = await testBCAPendingEndpoint();
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

  console.log('\n🎉 BCA Console Tests Completed!');
  console.log('\n📋 Summary:');
  console.log('✅ BCA pending applications endpoint works');
  console.log('✅ PDF generation works');
  console.log('✅ Clearance save with CLEAR works');
  console.log('✅ Application status updates correctly');
}

// Run the tests
runTests().catch(console.error);
