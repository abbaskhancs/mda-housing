import { PDFService, PDFTemplateData } from '../services/pdfService';
import fs from 'fs/promises';
import path from 'path';

// Sample data for testing
const sampleData: PDFTemplateData = {
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
    },
    {
      docType: 'CNIC_Buyer',
      originalSeen: true
    },
    {
      docType: 'AllotmentLetter',
      originalSeen: false
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
    },
    {
      section: 'HOUSING',
      sectionName: 'HOUSING',
      status: 'CLEAR',
      reviewedBy: 'سارہ احمد',
      reviewedAt: new Date('2024-01-17'),
      remarks: 'جائیداد کی حالت اچھی ہے'
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
  },
  transferDeed: {
    id: 'TD-2024-001',
    sellerName: 'احمد علی',
    sellerFatherName: 'محمد علی',
    sellerCnic: '12345-1234567-1',
    sellerAddress: 'کراچی، پاکستان',
    buyerName: 'فاطمہ خان',
    buyerFatherName: 'عبداللہ خان',
    buyerCnic: '23456-2345678-2',
    buyerAddress: 'لاہور، پاکستان',
    considerationAmount: 500000,
    considerationAmountInWords: 'پانچ لاکھ روپے',
    paymentTerms: 'کیش',
    additionalTerms: 'فوری منتقلی',
    executionPlace: 'کراچی',
    status: 'DRAFT',
    isFinalized: false,
    hashSha256: '',
    createdAt: new Date('2024-01-20')
  },
  witness1: {
    name: 'علی احمد',
    fatherName: 'محمد احمد',
    cnic: '34567-3456789-3'
  },
  witness2: {
    name: 'سارہ خان',
    fatherName: 'احمد خان',
    cnic: '45678-4567890-4'
  },
  reviews: [
    {
      reviewerName: 'ڈاکٹر محمد',
      comments: 'درخواست مکمل ہے',
      createdAt: new Date('2024-01-19')
    }
  ]
};

async function testPDFGeneration() {
  const pdfService = new PDFService();
  const outputDir = path.join(process.cwd(), 'test-outputs');
  
  try {
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log('🚀 Starting PDF generation tests...');
    
    // Test 1: Intake Receipt
    console.log('📄 Generating Intake Receipt...');
    const intakeReceipt = await pdfService.generateIntakeReceipt(sampleData);
    await fs.writeFile(path.join(outputDir, 'intake-receipt.pdf'), intakeReceipt);
    console.log('✅ Intake Receipt generated successfully');
    
    // Test 2: BCA Clearance
    console.log('📄 Generating BCA Clearance...');
    const bcaClearance = await pdfService.generateClearanceCertificate({
      ...sampleData,
      sectionName: 'BCA'
    });
    await fs.writeFile(path.join(outputDir, 'bca-clearance.pdf'), bcaClearance);
    console.log('✅ BCA Clearance generated successfully');
    
    // Test 3: Housing Clearance
    console.log('📄 Generating Housing Clearance...');
    const housingClearance = await pdfService.generateClearanceCertificate({
      ...sampleData,
      sectionName: 'HOUSING'
    });
    await fs.writeFile(path.join(outputDir, 'housing-clearance.pdf'), housingClearance);
    console.log('✅ Housing Clearance generated successfully');
    
    // Test 4: Challan
    console.log('📄 Generating Challan...');
    const challan = await pdfService.generateChallan(sampleData);
    await fs.writeFile(path.join(outputDir, 'challan.pdf'), challan);
    console.log('✅ Challan generated successfully');
    
    // Test 5: Dispatch Memo
    console.log('📄 Generating Dispatch Memo...');
    const dispatchMemo = await pdfService.generateDispatchMemo({
      ...sampleData,
      memoId: 'MEMO-2024-001',
      memoDate: new Date('2024-01-21')
    });
    await fs.writeFile(path.join(outputDir, 'dispatch-memo.pdf'), dispatchMemo);
    console.log('✅ Dispatch Memo generated successfully');
    
    // Test 6: Transfer Deed
    console.log('📄 Generating Transfer Deed...');
    const transferDeed = await pdfService.generateTransferDeed(sampleData);
    await fs.writeFile(path.join(outputDir, 'transfer-deed.pdf'), transferDeed);
    console.log('✅ Transfer Deed generated successfully');
    
    // Test 7: Generate all documents
    console.log('📄 Generating all documents...');
    const allDocuments = await pdfService.generateAllDocuments(sampleData);
    
    if (allDocuments.intakeReceipt) {
      await fs.writeFile(path.join(outputDir, 'all-intake-receipt.pdf'), allDocuments.intakeReceipt);
    }
    if (allDocuments.clearanceBCA) {
      await fs.writeFile(path.join(outputDir, 'all-bca-clearance.pdf'), allDocuments.clearanceBCA);
    }
    if (allDocuments.clearanceHousing) {
      await fs.writeFile(path.join(outputDir, 'all-housing-clearance.pdf'), allDocuments.clearanceHousing);
    }
    if (allDocuments.challan) {
      await fs.writeFile(path.join(outputDir, 'all-challan.pdf'), allDocuments.challan);
    }
    if (allDocuments.dispatchMemo) {
      await fs.writeFile(path.join(outputDir, 'all-dispatch-memo.pdf'), allDocuments.dispatchMemo);
    }
    if (allDocuments.transferDeed) {
      await fs.writeFile(path.join(outputDir, 'all-transfer-deed.pdf'), allDocuments.transferDeed);
    }
    
    console.log('✅ All documents generated successfully');
    console.log(`📁 PDFs saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error during PDF generation:', error);
  } finally {
    await pdfService.close();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPDFGeneration().catch(console.error);
}

export { testPDFGeneration };
