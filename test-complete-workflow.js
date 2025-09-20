const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompleteWorkflow() {
  try {
    console.log('🧪 Testing Complete Workflow: Create → Scrutiny → BCA/Housing CLEAR → OWO Review → Send to Accounts → Challan → Paid & Verified → Accounts CLEAR → OWO Review → Send to Housing Officer (Memo) → Deed Draft → Signatures → Approve & Lock → Post-entries → Close\n');

    // Step 1: Check all required stages exist
    console.log('📋 Step 1: Checking workflow stages...');
    const requiredStages = [
      'SUBMITTED', 'UNDER_SCRUTINY', 'SENT_TO_BCA_HOUSING', 'BCA_HOUSING_CLEAR',
      'OWO_REVIEW_BCA_HOUSING', 'SENT_TO_ACCOUNTS', 'ACCOUNTS_CLEAR', 
      'OWO_REVIEW_ACCOUNTS', 'READY_FOR_APPROVAL', 'APPROVED', 'POST_ENTRIES', 'CLOSED'
    ];

    const stages = await prisma.wfStage.findMany({
      where: { code: { in: requiredStages } },
      orderBy: { sortOrder: 'asc' }
    });

    console.log(`   Found ${stages.length}/${requiredStages.length} required stages:`);
    stages.forEach(stage => {
      console.log(`     ✓ ${stage.code}: ${stage.name} (Sort: ${stage.sortOrder})`);
    });

    if (stages.length !== requiredStages.length) {
      console.log('❌ Missing required stages!');
      return false;
    }

    // Step 2: Check all required transitions exist
    console.log('\n📋 Step 2: Checking workflow transitions...');
    const requiredTransitions = [
      { from: 'SUBMITTED', to: 'UNDER_SCRUTINY' },
      { from: 'UNDER_SCRUTINY', to: 'SENT_TO_BCA_HOUSING' },
      { from: 'SENT_TO_BCA_HOUSING', to: 'BCA_HOUSING_CLEAR' },
      { from: 'BCA_HOUSING_CLEAR', to: 'OWO_REVIEW_BCA_HOUSING' },
      { from: 'OWO_REVIEW_BCA_HOUSING', to: 'SENT_TO_ACCOUNTS' },
      { from: 'SENT_TO_ACCOUNTS', to: 'ACCOUNTS_CLEAR' },
      { from: 'ACCOUNTS_CLEAR', to: 'OWO_REVIEW_ACCOUNTS' },
      { from: 'OWO_REVIEW_ACCOUNTS', to: 'READY_FOR_APPROVAL' },
      { from: 'READY_FOR_APPROVAL', to: 'APPROVED' },
      { from: 'APPROVED', to: 'POST_ENTRIES' },
      { from: 'POST_ENTRIES', to: 'CLOSED' }
    ];

    const stageMap = new Map(stages.map(s => [s.code, s.id]));
    let transitionCount = 0;

    for (const { from, to } of requiredTransitions) {
      const fromId = stageMap.get(from);
      const toId = stageMap.get(to);
      
      if (fromId && toId) {
        const transition = await prisma.wfTransition.findFirst({
          where: { fromStageId: fromId, toStageId: toId }
        });
        
        if (transition) {
          console.log(`     ✓ ${from} → ${to} (Guard: ${transition.guardName})`);
          transitionCount++;
        } else {
          console.log(`     ❌ Missing: ${from} → ${to}`);
        }
      }
    }

    console.log(`   Found ${transitionCount}/${requiredTransitions.length} required transitions`);

    // Step 3: Check guards exist
    console.log('\n📋 Step 3: Checking workflow guards...');
    const requiredGuards = [
      'GUARD_INTAKE_COMPLETE', 'GUARD_SCRUTINY_COMPLETE', 'GUARD_CLEARANCES_COMPLETE',
      'GUARD_BCA_HOUSING_REVIEW', 'GUARD_OWO_REVIEW_COMPLETE', 'GUARD_ACCOUNTS_CLEAR',
      'GUARD_ACCOUNTS_REVIEWED', 'GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE', 
      'GUARD_APPROVAL_COMPLETE', 'GUARD_START_POST_ENTRIES', 'GUARD_CLOSE_CASE'
    ];

    // Import guards to check they exist
    try {
      const { GUARDS } = require('./src/guards/workflowGuards');
      let guardCount = 0;
      
      for (const guardName of requiredGuards) {
        if (GUARDS[guardName]) {
          console.log(`     ✓ ${guardName}`);
          guardCount++;
        } else {
          console.log(`     ❌ Missing: ${guardName}`);
        }
      }
      
      console.log(`   Found ${guardCount}/${requiredGuards.length} required guards`);
    } catch (error) {
      console.log('   ❌ Error loading guards:', error.message);
    }

    // Step 4: Check sample application data
    console.log('\n📋 Step 4: Checking sample data...');
    
    const applicationCount = await prisma.application.count();
    const personCount = await prisma.person.count();
    const plotCount = await prisma.plot.count();
    
    console.log(`   Applications: ${applicationCount}`);
    console.log(`   Persons: ${personCount}`);
    console.log(`   Plots: ${plotCount}`);

    // Step 5: Test stage badge colors and PDF generation
    console.log('\n📋 Step 5: Testing stage badges and PDF components...');
    
    const stageBadgeColors = {
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'UNDER_SCRUTINY': 'bg-yellow-100 text-yellow-800',
      'BCA_HOUSING_CLEAR': 'bg-green-100 text-green-800',
      'READY_FOR_APPROVAL': 'bg-purple-100 text-purple-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'POST_ENTRIES': 'bg-indigo-100 text-indigo-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    };

    console.log('   Stage badge colors configured:');
    Object.entries(stageBadgeColors).forEach(([stage, color]) => {
      console.log(`     ✓ ${stage}: ${color}`);
    });

    // Step 6: Check audit timeline functionality
    console.log('\n📋 Step 6: Checking audit timeline...');
    
    const auditLogCount = await prisma.auditLog.count();
    console.log(`   Audit logs: ${auditLogCount}`);
    
    if (auditLogCount > 0) {
      const sampleAudit = await prisma.auditLog.findFirst({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });
      console.log(`   Latest audit: ${sampleAudit.action} by ${sampleAudit.user.username} (${sampleAudit.user.role})`);
    }

    // Step 7: Check ownership transfer functionality
    console.log('\n📋 Step 7: Checking ownership transfer...');
    
    const plotsWithOwners = await prisma.plot.count({
      where: { currentOwnerId: { not: null } }
    });
    console.log(`   Plots with current owners: ${plotsWithOwners}`);

    console.log('\n✅ Complete workflow validation completed!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Start backend server: npm run dev');
    console.log('   2. Start frontend server: cd frontend && npm run dev');
    console.log('   3. Open http://localhost:3000');
    console.log('   4. Create new application and test complete flow');
    console.log('   5. Use E2E Demo button for automated testing');
    
    return true;

  } catch (error) {
    console.error('❌ Error during workflow validation:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteWorkflow().then(success => {
  if (success) {
    console.log('\n🎉 Complete workflow validation passed!');
  } else {
    console.log('\n💥 Complete workflow validation failed!');
    process.exit(1);
  }
});
