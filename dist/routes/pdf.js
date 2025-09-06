"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pdfService_1 = require("../services/pdfService");
const logger_1 = require("../config/logger");
const router = express_1.default.Router();
// Generate PDF for a specific template
router.post('/generate/:templateType', async (req, res) => {
    try {
        const { templateType } = req.params;
        const data = req.body;
        let pdfBuffer;
        switch (templateType) {
            case 'intake-receipt':
                pdfBuffer = await pdfService_1.pdfService.generateIntakeReceipt(data);
                break;
            case 'clearance-bca':
                pdfBuffer = await pdfService_1.pdfService.generateClearanceCertificate({
                    ...data,
                    sectionName: 'BCA'
                });
                break;
            case 'clearance-housing':
                pdfBuffer = await pdfService_1.pdfService.generateClearanceCertificate({
                    ...data,
                    sectionName: 'HOUSING'
                });
                break;
            case 'challan':
                pdfBuffer = await pdfService_1.pdfService.generateChallan(data);
                break;
            case 'dispatch-memo':
                pdfBuffer = await pdfService_1.pdfService.generateDispatchMemo({
                    ...data,
                    memoId: `MEMO-${Date.now()}`,
                    memoDate: new Date()
                });
                break;
            case 'transfer-deed':
                pdfBuffer = await pdfService_1.pdfService.generateTransferDeed(data);
                break;
            default:
                return res.status(400).json({ error: 'Invalid template type' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${templateType}-${data.application?.id || 'document'}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        logger_1.logger.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});
// Generate all documents for an application
router.post('/generate-all', async (req, res) => {
    try {
        const data = req.body;
        const documents = await pdfService_1.pdfService.generateAllDocuments(data);
        res.json({
            success: true,
            documents: Object.keys(documents).map(key => ({
                type: key,
                generated: !!documents[key]
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating all documents:', error);
        res.status(500).json({ error: 'Failed to generate documents' });
    }
});
// Health check for PDF service
router.get('/health', async (req, res) => {
    try {
        await pdfService_1.pdfService.initialize();
        res.json({ status: 'healthy', service: 'PDF Generation' });
    }
    catch (error) {
        logger_1.logger.error('PDF service health check failed:', error);
        res.status(500).json({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
exports.default = router;
