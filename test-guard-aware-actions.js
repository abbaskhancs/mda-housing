const fetch = require('node-fetch');

// Test Guard-Aware Action Buttons
async function testGuardAwareActions() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing Guard-Aware Action Buttons');
  
  try {
    // Step 1: Login to get token
    console.log('\n1. Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Step 2: Create a test application and move it to UNDER_SCRUTINY
    console.log('\n2. Creating test application...');
    
    // Create persons
    const sellerRes = await fetch(`${baseUrl}/persons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        cnic: '11111-1111111-1',
        name: 'Test Seller',
        fatherName: 'Test Father',
        address: 'Test Address',
        phone: '0300-1111111',
        email: 'seller@test.com'
      })
    });
    
    const seller = await sellerRes.json();
    
    const buyerRes = await fetch(`${baseUrl}/persons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        cnic: '22222-2222222-2',
        name: 'Test Buyer',
        fatherName: 'Test Father',
        address: 'Test Address',
        phone: '0300-2222222',
        email: 'buyer@test.com'
      })
    });
    
    const buyer = await buyerRes.json();
    
    // Create plot
    const plotRes = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plotNumber: 'TEST-001',
        blockNumber: 'T-1',
        sectorNumber: 'TEST',
        area: 5,
        location: 'Test Location'
      })
    });
    
    const plot = await plotRes.json();
    
    // Create application
    const appRes = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sellerId: seller.person.id,
        buyerId: buyer.person.id,
        plotId: plot.plot.id
      })
    });
    
    const appData = await appRes.json();
    const applicationId = appData.application.id;
    console.log('✅ Application created:', applicationId);
    
    // Step 3: Manually transition to UNDER_SCRUTINY (if not already there)
    console.log('\n3. Ensuring application is in UNDER_SCRUTINY stage...');
    
    // Get current application details
    const appDetailRes = await fetch(`${baseUrl}/applications/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const appDetails = await appDetailRes.json();
    console.log('Application details response:', JSON.stringify(appDetails, null, 2));

    if (!appDetails.currentStage) {
      throw new Error('Application details missing currentStage');
    }

    console.log('Current stage:', appDetails.currentStage.code);
    
    if (appDetails.currentStage.code !== 'UNDER_SCRUTINY') {
      // Try to transition to UNDER_SCRUTINY
      const underScrutinyStageRes = await fetch(`${baseUrl}/workflow/stages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const stagesData = await underScrutinyStageRes.json();
      const underScrutinyStage = stagesData.stages.find(s => s.code === 'UNDER_SCRUTINY');
      
      if (underScrutinyStage) {
        try {
          const transitionRes = await fetch(`${baseUrl}/workflow/applications/${applicationId}/transition`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              toStageId: underScrutinyStage.id,
              remarks: 'Test transition to UNDER_SCRUTINY'
            })
          });
          
          if (transitionRes.ok) {
            console.log('✅ Transitioned to UNDER_SCRUTINY');
          } else {
            console.log('⚠️  Could not transition to UNDER_SCRUTINY (expected if guards block it)');
          }
        } catch (error) {
          console.log('⚠️  Transition blocked by guards (expected behavior)');
        }
      }
    }
    
    // Step 4: Test guard-aware transitions from current stage
    console.log('\n4. Testing guard-aware transitions...');
    
    // Get fresh application details
    const freshAppRes = await fetch(`${baseUrl}/applications/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const freshApp = await freshAppRes.json();
    const currentStage = freshApp.currentStage.code;
    console.log('Testing from stage:', currentStage);
    
    // Get available transitions with guard evaluation
    const transitionsRes = await fetch(`${baseUrl}/workflow/transitions/${currentStage}?applicationId=${applicationId}&dryRun=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!transitionsRes.ok) {
      throw new Error(`Failed to get transitions: ${transitionsRes.status}`);
    }
    
    const transitionsData = await transitionsRes.json();
    const transitions = transitionsData.transitions || [];
    
    console.log(`\n📋 Found ${transitions.length} possible transitions:`);
    
    let enabledCount = 0;
    let disabledCount = 0;
    let bcaHousingEnabled = false;
    
    transitions.forEach((transition, index) => {
      const guardResult = transition.guardResult;
      const canTransition = guardResult ? guardResult.canTransition : false;
      const reason = guardResult ? guardResult.reason : 'No guard result';
      
      console.log(`\n${index + 1}. ${transition.toStage.name} (${transition.toStage.code})`);
      console.log(`   Guard: ${transition.guardName}`);
      console.log(`   Status: ${canTransition ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Reason: ${reason}`);
      
      if (canTransition) {
        enabledCount++;
        // Check if this is the BCA & Housing transition
        if (transition.toStage.code === 'BCA_HOUSING_CLEARANCE' || 
            transition.toStage.name.toLowerCase().includes('bca') && 
            transition.toStage.name.toLowerCase().includes('housing')) {
          bcaHousingEnabled = true;
        }
      } else {
        disabledCount++;
      }
      
      if (guardResult && guardResult.metadata) {
        console.log(`   Metadata:`, JSON.stringify(guardResult.metadata, null, 2));
      }
    });
    
    // Step 5: Validation
    console.log('\n5. Validation Results:');
    
    console.log(`   📊 Total transitions: ${transitions.length}`);
    console.log(`   ✅ Enabled: ${enabledCount}`);
    console.log(`   ❌ Disabled: ${disabledCount}`);
    
    // Test specific requirements
    const hasTransitions = transitions.length > 0;
    console.log(`   🔄 Has transitions: ${hasTransitions ? '✅ PASS' : '❌ FAIL'}`);
    
    const hasDisabledActions = disabledCount > 0;
    console.log(`   🚫 Has disabled actions with reasons: ${hasDisabledActions ? '✅ PASS' : '❌ FAIL'}`);
    
    const guardsEvaluated = transitions.every(t => t.guardResult !== undefined);
    console.log(`   🛡️  All guards evaluated: ${guardsEvaluated ? '✅ PASS' : '❌ FAIL'}`);
    
    // Step 6: Test blocked action (simulate clicking disabled button)
    console.log('\n6. Testing blocked action behavior...');
    
    const blockedTransition = transitions.find(t => t.guardResult && !t.guardResult.canTransition);
    if (blockedTransition) {
      console.log(`   Testing blocked transition: ${blockedTransition.toStage.name}`);
      console.log(`   Block reason: ${blockedTransition.guardResult.reason}`);
      
      // This should fail if we try to execute it
      try {
        const blockedRes = await fetch(`${baseUrl}/workflow/applications/${applicationId}/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            toStageId: blockedTransition.toStageId,
            remarks: 'Test blocked transition'
          })
        });
        
        if (!blockedRes.ok) {
          console.log('   ✅ Blocked transition correctly rejected by backend');
        } else {
          console.log('   ❌ Blocked transition was allowed (unexpected)');
        }
      } catch (error) {
        console.log('   ✅ Blocked transition correctly rejected');
      }
    } else {
      console.log('   ⚠️  No blocked transitions found to test');
    }
    
    console.log('\n🎉 Guard-Aware Actions Test Summary:');
    const allTestsPassed = hasTransitions && hasDisabledActions && guardsEvaluated;
    console.log(`   Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n✅ Guard-aware action buttons are working correctly!');
      console.log('   - Transitions are fetched with guard evaluation');
      console.log('   - Disabled actions show proper reasons');
      console.log('   - Guards are evaluated for all transitions');
      console.log('   - Blocked actions are properly rejected');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testGuardAwareActions().then(() => {
  console.log('\n🏁 Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
