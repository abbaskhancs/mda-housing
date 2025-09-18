const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPostEntriesAndClose() {
  try {
    console.log('🧪 Testing POST_ENTRIES and CLOSED stages...\n');

    // Check if new stages exist
    console.log('📋 Step 1: Checking if new stages exist');
    const stages = await prisma.wfStage.findMany({
      where: {
        code: {
          in: ['POST_ENTRIES', 'CLOSED']
        }
      }
    });

    console.log(`   Found ${stages.length} new stages:`);
    stages.forEach(stage => {
      console.log(`     - ${stage.code}: ${stage.name} (Sort: ${stage.sortOrder})`);
    });

    if (stages.length !== 2) {
      console.log('❌ Missing stages! Expected POST_ENTRIES and CLOSED');
      return false;
    }

    // Check if new transitions exist
    console.log('\n📋 Step 2: Checking if new transitions exist');
    const transitions = await prisma.wfTransition.findMany({
      include: {
        fromStage: true,
        toStage: true
      },
      where: {
        OR: [
          {
            fromStage: { code: 'APPROVED' },
            toStage: { code: 'POST_ENTRIES' }
          },
          {
            fromStage: { code: 'POST_ENTRIES' },
            toStage: { code: 'CLOSED' }
          }
        ]
      }
    });

    console.log(`   Found ${transitions.length} new transitions:`);
    transitions.forEach(transition => {
      console.log(`     - ${transition.fromStage.code} → ${transition.toStage.code} (Guard: ${transition.guardName})`);
    });

    if (transitions.length !== 2) {
      console.log('❌ Missing transitions! Expected APPROVED→POST_ENTRIES and POST_ENTRIES→CLOSED');
      return false;
    }

    // Check if we have an APPROVED application to test with
    console.log('\n📋 Step 3: Looking for APPROVED application to test');
    const approvedStage = await prisma.wfStage.findFirst({
      where: { code: 'APPROVED' }
    });

    if (!approvedStage) {
      console.log('❌ APPROVED stage not found');
      return false;
    }

    const approvedApp = await prisma.application.findFirst({
      where: { currentStageId: approvedStage.id },
      include: {
        currentStage: true,
        seller: true,
        buyer: true,
        plot: true
      }
    });

    if (!approvedApp) {
      console.log('   No APPROVED applications found. Creating a test application...');
      
      // Get required data for creating test application
      const submittedStage = await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } });
      const testSeller = await prisma.person.findFirst();
      const testBuyer = await prisma.person.findFirst({ where: { id: { not: testSeller?.id } } });
      const testPlot = await prisma.plot.findFirst();

      if (!submittedStage || !testSeller || !testBuyer || !testPlot) {
        console.log('❌ Missing required data for test application');
        return false;
      }

      // Create test application and move it to APPROVED
      const testApp = await prisma.application.create({
        data: {
          sellerId: testSeller.id,
          buyerId: testBuyer.id,
          plotId: testPlot.id,
          currentStageId: approvedStage.id,
          status: 'ACTIVE'
        },
        include: {
          currentStage: true,
          seller: true,
          buyer: true,
          plot: true
        }
      });

      console.log(`   Created test application: ${testApp.applicationNumber}`);
      console.log(`   Current stage: ${testApp.currentStage.name}`);
      
      return true; // Just verify creation for now
    } else {
      console.log(`   Found APPROVED application: ${approvedApp.applicationNumber}`);
      console.log(`   Seller: ${approvedApp.seller.name}`);
      console.log(`   Buyer: ${approvedApp.buyer.name}`);
      console.log(`   Plot: ${approvedApp.plot.plotNumber}`);
    }

    console.log('\n✅ All checks passed! POST_ENTRIES and CLOSED stages are properly configured.');
    return true;

  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPostEntriesAndClose().then(success => {
  if (success) {
    console.log('\n🎉 POST_ENTRIES and CLOSED implementation test completed successfully!');
  } else {
    console.log('\n💥 POST_ENTRIES and CLOSED implementation test failed!');
    process.exit(1);
  }
});
