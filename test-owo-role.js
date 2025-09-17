const fetch = require('node-fetch');

// Test OWO role permissions
async function testOWORole() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing OWO Role Permissions');
  
  try {
    // Step 1: Login as OWO officer
    console.log('\n1. Logging in as OWO officer...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'owo_officer',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`OWO login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ OWO login successful');
    
    // Step 2: Test transitions from UNDER_SCRUTINY as OWO
    console.log('\n2. Testing UNDER_SCRUTINY transitions as OWO...');
    
    const dummyAppId = 'cmfmhcxx8000r1ulsb3ldlu1k';
    
    const transitionsRes = await fetch(`${baseUrl}/workflow/transitions/UNDER_SCRUTINY?applicationId=${dummyAppId}&dryRun=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!transitionsRes.ok) {
      throw new Error(`Failed to get UNDER_SCRUTINY transitions: ${transitionsRes.status}`);
    }
    
    const transitionsData = await transitionsRes.json();
    console.log('✅ UNDER_SCRUTINY transitions retrieved as OWO');
    
    console.log('\n🔄 Transitions from UNDER_SCRUTINY (as OWO):');
    
    if (transitionsData.transitions && transitionsData.transitions.length > 0) {
      let bcaHousingFound = false;
      let enabledCount = 0;
      let disabledCount = 0;
      let enabledTransitions = [];
      
      transitionsData.transitions.forEach((transition, index) => {
        console.log(`\n${index + 1}. ${transition.toStage.name} (${transition.toStage.code})`);
        console.log(`   Guard: ${transition.guardName}`);
        
        if (transition.guardResult) {
          const canTransition = transition.guardResult.canTransition;
          console.log(`   Can Transition: ${canTransition ? '✅ YES' : '❌ NO'}`);
          console.log(`   Reason: ${transition.guardResult.reason}`);
          
          if (canTransition) {
            enabledCount++;
            enabledTransitions.push(transition.toStage.name);
          } else {
            disabledCount++;
          }
          
          // Check if this is a BCA & Housing related transition
          if (transition.toStage.code.includes('BCA') || transition.toStage.code.includes('HOUSING') ||
              transition.toStage.name.toLowerCase().includes('bca') || 
              transition.toStage.name.toLowerCase().includes('housing')) {
            bcaHousingFound = true;
            console.log(`   🎯 This is a BCA/Housing related transition!`);
          }
          
          if (transition.guardResult.metadata) {
            console.log(`   Metadata: ${JSON.stringify(transition.guardResult.metadata)}`);
          }
        }
      });
      
      console.log('\n📊 OWO Test Results:');
      console.log(`   Total transitions: ${transitionsData.transitions.length}`);
      console.log(`   Enabled: ${enabledCount}`);
      console.log(`   Disabled: ${disabledCount}`);
      console.log(`   Enabled transitions: ${enabledTransitions.join(', ')}`);
      console.log(`   BCA/Housing related found: ${bcaHousingFound ? '✅ YES' : '❌ NO'}`);
      
      // Check the specific requirement
      if (enabledCount === 1 && enabledTransitions.length === 1) {
        console.log(`\n✅ REQUIREMENT CHECK: Only one transition enabled: "${enabledTransitions[0]}"`);
        
        // Check if it's BCA & Housing related
        const enabledTransition = transitionsData.transitions.find(t => t.guardResult?.canTransition);
        if (enabledTransition && (
          enabledTransition.toStage.name.toLowerCase().includes('bca') ||
          enabledTransition.toStage.name.toLowerCase().includes('housing') ||
          enabledTransition.toStage.code.includes('BCA') ||
          enabledTransition.toStage.code.includes('HOUSING')
        )) {
          console.log('✅ The enabled transition is BCA/Housing related!');
        }
      } else if (enabledCount > 1) {
        console.log(`\n⚠️  Multiple transitions enabled: ${enabledTransitions.join(', ')}`);
      } else {
        console.log('\n❌ No transitions enabled');
      }
      
    } else {
      console.log('❌ No transitions found from UNDER_SCRUTINY');
    }
    
    // Step 3: Also test what admin can see for comparison
    console.log('\n3. Comparing with admin permissions...');
    
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;
    
    const adminTransitionsRes = await fetch(`${baseUrl}/workflow/transitions/UNDER_SCRUTINY?applicationId=${dummyAppId}&dryRun=true`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const adminTransitionsData = await adminTransitionsRes.json();
    
    console.log('\n🔄 Admin vs OWO comparison:');
    const adminEnabled = adminTransitionsData.transitions?.filter(t => t.guardResult?.canTransition).length || 0;
    const owoEnabled = transitionsData.transitions?.filter(t => t.guardResult?.canTransition).length || 0;
    
    console.log(`   Admin enabled transitions: ${adminEnabled}`);
    console.log(`   OWO enabled transitions: ${owoEnabled}`);
    
    if (owoEnabled > adminEnabled) {
      console.log('✅ OWO has more permissions than admin (expected)');
    } else if (owoEnabled === adminEnabled) {
      console.log('⚠️  OWO and admin have same permissions');
    } else {
      console.log('❌ Admin has more permissions than OWO (unexpected)');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testOWORole().then(() => {
  console.log('\n🏁 OWO role test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
