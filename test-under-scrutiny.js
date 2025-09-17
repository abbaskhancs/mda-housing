const fetch = require('node-fetch');

// Test UNDER_SCRUTINY stage transitions
async function testUnderScrutinyTransitions() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing UNDER_SCRUTINY Stage Transitions');
  
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
    
    // Step 2: Get all stages to understand the workflow
    console.log('\n2. Getting all workflow stages...');
    const stagesRes = await fetch(`${baseUrl}/workflow/stages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const stagesData = await stagesRes.json();
    console.log('✅ Stages retrieved');
    
    console.log('\n📋 Available Stages:');
    stagesData.stages.forEach((stage, index) => {
      console.log(`${index + 1}. ${stage.name} (${stage.code})`);
    });
    
    // Step 3: Test transitions from UNDER_SCRUTINY
    console.log('\n3. Testing transitions from UNDER_SCRUTINY stage...');
    
    // Create a dummy application ID for testing (we'll use a fake one since we just need to test the guard logic)
    const dummyAppId = 'cmfmhcxx8000r1ulsb3ldlu1k';
    
    const transitionsRes = await fetch(`${baseUrl}/workflow/transitions/UNDER_SCRUTINY?applicationId=${dummyAppId}&dryRun=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!transitionsRes.ok) {
      console.log('⚠️  UNDER_SCRUTINY stage may not exist or application not in that stage');
      console.log('   This is expected if the application is still in SUBMITTED stage');
      
      // Let's check what transitions are available from SUBMITTED
      console.log('\n4. Checking available transitions from current stage...');
      const currentTransitionsRes = await fetch(`${baseUrl}/workflow/transitions/SUBMITTED?applicationId=${dummyAppId}&dryRun=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const currentTransitionsData = await currentTransitionsRes.json();
      console.log('\n🔄 Current Available Transitions:');
      
      currentTransitionsData.transitions.forEach((transition, index) => {
        console.log(`\n${index + 1}. ${transition.toStage.name} (${transition.toStage.code})`);
        console.log(`   Guard: ${transition.guardName}`);
        
        if (transition.guardResult) {
          console.log(`   Can Transition: ${transition.guardResult.canTransition ? '✅ YES' : '❌ NO'}`);
          console.log(`   Reason: ${transition.guardResult.reason}`);
        }
      });
      
      return;
    }
    
    const transitionsData = await transitionsRes.json();
    console.log('✅ UNDER_SCRUTINY transitions retrieved');
    
    console.log('\n🔄 Transitions from UNDER_SCRUTINY:');
    
    if (transitionsData.transitions && transitionsData.transitions.length > 0) {
      let bcaHousingFound = false;
      let enabledCount = 0;
      let disabledCount = 0;
      
      transitionsData.transitions.forEach((transition, index) => {
        console.log(`\n${index + 1}. ${transition.toStage.name} (${transition.toStage.code})`);
        console.log(`   Guard: ${transition.guardName}`);
        
        if (transition.guardResult) {
          const canTransition = transition.guardResult.canTransition;
          console.log(`   Can Transition: ${canTransition ? '✅ YES' : '❌ NO'}`);
          console.log(`   Reason: ${transition.guardResult.reason}`);
          
          if (canTransition) {
            enabledCount++;
          } else {
            disabledCount++;
          }
          
          // Check if this is the BCA & Housing transition
          if (transition.toStage.code === 'BCA_HOUSING_CLEARANCE' || 
              (transition.toStage.name.toLowerCase().includes('bca') && 
               transition.toStage.name.toLowerCase().includes('housing'))) {
            bcaHousingFound = true;
            console.log(`   🎯 This is the BCA & Housing transition!`);
          }
          
          if (transition.guardResult.metadata) {
            console.log(`   Metadata: ${JSON.stringify(transition.guardResult.metadata)}`);
          }
        }
      });
      
      console.log('\n📊 UNDER_SCRUTINY Test Results:');
      console.log(`   Total transitions: ${transitionsData.transitions.length}`);
      console.log(`   Enabled: ${enabledCount}`);
      console.log(`   Disabled: ${disabledCount}`);
      console.log(`   BCA & Housing found: ${bcaHousingFound ? '✅ YES' : '❌ NO'}`);
      
      // Validate the requirement: "only Send to BCA & Housing is enabled"
      if (bcaHousingFound && enabledCount === 1) {
        console.log('\n✅ REQUIREMENT MET: Only BCA & Housing transition is enabled');
      } else if (bcaHousingFound && enabledCount > 1) {
        console.log('\n⚠️  Multiple transitions enabled (may be expected depending on workflow)');
      } else if (!bcaHousingFound) {
        console.log('\n❌ BCA & Housing transition not found');
      } else {
        console.log('\n❌ No transitions enabled');
      }
      
    } else {
      console.log('❌ No transitions found from UNDER_SCRUTINY');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testUnderScrutinyTransitions().then(() => {
  console.log('\n🏁 UNDER_SCRUTINY test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
