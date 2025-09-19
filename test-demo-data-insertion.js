const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function login(username) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password: 'password123'
    });
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${username}:`, error.response?.data || error.message);
    return null;
  }
}

async function testDemoDataInsertion() {
  console.log('🚀 Testing Demo Data Insertion\n');

  // Login as admin
  console.log('1️⃣ Logging in as ADMIN...');
  const adminToken = await login('admin');
  if (!adminToken) {
    console.error('❌ Failed to login as admin');
    return;
  }
  console.log('   ✅ Login successful');

  // Check existing applications count
  console.log('\n2️⃣ Checking existing applications...');
  try {
    const existingResponse = await axios.get(`${BASE_URL}/api/applications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   📊 Existing applications: ${existingResponse.data.applications?.length || 0}`);
  } catch (error) {
    console.log('   ⚠️ Could not fetch existing applications');
  }

  // Insert demo data
  console.log('\n3️⃣ Inserting demo data...');
  try {
    const response = await axios.post(`${BASE_URL}/api/applications/demo/insert-data`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   ✅ Demo data insertion successful!');
    console.log(`   📊 Created ${response.data.count} applications`);
    
    console.log('\n   📋 Created Applications:');
    response.data.applications.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.applicationNo} - ${app.stage}`);
      console.log(`      Seller: ${app.seller}, Buyer: ${app.buyer}, Plot: ${app.plot}`);
    });

  } catch (error) {
    console.error('   ❌ Demo data insertion failed:', error.response?.data || error.message);
    return;
  }

  // Verify applications were created
  console.log('\n4️⃣ Verifying created applications...');
  try {
    const verifyResponse = await axios.get(`${BASE_URL}/api/applications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   ✅ Total applications now: ${verifyResponse.data.applications?.length || 0}`);

    // Check different stages
    const stageCount = {};
    verifyResponse.data.applications?.forEach(app => {
      const stage = app.currentStage?.name || 'Unknown';
      stageCount[stage] = (stageCount[stage] || 0) + 1;
    });

    console.log('\n   📊 Applications by stage:');
    Object.entries(stageCount).forEach(([stage, count]) => {
      console.log(`      ${stage}: ${count}`);
    });

  } catch (error) {
    console.error('   ❌ Verification failed:', error.response?.data || error.message);
  }

  // Test queues show mixed-stage cases
  console.log('\n5️⃣ Testing console queues...');
  
  // Test BCA console
  try {
    const bcaResponse = await axios.get(`${BASE_URL}/api/applications/bca/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   ✅ BCA Console: ${bcaResponse.data.applications?.length || 0} pending applications`);
  } catch (error) {
    console.log('   ⚠️ BCA Console check failed');
  }

  // Test Housing console
  try {
    const housingResponse = await axios.get(`${BASE_URL}/api/applications/housing/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   ✅ Housing Console: ${housingResponse.data.applications?.length || 0} pending applications`);
  } catch (error) {
    console.log('   ⚠️ Housing Console check failed');
  }

  console.log('\n🎉 Demo Data Insertion Test Complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Open http://localhost:3002 in browser');
  console.log('   2. Login as admin / password123');
  console.log('   3. Navigate to Admin Panel (/admin)');
  console.log('   4. Click "Insert Demo Data" button');
  console.log('   5. Verify queues show mixed-stage cases');
  console.log('   6. Open individual applications to verify they work without errors');
}

testDemoDataInsertion().catch(console.error);
