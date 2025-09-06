const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Testing PDF Generation...');
console.log('This will generate sample PDFs for all document types.');
console.log('');

// Run the TypeScript test file
const testFile = path.join(__dirname, 'backend', 'src', 'test', 'pdfGeneration.test.ts');

exec(`npx ts-node "${testFile}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running PDF generation test:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('');
  console.log('✅ PDF generation test completed!');
  console.log('📁 Check the test-outputs directory for generated PDFs.');
});
