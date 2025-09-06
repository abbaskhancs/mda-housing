import express from 'express';
import { pdfService, PDFTemplateData } from '../services/pdfService';
import { logger } from '../config/logger';

const router = express.Router();

// Generate PDF for a specific template
router.post('/generate/:templateType', async (req, res) => {
  try {
    const { templateType } = req.params;
    const data: PDFTemplateData = req.body;

    let pdfBuffer: Buffer;

    switch (templateType) {
      case 'intake-receipt':
        pdfBuffer = await pdfService.generateIntakeReceipt(data);
        break;
      case 'clearance-bca':
        pdfBuffer = await pdfService.generateClearanceCertificate({
          ...data,
          sectionName: 'BCA'
        });
        break;
      case 'clearance-housing':
        pdfBuffer = await pdfService.generateClearanceCertificate({
          ...data,
          sectionName: 'HOUSING'
        });
        break;
      case 'challan':
        pdfBuffer = await pdfService.generateChallan(data);
        break;
      case 'dispatch-memo':
        pdfBuffer = await pdfService.generateDispatchMemo({
          ...data,
          memoId: `MEMO-${Date.now()}`,
          memoDate: new Date()
        });
        break;
      case 'transfer-deed':
        pdfBuffer = await pdfService.generateTransferDeed(data);
        break;
      default:
        return res.status(400).json({ error: 'Invalid template type' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${templateType}-${data.application?.id || 'document'}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate all documents for an application
router.post('/generate-all', async (req, res) => {
  try {
    const data: PDFTemplateData = req.body;
    const documents = await pdfService.generateAllDocuments(data);

    res.json({
      success: true,
      documents: Object.keys(documents).map(key => ({
        type: key,
        generated: !!documents[key as keyof typeof documents]
      }))
    });

  } catch (error) {
    logger.error('Error generating all documents:', error);
    res.status(500).json({ error: 'Failed to generate documents' });
  }
});

// Health check for PDF service
router.get('/health', async (req, res) => {
  try {
    await pdfService.initialize();
    res.json({ status: 'healthy', service: 'PDF Generation' });
  } catch (error) {
    logger.error('PDF service health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
