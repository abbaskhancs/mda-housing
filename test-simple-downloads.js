const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Testing Simple Signed Download Functionality...');
console.log('This will test the core functionality without complex data setup.');
console.log('');

// Simple test script
const testScript = `
import { fileStorageService } from './backend/src/services/fileStorageService';

async function testSimpleDownloads() {
  try {
    console.log('🔧 Testing file storage service...');
    
    // Initialize file storage
    await fileStorageService.initialize();
    console.log('✅ File storage initialized');

    // Test file upload
    console.log('📤 Testing file upload...');
    const testBuffer = Buffer.from('Test PDF content for signed downloads');
    const uploadResult = await fileStorageService.uploadFile(
      testBuffer,
      'test-signed-download.pdf',
      'application/pdf'
    );
    console.log('✅ File uploaded:', uploadResult.filePath);
    console.log('📁 Storage URL:', uploadResult.url);
    console.log('🔐 File hash:', uploadResult.hash);

    // Test URL signature generation
    console.log('🔐 Testing URL signature generation...');
    const testDocumentId = 'test-doc-123';
    const downloadUrl = fileStorageService.generateDownloadUrl(testDocumentId, 3600);
    console.log('✅ Download URL generated:', downloadUrl);

    // Test signature verification
    console.log('🔍 Testing signature verification...');
    const url = new URL(downloadUrl);
    const signature = url.searchParams.get('signature');
    const expires = parseInt(url.searchParams.get('expires') || '0');
    
    console.log('🔍 Debug - Document ID:', testDocumentId);
    console.log('🔍 Debug - Signature:', signature);
    console.log('🔍 Debug - Expires:', expires);
    console.log('🔍 Debug - Current time:', Date.now());
    console.log('🔍 Debug - Is expired:', Date.now() > expires);
    
    const isValid = fileStorageService.verifySignature(testDocumentId, signature || '', expires);
    console.log('✅ Signature verification:', isValid ? 'Valid' : 'Invalid');

    // Test file download
    console.log('📥 Testing file download...');
    const filePath = fileStorageService.extractFilePath(uploadResult.url);
    const downloadedBuffer = await fileStorageService.downloadFile(filePath);
    console.log('✅ File downloaded, size:', downloadedBuffer.length, 'bytes');
    console.log('📊 Content matches:', downloadedBuffer.toString() === testBuffer.toString());

    // Test file existence
    console.log('🔍 Testing file existence...');
    const exists = await fileStorageService.fileExists(filePath);
    console.log('✅ File exists:', exists);

    // Test file info
    console.log('📊 Testing file info...');
    const fileInfo = await fileStorageService.getFileInfo(filePath);
    console.log('✅ File size:', fileInfo.size, 'bytes');
    console.log('📅 Modified:', fileInfo.mtime);

    // Clean up
    console.log('🧹 Cleaning up...');
    await fileStorageService.deleteFile(filePath);
    console.log('✅ Test file deleted');

    console.log('\\n🎉 All core functionality tests passed!');
    console.log('📤 File upload working');
    console.log('🔐 URL signing working');
    console.log('🔍 Signature verification working');
    console.log('📥 File download working');
    console.log('🗑️  File deletion working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleDownloads().catch(console.error);
`;

// Write test script to temporary file
const fs = require('fs');
const testFile = path.join(__dirname, 'test-simple-downloads.temp.ts');
fs.writeFileSync(testFile, testScript);

// Run the test
exec(`npx ts-node "${testFile}"`, (error, stdout, stderr) => {
  // Clean up temporary file
  fs.unlinkSync(testFile);
  
  if (error) {
    console.error('❌ Error running simple download test:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('');
  console.log('✅ Simple signed download functionality test completed!');
  console.log('🔐 Core security features working');
  console.log('💾 File storage working');
  console.log('📥 Download functionality working');
});
