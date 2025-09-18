console.log('Testing basic functionality...');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Connecting to database...');
    const count = await prisma.application.count();
    console.log('Applications in database:', count);
    
    // Test creating application with Water NOC
    const seller = await prisma.person.findFirst();
    const buyer = await prisma.person.findFirst({ skip: 1 });
    const plot = await prisma.plot.findFirst();
    const stage = await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } });
    
    if (seller && buyer && plot && stage) {
      const app = await prisma.application.create({
        data: {
          sellerId: seller.id,
          buyerId: buyer.id,
          plotId: plot.id,
          currentStageId: stage.id,
          waterNocRequired: true
        }
      });
      console.log('✅ Created application with Water NOC:', app.id, 'waterNocRequired:', app.waterNocRequired);
    }
    
    // Check Water stages
    const waterStages = await prisma.wfStage.findMany({
      where: { code: { contains: 'WATER' } }
    });
    console.log('✅ Water stages:', waterStages.map(s => s.code));
    
    console.log('✅ Basic test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
