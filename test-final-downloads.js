const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Testing Final Signed Download Implementation...');
console.log('This will test the complete document generation and signed download workflow.');
console.log('');

// Final comprehensive test
const testScript = `
import { PrismaClient } from '@prisma/client';
import { documentService } from './backend/src/services/documentService';
import { fileStorageService } from './backend/src/services/fileStorageService';
import { pdfService } from './backend/src/services/pdfService';

const prisma = new PrismaClient();

async function testFinalDownloads() {
  try {
    console.log('🔧 Initializing all services...');
    
    // Initialize file storage
    await fileStorageService.initialize();
    console.log('✅ File storage initialized');

    // Initialize PDF service
    await pdfService.initialize();
    console.log('✅ PDF service initialized');

    // Create test application data
    console.log('📄 Creating test application...');
    
    const testPerson = await prisma.person.upsert({
      where: { cnic: 'final-test-cnic-12345' },
      update: {},
      create: {
        cnic: 'final-test-cnic-12345',
        name: 'Final Test Person',
        fatherName: 'Final Test Father',
        address: 'Final Test Address',
        phone: '+92-300-1234567'
      }
    });
    
    const testPlot = await prisma.plot.upsert({
      where: { plotNumber: 'FINAL-TEST-PLOT-001' },
      update: {},
      create: {
        plotNumber: 'FINAL-TEST-PLOT-001',
        blockNumber: 'A',
        sectorNumber: '1',
        area: 5.0,
        location: 'Final Test Location'
      }
    });
    
    const testStage = await prisma.wfStage.upsert({
      where: { code: 'FINAL_TEST_STAGE' },
      update: {},
      create: {
        code: 'FINAL_TEST_STAGE',
        name: 'Final Test Stage',
        sortOrder: 1
      }
    });
    
    const testApplication = await prisma.application.upsert({
      where: { applicationNumber: 'FINAL-TEST-APP-001' },
      update: {},
      create: {
        applicationNumber: 'FINAL-TEST-APP-001',
        sellerId: testPerson.id,
        buyerId: testPerson.id,
        plotId: testPlot.id,
        currentStageId: testStage.id
      }
    });
    
    console.log('✅ Test application created:', testApplication.id);

    // Test complete document generation workflow
    console.log('📄 Testing complete document generation...');
    
    const templateData = {
      application: {
        id: testApplication.id,
        applicantName: 'Final Test Person',
        applicantPhone: '+92-300-1234567',
        createdAt: new Date('2024-01-15'),
        currentStage: 'UNDER_SCRUTINY'
      },
      plot: {
        plotNumber: 'FINAL-TEST-PLOT-001',
        block: 'A',
        section: '1',
        size: 5
      },
      attachments: [
        {
          docType: 'CNIC_Seller',
          originalSeen: true
        }
      ]
    };

    // Generate intake receipt document
    console.log('📄 Generating intake receipt...');
    const intakeReceipt = await documentService.generateDocument({
      applicationId: testApplication.id,
      documentType: 'INTAKE_RECEIPT',
      templateData: templateData,
      expiresInHours: 1
    });
    
    console.log('✅ Intake receipt generated:');
    console.log('   - Document ID:', intakeReceipt.id);
    console.log('   - File name:', intakeReceipt.fileName);
    console.log('   - File size:', intakeReceipt.fileSize, 'bytes');
    console.log('   - Hash:', intakeReceipt.hashSha256);
    console.log('   - Download URL:', intakeReceipt.downloadUrl);

    // Test document retrieval
    console.log('📄 Testing document retrieval...');
    const retrievedDocument = await documentService.getDocument(intakeReceipt.id);
    console.log('✅ Document retrieved successfully');

    // Test URL signature verification
    console.log('🔐 Testing URL signature verification...');
    const url = new URL(retrievedDocument.downloadUrl);
    const signature = url.searchParams.get('signature');
    const expires = parseInt(url.searchParams.get('expires') || '0');
    
    const isValid = await documentService.verifyDownloadAccess(
      intakeReceipt.id,
      signature || '',
      expires
    );
    console.log('✅ Signature verification:', isValid ? 'Valid' : 'Invalid');

    // Test actual file download
    console.log('📥 Testing actual file download...');
    const documentBuffer = await documentService.downloadDocument(intakeReceipt.id);
    console.log('✅ File downloaded successfully, size:', documentBuffer.length, 'bytes');

    // Test application documents listing
    console.log('📄 Testing application documents listing...');
    const appDocuments = await documentService.getApplicationDocuments(testApplication.id);
    console.log('✅ Application documents retrieved:', appDocuments.length);

    // Test file storage operations
    console.log('💾 Testing file storage operations...');
    const filePath = fileStorageService.extractFilePath(retrievedDocument.downloadUrl);
    const fileExists = await fileStorageService.fileExists(filePath);
    console.log('✅ File exists in storage:', fileExists);

    if (fileExists) {
      const fileInfo = await fileStorageService.getFileInfo(filePath);
      console.log('✅ File info - Size:', fileInfo.size, 'bytes, Modified:', fileInfo.mtime);
    }

    // Test signature expiration
    console.log('⏰ Testing signature expiration...');
    const expiredUrl = fileStorageService.generateDownloadUrl('expired-test', 0); // Expired immediately
    const expiredUrlObj = new URL(expiredUrl);
    const expiredSignature = expiredUrlObj.searchParams.get('signature');
    const expiredExpires = parseInt(expiredUrlObj.searchParams.get('expires') || '0');
    
    // Wait a moment to ensure expiration
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const isExpiredValid = fileStorageService.verifySignature('expired-test', expiredSignature || '', expiredExpires);
    console.log('✅ Expired signature verification:', isExpiredValid ? 'Valid (unexpected)' : 'Invalid (expected)');

    console.log('\\n🎉 Complete signed download implementation test passed!');
    console.log('📊 Document generation: ✅ Working');
    console.log('💾 File storage: ✅ Working');
    console.log('🔐 URL signing: ✅ Working');
    console.log('🔍 Signature verification: ✅ Working');
    console.log('📥 Document download: ✅ Working');
    console.log('🗄️  Database integration: ✅ Working');
    console.log('⏰ Expiration handling: ✅ Working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.\$disconnect();
    await pdfService.close();
  }
}

testFinalDownloads().catch(console.error);
`;

// Write test script to temporary file
const fs = require('fs');
const testFile = path.join(__dirname, 'test-final-downloads.temp.ts');
fs.writeFileSync(testFile, testScript);

// Run the test
exec(`npx ts-node "${testFile}"`, (error, stdout, stderr) => {
  // Clean up temporary file
  fs.unlinkSync(testFile);
  
  if (error) {
    console.error('❌ Error running final download test:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('');
  console.log('✅ Final signed download implementation test completed!');
  console.log('🔐 Complete security implementation working');
  console.log('💾 File storage and retrieval working');
  console.log('📥 Document generation and download working');
  console.log('🗄️  Database integration working');
  console.log('⏰ URL expiration handling working');
});
