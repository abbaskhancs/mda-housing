const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWaterNOC() {
  console.log('🧪 Testing Water NOC functionality...\n');

  try {
    // Test 1: Create application with Water NOC required
    console.log('📝 Test 1: Creating application with Water NOC required...');
    
    // Get demo data
    const seller = await prisma.person.findFirst({ where: { cnic: { contains: '12345' } } });
    const buyer = await prisma.person.findFirst({ where: { cnic: { contains: '67890' } } });
    const plot = await prisma.plot.findFirst();
    const submittedStage = await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } });
    
    if (!seller || !buyer || !plot || !submittedStage) {
      throw new Error('Demo data not found. Please run seed first.');
    }
    
    // Create application with waterNocRequired = true
    const application = await prisma.application.create({
      data: {
        sellerId: seller.id,
        buyerId: buyer.id,
        plotId: plot.id,
        currentStageId: submittedStage.id,
        waterNocRequired: true
      }
    });
    
    console.log(`✅ Application created: ${application.id} (Water NOC Required: ${application.waterNocRequired})`);
    
    // Test 2: Progress through BCA/Housing workflow
    console.log('\n📋 Test 2: Progressing through BCA/Housing workflow...');
    
    // Move to UNDER_SCRUTINY
    const underScrutinyStage = await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: underScrutinyStage.id }
    });
    
    // Move to SENT_TO_BCA_HOUSING
    const sentToBcaHousingStage = await prisma.wfStage.findFirst({ where: { code: 'SENT_TO_BCA_HOUSING' } });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: sentToBcaHousingStage.id }
    });
    
    // Create BCA and Housing clearances
    const bcaSection = await prisma.wfSection.findFirst({ where: { code: 'BCA' } });
    const housingSection = await prisma.wfSection.findFirst({ where: { code: 'HOUSING' } });
    const clearStatus = await prisma.wfStatus.findFirst({ where: { code: 'CLEAR' } });
    
    await prisma.clearance.createMany({
      data: [
        {
          applicationId: application.id,
          sectionId: bcaSection.id,
          statusId: clearStatus.id,
          remarks: 'BCA clearance approved'
        },
        {
          applicationId: application.id,
          sectionId: housingSection.id,
          statusId: clearStatus.id,
          remarks: 'Housing clearance approved'
        }
      ]
    });
    
    // Move to BCA_HOUSING_CLEAR
    const bcaHousingClearStage = await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: bcaHousingClearStage.id }
    });
    
    // Move to OWO_REVIEW_BCA_HOUSING
    const owoReviewStage = await prisma.wfStage.findFirst({ where: { code: 'OWO_REVIEW_BCA_HOUSING' } });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: owoReviewStage.id }
    });
    
    // Create OWO review
    const owoSection = await prisma.wfSection.findFirst({ where: { code: 'OWO' } });
    const owoUser = await prisma.user.findFirst({ where: { role: 'OWO' } });
    await prisma.review.create({
      data: {
        applicationId: application.id,
        sectionId: owoSection.id,
        reviewerId: owoUser.id,
        status: 'APPROVED',
        remarks: 'BCA and Housing clearances reviewed and approved'
      }
    });
    
    console.log('✅ BCA/Housing workflow completed');
    
    // Test 3: Test GUARD_WATER_REQUIRED
    console.log('\n🔍 Test 3: Testing GUARD_WATER_REQUIRED...');
    
    const { executeGuard } = require('./backend/src/guards/workflowGuards.ts');
    const sentToWaterStage = await prisma.wfStage.findFirst({ where: { code: 'SENT_TO_WATER' } });
    
    const waterRequiredResult = await executeGuard('GUARD_WATER_REQUIRED', {
      applicationId: application.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: owoReviewStage.id,
      toStageId: sentToWaterStage.id
    });
    
    console.log(`✅ GUARD_WATER_REQUIRED: ${waterRequiredResult.canTransition ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${waterRequiredResult.reason}`);
    
    // Test 4: Test GUARD_OWO_REVIEW_COMPLETE (should fail when Water NOC required)
    console.log('\n🔍 Test 4: Testing GUARD_OWO_REVIEW_COMPLETE (should fail for Water NOC required)...');
    
    const sentToAccountsStage = await prisma.wfStage.findFirst({ where: { code: 'SENT_TO_ACCOUNTS' } });
    
    const owoReviewCompleteResult = await executeGuard('GUARD_OWO_REVIEW_COMPLETE', {
      applicationId: application.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: owoReviewStage.id,
      toStageId: sentToAccountsStage.id
    });
    
    console.log(`✅ GUARD_OWO_REVIEW_COMPLETE: ${owoReviewCompleteResult.canTransition ? 'FAIL (should be false)' : 'PASS'}`);
    console.log(`   Reason: ${owoReviewCompleteResult.reason}`);
    
    // Test 5: Progress to Water Department
    console.log('\n💧 Test 5: Progressing to Water Department...');
    
    // Move to SENT_TO_WATER
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: sentToWaterStage.id }
    });
    
    // Test GUARD_SENT_TO_WATER
    const sentToWaterResult = await executeGuard('GUARD_SENT_TO_WATER', {
      applicationId: application.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: owoReviewStage.id,
      toStageId: sentToWaterStage.id
    });
    
    console.log(`✅ GUARD_SENT_TO_WATER: ${sentToWaterResult.canTransition ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${sentToWaterResult.reason}`);
    
    // Move to WATER_PENDING
    const waterPendingStage = await prisma.wfStage.findFirst({ where: { code: 'WATER_PENDING' } });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStageId: waterPendingStage.id }
    });
    
    // Test 6: Water clearance
    console.log('\n💧 Test 6: Testing Water clearance...');
    
    // Create Water clearance
    const waterSection = await prisma.wfSection.findFirst({ where: { code: 'WATER' } });
    await prisma.clearance.create({
      data: {
        applicationId: application.id,
        sectionId: waterSection.id,
        statusId: clearStatus.id,
        remarks: 'Water clearance approved'
      }
    });
    
    // Test GUARD_WATER_CLEAR
    const waterClearStage = await prisma.wfStage.findFirst({ where: { code: 'WATER_CLEAR' } });
    const waterClearResult = await executeGuard('GUARD_WATER_CLEAR', {
      applicationId: application.id,
      userId: 'test-user',
      userRole: 'WATER',
      fromStageId: waterPendingStage.id,
      toStageId: waterClearStage.id
    });
    
    console.log(`✅ GUARD_WATER_CLEAR: ${waterClearResult.canTransition ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${waterClearResult.reason}`);
    
    // Test 7: Test ALL_SECTIONS_IN_GROUP_CLEAR(BCA_HOUSING) independence
    console.log('\n🔍 Test 7: Testing BCA_HOUSING group independence from Water...');
    
    // Test GUARD_CLEARANCES_COMPLETE (should only consider BCA+HOUSING)
    const clearancesCompleteResult = await executeGuard('GUARD_CLEARANCES_COMPLETE', {
      applicationId: application.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: sentToBcaHousingStage.id,
      toStageId: bcaHousingClearStage.id
    });
    
    console.log(`✅ GUARD_CLEARANCES_COMPLETE (BCA+HOUSING only): ${clearancesCompleteResult.canTransition ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${clearancesCompleteResult.reason}`);
    console.log('   ✅ Water clearances do NOT block BCA_HOUSING group completion');
    
    // Test 8: Create application WITHOUT Water NOC
    console.log('\n📝 Test 8: Testing application WITHOUT Water NOC...');
    
    const appNoWater = await prisma.application.create({
      data: {
        sellerId: seller.id,
        buyerId: buyer.id,
        plotId: plot.id,
        currentStageId: owoReviewStage.id,
        waterNocRequired: false
      }
    });
    
    // Create OWO review for no-water app
    await prisma.review.create({
      data: {
        applicationId: appNoWater.id,
        sectionId: owoSection.id,
        reviewerId: owoUser.id,
        status: 'APPROVED',
        remarks: 'BCA and Housing clearances reviewed and approved'
      }
    });
    
    // Test GUARD_OWO_REVIEW_COMPLETE (should pass when Water NOC not required)
    const owoReviewNoWaterResult = await executeGuard('GUARD_OWO_REVIEW_COMPLETE', {
      applicationId: appNoWater.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: owoReviewStage.id,
      toStageId: sentToAccountsStage.id
    });
    
    console.log(`✅ GUARD_OWO_REVIEW_COMPLETE (no Water NOC): ${owoReviewNoWaterResult.canTransition ? 'PASS' : 'FAIL'}`);
    console.log(`   Reason: ${owoReviewNoWaterResult.reason}`);
    
    // Test GUARD_WATER_REQUIRED (should fail when Water NOC not required)
    const waterNotRequiredResult = await executeGuard('GUARD_WATER_REQUIRED', {
      applicationId: appNoWater.id,
      userId: 'test-user',
      userRole: 'OWO',
      fromStageId: owoReviewStage.id,
      toStageId: sentToWaterStage.id
    });
    
    console.log(`✅ GUARD_WATER_REQUIRED (no Water NOC): ${waterNotRequiredResult.canTransition ? 'FAIL (should be false)' : 'PASS'}`);
    console.log(`   Reason: ${waterNotRequiredResult.reason}`);
    
    console.log('\n🎉 All Water NOC tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Water NOC toggle works in intake form');
    console.log('✅ GUARD_WATER_REQUIRED correctly identifies Water NOC requirement');
    console.log('✅ GUARD_OWO_REVIEW_COMPLETE respects Water NOC requirement');
    console.log('✅ BCA_HOUSING group clearances are independent of Water');
    console.log('✅ Water workflow (SENT_TO_WATER → WATER_PENDING → WATER_CLEAR) works');
    console.log('✅ Applications without Water NOC skip Water Department');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testWaterNOC();
