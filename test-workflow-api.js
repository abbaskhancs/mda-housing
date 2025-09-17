const fetch = require('node-fetch');

// Test Workflow API directly
async function testWorkflowAPI() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing Workflow API for Guard-Aware Actions');
  
  try {
    // Step 1: Login
    console.log('\n1. Logging in...');
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
    
    // Step 2: Test transitions from SUBMITTED stage
    console.log('\n2. Testing transitions from SUBMITTED stage...');
    const applicationId = 'cmfmhcxx8000r1ulsb3ldlu1k'; // Use the test application
    
    const transitionsRes = await fetch(`${baseUrl}/workflow/transitions/SUBMITTED?applicationId=${applicationId}&dryRun=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!transitionsRes.ok) {
      throw new Error(`Failed to get transitions: ${transitionsRes.status} ${await transitionsRes.text()}`);
    }
    
    const transitionsData = await transitionsRes.json();
    console.log('✅ Transitions API response received');
    
    console.log('\n📋 API Response Structure:');
    console.log('- fromStage:', transitionsData.fromStage?.name || 'N/A');
    console.log('- transitions count:', transitionsData.transitions?.length || 0);
    
    if (transitionsData.transitions && transitionsData.transitions.length > 0) {
      console.log('\n🔄 Available Transitions:');
      
      transitionsData.transitions.forEach((transition, index) => {
        console.log(`\n${index + 1}. ${transition.toStage.name} (${transition.toStage.code})`);
        console.log(`   Guard: ${transition.guardName}`);
        
        if (transition.guardResult) {
          console.log(`   Can Transition: ${transition.guardResult.canTransition ? '✅ YES' : '❌ NO'}`);
          console.log(`   Reason: ${transition.guardResult.reason}`);
          
          if (transition.guardResult.metadata) {
            console.log(`   Metadata: ${JSON.stringify(transition.guardResult.metadata)}`);
          }
        } else {
          console.log('   ⚠️  No guard result (unexpected)');
        }
      });
      
      // Test specific requirements
      console.log('\n📊 Validation Results:');
      
      const enabledTransitions = transitionsData.transitions.filter(t => 
        t.guardResult && t.guardResult.canTransition
      );
      const disabledTransitions = transitionsData.transitions.filter(t => 
        t.guardResult && !t.guardResult.canTransition
      );
      
      console.log(`   ✅ Enabled transitions: ${enabledTransitions.length}`);
      console.log(`   ❌ Disabled transitions: ${disabledTransitions.length}`);
      
      // Check for BCA & Housing transition
      const bcaHousingTransition = transitionsData.transitions.find(t => 
        t.toStage.code === 'BCA_HOUSING_CLEARANCE' || 
        (t.toStage.name.toLowerCase().includes('bca') && t.toStage.name.toLowerCase().includes('housing'))
      );
      
      if (bcaHousingTransition) {
        console.log(`   🏢 BCA & Housing transition found: ${bcaHousingTransition.guardResult?.canTransition ? '✅ ENABLED' : '❌ DISABLED'}`);
        if (!bcaHousingTransition.guardResult?.canTransition) {
          console.log(`      Reason: ${bcaHousingTransition.guardResult?.reason}`);
        }
      } else {
        console.log('   🏢 BCA & Housing transition: ❓ NOT FOUND');
      }
      
      // Test guard evaluation completeness
      const allHaveGuardResults = transitionsData.transitions.every(t => t.guardResult !== undefined);
      console.log(`   🛡️  All guards evaluated: ${allHaveGuardResults ? '✅ YES' : '❌ NO'}`);
      
      // Test blocked action reasons
      const blockedWithReasons = disabledTransitions.every(t => 
        t.guardResult && t.guardResult.reason && t.guardResult.reason.trim().length > 0
      );
      console.log(`   📝 Blocked actions have reasons: ${blockedWithReasons ? '✅ YES' : '❌ NO'}`);
      
      console.log('\n🎯 Test Summary:');
      const hasTransitions = transitionsData.transitions.length > 0;
      const hasDisabled = disabledTransitions.length > 0;
      const hasEnabled = enabledTransitions.length > 0;
      
      console.log(`   - Has transitions: ${hasTransitions ? '✅' : '❌'}`);
      console.log(`   - Has enabled actions: ${hasEnabled ? '✅' : '❌'}`);
      console.log(`   - Has disabled actions: ${hasDisabled ? '✅' : '❌'}`);
      console.log(`   - Guards evaluated: ${allHaveGuardResults ? '✅' : '❌'}`);
      console.log(`   - Reasons provided: ${blockedWithReasons ? '✅' : '❌'}`);
      
      const allTestsPassed = hasTransitions && hasDisabled && allHaveGuardResults && blockedWithReasons;
      console.log(`\n🏆 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
      
      if (allTestsPassed) {
        console.log('\n✅ Guard-aware workflow API is working correctly!');
        console.log('   - Transitions are fetched with guard evaluation');
        console.log('   - Guards are evaluated for all transitions');
        console.log('   - Disabled actions provide clear reasons');
        console.log('   - API response structure is correct');
      }
      
    } else {
      console.log('❌ No transitions found');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWorkflowAPI().then(() => {
  console.log('\n🏁 Workflow API test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
