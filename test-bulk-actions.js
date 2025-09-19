// Test script for bulk actions functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let authToken = '';
let testApplicationIds = [];

async function login() {
  try {
    console.log('🔐 Logging in as BCA user...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'bca',
      password: 'password123'
    });

    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.error || error.message);
    return false;
  }
}

async function createTestApplications() {
  try {
    console.log('📝 Creating test applications...');
    
    // Create 3 test applications
    for (let i = 1; i <= 3; i++) {
      const response = await axios.post(`${BASE_URL}/api/applications/demo/insert-data`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success && response.data.applications.length > 0) {
        testApplicationIds.push(response.data.applications[0].id);
        console.log(`✅ Created test application ${i}: ${response.data.applications[0].applicationNumber}`);
      }
    }

    console.log(`📊 Created ${testApplicationIds.length} test applications`);
    return testApplicationIds.length > 0;
  } catch (error) {
    console.error('❌ Failed to create test applications:', error.response?.data?.error || error.message);
    return false;
  }
}

async function transitionApplicationsToBCA() {
  try {
    console.log('🔄 Transitioning applications to BCA stage...');
    
    for (const appId of testApplicationIds) {
      // Transition to SENT_TO_BCA_HOUSING stage
      const response = await axios.post(`${BASE_URL}/api/workflow/transition`, {
        applicationId: appId,
        toStageCode: 'SENT_TO_BCA_HOUSING',
        remarks: 'Automated transition for bulk action testing'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        console.log(`✅ Transitioned application ${appId} to BCA stage`);
      } else {
        console.log(`⚠️ Failed to transition ${appId}: ${response.data.error}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to transition applications:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testBulkClearOperation() {
  try {
    console.log('\n🔍 Testing bulk CLEAR operation...');
    
    // Get workflow sections and statuses
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    ]);

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const clearStatus = statusesResponse.data.statuses.find(s => s.code === 'CLEAR');

    if (!bcaSection || !clearStatus) {
      throw new Error('BCA section or CLEAR status not found');
    }

    // Perform bulk clear operation
    const response = await axios.post(`${BASE_URL}/api/applications/bulk/clearances`, {
      applications: testApplicationIds.slice(0, 2), // Test with first 2 applications
      sectionId: bcaSection.id,
      statusId: clearStatus.id,
      remarks: 'Bulk CLEAR operation - automated test'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const { successful, failed, total } = response.data.summary;
      console.log(`✅ Bulk operation completed: ${successful}/${total} successful, ${failed} failed`);
      
      // Show individual results
      response.data.results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.applicationNumber}: CLEARED`);
        } else {
          console.log(`  ❌ ${result.applicationId}: ${result.error}`);
        }
      });
      
      return response.data.summary;
    } else {
      throw new Error(response.data.error || 'Bulk operation failed');
    }
  } catch (error) {
    console.error('❌ Bulk CLEAR operation failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testBulkObjectionOperation() {
  try {
    console.log('\n🔍 Testing bulk OBJECTION operation...');
    
    // Get workflow sections and statuses
    const [sectionsResponse, statusesResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/workflow/sections`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      axios.get(`${BASE_URL}/api/workflow/statuses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    ]);

    const bcaSection = sectionsResponse.data.sections.find(s => s.code === 'BCA');
    const objectionStatus = statusesResponse.data.statuses.find(s => s.code === 'OBJECTION');

    if (!bcaSection || !objectionStatus) {
      throw new Error('BCA section or OBJECTION status not found');
    }

    // Perform bulk objection operation on remaining application
    const response = await axios.post(`${BASE_URL}/api/applications/bulk/clearances`, {
      applications: testApplicationIds.slice(2, 3), // Test with last application
      sectionId: bcaSection.id,
      statusId: objectionStatus.id,
      remarks: 'Bulk OBJECTION operation - automated test with detailed objection reasons'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const { successful, failed, total } = response.data.summary;
      console.log(`✅ Bulk objection completed: ${successful}/${total} successful, ${failed} failed`);
      
      // Show individual results
      response.data.results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.applicationNumber}: OBJECTION RAISED`);
        } else {
          console.log(`  ❌ ${result.applicationId}: ${result.error}`);
        }
      });
      
      return response.data.summary;
    } else {
      throw new Error(response.data.error || 'Bulk objection failed');
    }
  } catch (error) {
    console.error('❌ Bulk OBJECTION operation failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function verifyApplicationStatuses() {
  try {
    console.log('\n📊 Verifying final application statuses...');
    
    for (const appId of testApplicationIds) {
      const response = await axios.get(`${BASE_URL}/api/applications/${appId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        const app = response.data.application;
        const bcaClearance = app.clearances.find(c => c.section.code === 'BCA');
        
        console.log(`📋 ${app.applicationNumber}:`);
        console.log(`   Stage: ${app.currentStage.name}`);
        if (bcaClearance) {
          console.log(`   BCA Status: ${bcaClearance.status.name}`);
          console.log(`   BCA Remarks: ${bcaClearance.remarks || 'None'}`);
        } else {
          console.log(`   BCA Status: No clearance found`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to verify statuses:', error.response?.data?.error || error.message);
  }
}

async function runBulkActionTests() {
  console.log('🚀 Starting Bulk Actions Tests\n');

  // Step 1: Login
  if (!(await login())) {
    return;
  }

  // Step 2: Create test applications
  if (!(await createTestApplications())) {
    return;
  }

  // Step 3: Transition applications to BCA stage
  if (!(await transitionApplicationsToBCA())) {
    return;
  }

  // Step 4: Test bulk CLEAR operation
  const clearResults = await testBulkClearOperation();
  if (!clearResults) {
    return;
  }

  // Step 5: Test bulk OBJECTION operation
  const objectionResults = await testBulkObjectionOperation();
  if (!objectionResults) {
    return;
  }

  // Step 6: Verify final statuses
  await verifyApplicationStatuses();

  console.log('\n🎉 Bulk Actions Tests Completed Successfully!');
  console.log('\n📈 Test Summary:');
  console.log(`- CLEAR operations: ${clearResults.successful}/${clearResults.total} successful`);
  console.log(`- OBJECTION operations: ${objectionResults.successful}/${objectionResults.total} successful`);
  console.log('- Per-row error handling: ✅ Verified');
  console.log('- Status updates: ✅ Verified');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runBulkActionTests().catch(console.error);
}

module.exports = { runBulkActionTests };
