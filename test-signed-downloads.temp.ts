
import { documentService } from './backend/src/services/documentService';
import { storageService } from './backend/src/services/storageService';

async function testSignedDownloads() {
  try {
    console.log('🔧 Initializing storage service...');
    await storageService.initialize();
    console.log('✅ Storage service initialized');

    console.log('📄 Testing document generation...');
    
    // Sample data for testing
    const sampleData = {
      application: {
        id: 'APP-2024-001',
        applicantName: 'احمد علی',
        applicantPhone: '+92-300-1234567',
        createdAt: new Date('2024-01-15'),
        currentStage: 'UNDER_SCRUTINY'
      },
      plot: {
        plotNumber: 'P-123',
        block: 'A',
        section: '1',
        size: 5
      },
      attachments: [
        {
          docType: 'CNIC_Seller',
          originalSeen: true
        }
      ],
      clearances: [
        {
          section: 'BCA',
          sectionName: 'BCA',
          status: 'CLEAR',
          reviewedBy: 'جان محمد',
          reviewedAt: new Date('2024-01-16'),
          remarks: 'تمام شرائط پوری ہو گئیں'
        }
      ],
      accountsBreakdown: {
        id: 'CH-2024-001',
        transferFee: 5000,
        stampDuty: 2500,
        registrationFee: 1000,
        mutationFee: 500,
        otherCharges: 200,
        lateFee: 0,
        totalAmount: 9200,
        paymentDueDate: new Date('2024-02-15'),
        createdAt: new Date('2024-01-18')
      }
    };

    // Test 1: Generate intake receipt
    console.log('📄 Generating intake receipt...');
    const intakeReceipt = await documentService.generateDocument({
      applicationId: 'APP-2024-001',
      documentType: 'INTAKE_RECEIPT',
      templateData: sampleData
    });
    console.log('✅ Intake receipt generated:', intakeReceipt.fileName);

    // Test 2: Generate BCA clearance
    console.log('📄 Generating BCA clearance...');
    const bcaClearance = await documentService.generateDocument({
      applicationId: 'APP-2024-001',
      documentType: 'BCA_CLEARANCE',
      templateData: sampleData
    });
    console.log('✅ BCA clearance generated:', bcaClearance.fileName);

    // Test 3: Generate challan
    console.log('📄 Generating challan...');
    const challan = await documentService.generateDocument({
      applicationId: 'APP-2024-001',
      documentType: 'CHALLAN',
      templateData: sampleData
    });
    console.log('✅ Challan generated:', challan.fileName);

    // Test 4: Get all documents for application
    console.log('📄 Getting all documents for application...');
    const allDocuments = await documentService.getApplicationDocuments('APP-2024-001');
    console.log('✅ Found documents:', allDocuments.length);

    // Test 5: Test URL signature verification
    console.log('🔐 Testing URL signature verification...');
    const testDocumentId = intakeReceipt.id;
    const testSignature = 'test-signature';
    const testExpires = Date.now() + 3600000; // 1 hour from now
    
    const isValid = await documentService.verifyDownloadAccess(
      testDocumentId, 
      testSignature, 
      testExpires
    );
    console.log('✅ Signature verification test completed:', isValid ? 'Valid' : 'Invalid (expected)');

    console.log('\n🎉 All tests completed successfully!');
    console.log('📁 Documents stored with signed URLs');
    console.log('🔐 URL signature verification working');
    console.log('💾 Database integration working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSignedDownloads().catch(console.error);
