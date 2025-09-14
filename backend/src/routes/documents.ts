import express from 'express';
import { documentService } from '../services/documentService';
import { logger } from '../config/logger';

const router = express.Router();

// Generate a specific document
router.post('/generate', async (req, res) => {
  try {
    const { applicationId, documentType, templateData, expiresInHours } = req.body;

    if (!applicationId || !documentType || !templateData) {
      return res.status(400).json({ 
        error: 'Missing required fields: applicationId, documentType, templateData' 
      });
    }

    const document = await documentService.generateDocument({
      applicationId,
      documentType,
      templateData,
      expiresInHours
    });

    res.json({
      success: true,
      document
    });

  } catch (error) {
    logger.error('Error generating document:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// Generate all documents for an application
router.post('/generate-all', async (req, res) => {
  try {
    const { applicationId, templateData } = req.body;

    if (!applicationId || !templateData) {
      return res.status(400).json({ 
        error: 'Missing required fields: applicationId, templateData' 
      });
    }

    const documents = await documentService.generateAllDocuments(applicationId, templateData);

    res.json({
      success: true,
      documents
    });

  } catch (error) {
    logger.error('Error generating all documents:', error);
    res.status(500).json({ error: 'Failed to generate documents' });
  }
});

// Get document information
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await documentService.getDocument(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document
    });

  } catch (error) {
    logger.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Get all documents for an application
router.get('/application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const documents = await documentService.getApplicationDocuments(applicationId);

    res.json({
      success: true,
      documents
    });

  } catch (error) {
    logger.error('Error getting application documents:', error);
    res.status(500).json({ error: 'Failed to get application documents' });
  }
});

// Download document (signed URL verification)
router.get('/:documentId/download', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { signature, expires } = req.query;

    if (!signature || !expires) {
      return res.status(400).json({ error: 'Missing signature or expires parameter' });
    }

    // Verify signature
    const isValid = await documentService.verifyDownloadAccess(
      documentId, 
      signature as string, 
      parseInt(expires as string)
    );

    if (!isValid) {
      return res.status(403).json({ error: 'Invalid or expired download link' });
    }

    // Get document buffer
    const documentBuffer = await documentService.downloadDocument(documentId);
    const document = await documentService.getDocument(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Length', documentBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour cache

    // Send document
    res.send(documentBuffer);

    logger.info(`Document downloaded: ${documentId}`);

  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Health check for document service
router.get('/health', async (req, res) => {
  try {
    res.json({ 
      status: 'healthy', 
      service: 'Document Service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Document service health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
