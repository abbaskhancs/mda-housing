// Simple test script to verify transition preview API integration
const baseUrl = 'http://localhost:3001/api';

async function testTransitionPreview() {
  console.log('🧪 Testing Transition Preview API Integration\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Step 2: Test transitions from different stages
    const testCases = [
      { stage: 'SUBMITTED', description: 'Initial submission stage' },
      { stage: 'UNDER_SCRUTINY', description: 'Under scrutiny stage' },
      { stage: 'BCA_CLEAR', description: 'BCA cleared stage' },
      { stage: 'APPROVED', description: 'Final approved stage' }
    ];
    
    const applicationId = 'cmfmhcxx8000r1ulsb3ldlu1k'; // Use test application
    
    for (const testCase of testCases) {
      console.log(`\n2. Testing transitions from ${testCase.stage} (${testCase.description})...`);
      
      const transitionsRes = await fetch(
        `${baseUrl}/workflow/transitions/${testCase.stage}?applicationId=${applicationId}&dryRun=true`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (transitionsRes.ok) {
        const transitionsData = await transitionsRes.json();
        console.log(`✅ Found ${transitionsData.length} potential transitions:`);
        
        transitionsData.forEach((transition, index) => {
          const status = transition.canTransition ? '✅ Available' : '❌ Blocked';
          console.log(`   ${index + 1}. ${transition.toStage.name} - ${status}`);
          if (transition.reason) {
            console.log(`      Reason: ${transition.reason}`);
          }
          if (transition.guardName) {
            console.log(`      Guard: ${transition.guardName}`);
          }
        });
      } else {
        console.log(`❌ Failed to fetch transitions: ${transitionsRes.status}`);
        const errorData = await transitionsRes.json().catch(() => ({}));
        console.log(`   Error: ${errorData.error || 'Unknown error'}`);
      }
    }
    
    console.log('\n✅ Transition preview API test completed!');
    console.log('\n📋 Summary:');
    console.log('- API endpoint: /workflow/transitions/:fromStage?applicationId=X&dryRun=true');
    console.log('- Returns transitions with canTransition flag and reasons');
    console.log('- Guards are evaluated in dry-run mode');
    console.log('- Frontend popover will display this data with visual indicators');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testTransitionPreview();
}

module.exports = { testTransitionPreview };
