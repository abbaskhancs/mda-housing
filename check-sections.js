const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSections() {
  try {
    const sections = await prisma.wfSection.findMany();
    console.log('Available sections:', sections);
    
    const stages = await prisma.wfStage.findMany();
    console.log('Available stages:', stages);
    
    const statuses = await prisma.wfStatus.findMany();
    console.log('Available statuses:', statuses);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSections();
