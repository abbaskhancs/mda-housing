const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDemoData() {
  try {
    const persons = await prisma.person.findMany({ take: 5 });
    const plots = await prisma.plot.findMany({ take: 5 });
    
    console.log('Demo Persons:');
    persons.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.cnic})`));
    
    console.log('\nDemo Plots:');
    plots.forEach(p => console.log(`  - ${p.id}: ${p.plotNumber} (${p.sector})`));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

checkDemoData();
