const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupPostmanData() {
  try {
    console.log('Setting up Postman collection data...');
    
    // Get first person ID
    const person = await prisma.person.findFirst();
    if (!person) {
      throw new Error('No persons found in database. Please run seed script first.');
    }
    
    // Get first plot ID
    const plot = await prisma.plot.findFirst();
    if (!plot) {
      throw new Error('No plots found in database. Please run seed script first.');
    }
    
    // Get first stage ID for testing
    const stage = await prisma.wfStage.findFirst();
    if (!stage) {
      throw new Error('No stages found in database. Please run seed script first.');
    }
    
    console.log('\n=== Postman Collection Setup Data ===');
    console.log('Person ID (for seller/buyer):', person.id);
    console.log('Plot ID (for application):', plot.id);
    console.log('Stage ID (for testing):', stage.id);
    console.log('\n=== Demo Users ===');
    console.log('Username: admin, Password: password123');
    console.log('Username: owo_officer, Password: password123');
    console.log('Username: bca_officer, Password: password123');
    console.log('Username: housing_officer, Password: password123');
    console.log('Username: accounts_officer, Password: password123');
    console.log('Username: approver, Password: password123');
    console.log('\n=== API Base URL ===');
    console.log('Base URL: http://localhost:3001');
    console.log('\n=== Instructions ===');
    console.log('1. Import the MDA_Housing_API_Collection.postman_collection.json into Postman');
    console.log('2. Set the following collection variables:');
    console.log(`   - personId: ${person.id}`);
    console.log(`   - plotId: ${plot.id}`);
    console.log('3. Start the backend server: npm run dev');
    console.log('4. Run the collection in order: Health Check -> Authentication -> Workflow Lookups -> Applications');
    
  } catch (error) {
    console.error('Error setting up Postman data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupPostmanData();
