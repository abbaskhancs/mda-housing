"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.PDFService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const handlebars_1 = __importDefault(require("handlebars"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
const logger_1 = require("../config/logger");
class PDFService {
    constructor() {
        this.browser = null;
        this.templatesDir = path_1.default.join(process.cwd(), 'templates');
        this.registerHandlebarsHelpers();
    }
    registerHandlebarsHelpers() {
        // Date formatting helper
        handlebars_1.default.registerHelper('formatDate', (date) => {
            if (!date)
                return '';
            const d = new Date(date);
            return d.toLocaleDateString('ur-PK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        });
        // Time formatting helper
        handlebars_1.default.registerHelper('formatTime', (date) => {
            if (!date)
                return '';
            const d = new Date(date);
            return d.toLocaleTimeString('ur-PK', {
                hour: '2-digit',
                minute: '2-digit'
            });
        });
        // Currency formatting helper
        handlebars_1.default.registerHelper('formatCurrency', (amount) => {
            if (!amount)
                return '0';
            return new Intl.NumberFormat('ur-PK', {
                style: 'currency',
                currency: 'PKR',
                minimumFractionDigits: 0
            }).format(amount);
        });
        // Status text helper
        handlebars_1.default.registerHelper('getStatusText', (status) => {
            const statusMap = {
                'CLEAR': 'صاف',
                'OBJECTION': 'اعتراض',
                'PENDING': 'زیر التواء',
                'PENDING_PAYMENT': 'ادائیگی زیر التواء',
                'SUBMITTED': 'جمع کرائی گئی',
                'UNDER_SCRUTINY': 'زیر جائزہ',
                'BCA_HOUSING_CLEAR': 'بی سی اے/ہاؤسنگ صاف',
                'ON_HOLD_BCA': 'بی سی اے میں روک دیا گیا',
                'READY_FOR_APPROVAL': 'منظوری کے لیے تیار',
                'APPROVED': 'منظور شدہ',
                'REJECTED': 'مسترد'
            };
            return statusMap[status] || status;
        });
        // Document type text helper
        handlebars_1.default.registerHelper('getDocTypeText', (docType) => {
            const docTypeMap = {
                'AllotmentLetter': 'الٹمنٹ لیٹر',
                'PrevTransferDeed': 'سابقہ منتقلی نامہ',
                'AttorneyDeed': 'وکیل نامہ',
                'GiftDeed': 'تحفہ نامہ',
                'CNIC_Seller': 'فروخت کنندہ کا شناختی کارڈ',
                'CNIC_Buyer': 'خریدار کا شناختی کارڈ',
                'CNIC_Attorney': 'وکیل کا شناختی کارڈ',
                'UtilityBill_Latest': 'تازہ یوٹیلیٹی بل',
                'NOC_BuiltStructure': 'تعمیر شدہ ڈھانچے کا NOC',
                'Photo_Seller': 'فروخت کنندہ کی تصویر',
                'Photo_Buyer': 'خریدار کی تصویر',
                'PrevChallan': 'سابقہ چالان',
                'NOC_Water': 'پانی کا NOC'
            };
            return docTypeMap[docType] || docType;
        });
        // Number to words helper (basic implementation)
        handlebars_1.default.registerHelper('formatCurrencyInWords', (amount) => {
            if (!amount)
                return 'صفر';
            // This is a basic implementation - in production, you'd want a proper number-to-words library
            const words = ['صفر', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس'];
            if (amount <= 10)
                return words[amount];
            return amount.toString();
        });
    }
    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    async generateQRCode(data) {
        try {
            const qrCodeDataURL = await qrcode_1.default.toDataURL(data, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataURL;
        }
        catch (error) {
            logger_1.logger.error('Error generating QR code:', error);
            return '';
        }
    }
    async loadTemplate(templateName) {
        try {
            const templatePath = path_1.default.join(this.templatesDir, templateName);
            const templateContent = await promises_1.default.readFile(templatePath, 'utf-8');
            return templateContent;
        }
        catch (error) {
            logger_1.logger.error(`Error loading template ${templateName}:`, error);
            throw new Error(`Template ${templateName} not found`);
        }
    }
    async renderTemplate(templateName, data) {
        try {
            const templateContent = await this.loadTemplate(templateName);
            const template = handlebars_1.default.compile(templateContent);
            // Generate QR code for the application
            const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications/${data.application.id}`;
            const qrCodeDataURL = await this.generateQRCode(qrData);
            // Add QR code to data
            const templateData = {
                ...data,
                qrCodeDataURL
            };
            return template(templateData);
        }
        catch (error) {
            logger_1.logger.error(`Error rendering template ${templateName}:`, error);
            throw error;
        }
    }
    async generatePDF(templateName, data, options) {
        if (!this.browser) {
            await this.initialize();
        }
        const page = await this.browser.newPage();
        try {
            // Render the template
            const htmlContent = await this.renderTemplate(templateName, data);
            // Set content and wait for fonts to load
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0'
            });
            // Generate PDF with options
            const pdfBuffer = await page.pdf({
                format: options?.format || 'A4',
                margin: {
                    top: options?.margin?.top || '20mm',
                    right: options?.margin?.right || '15mm',
                    bottom: options?.margin?.bottom || '20mm',
                    left: options?.margin?.left || '15mm'
                },
                displayHeaderFooter: options?.displayHeaderFooter || false,
                headerTemplate: options?.headerTemplate || '',
                footerTemplate: options?.footerTemplate || '',
                printBackground: true,
                preferCSSPageSize: true
            });
            return pdfBuffer;
        }
        finally {
            await page.close();
        }
    }
    // Specific methods for each document type
    async generateIntakeReceipt(data) {
        return this.generatePDF('intake/receipt.hbs', data);
    }
    async generateClearanceCertificate(data) {
        return this.generatePDF('clearance/clearance-bca-housing.hbs', data);
    }
    async generateChallan(data) {
        return this.generatePDF('accounts/challan.hbs', data);
    }
    async generateDispatchMemo(data) {
        return this.generatePDF('dispatch/memo.hbs', data);
    }
    async generateTransferDeed(data) {
        return this.generatePDF('deed/transfer-deed.hbs', data);
    }
    // Utility method to generate all document types for an application
    async generateAllDocuments(applicationData) {
        const results = {};
        try {
            // Generate intake receipt
            results.intakeReceipt = await this.generateIntakeReceipt(applicationData);
        }
        catch (error) {
            logger_1.logger.error('Error generating intake receipt:', error);
        }
        try {
            // Generate BCA clearance if available
            if (applicationData.clearances?.some(c => c.section === 'BCA')) {
                results.clearanceBCA = await this.generateClearanceCertificate({
                    ...applicationData,
                    sectionName: 'BCA'
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error generating BCA clearance:', error);
        }
        try {
            // Generate Housing clearance if available
            if (applicationData.clearances?.some(c => c.section === 'HOUSING')) {
                results.clearanceHousing = await this.generateClearanceCertificate({
                    ...applicationData,
                    sectionName: 'HOUSING'
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error generating Housing clearance:', error);
        }
        try {
            // Generate challan if available
            if (applicationData.accountsBreakdown) {
                results.challan = await this.generateChallan(applicationData);
            }
        }
        catch (error) {
            logger_1.logger.error('Error generating challan:', error);
        }
        try {
            // Generate dispatch memo if ready for approval
            if (applicationData.application.currentStage === 'READY_FOR_APPROVAL') {
                results.dispatchMemo = await this.generateDispatchMemo({
                    ...applicationData,
                    memoId: `MEMO-${Date.now()}`,
                    memoDate: new Date()
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error generating dispatch memo:', error);
        }
        try {
            // Generate transfer deed if available
            if (applicationData.transferDeed) {
                results.transferDeed = await this.generateTransferDeed(applicationData);
            }
        }
        catch (error) {
            logger_1.logger.error('Error generating transfer deed:', error);
        }
        return results;
    }
}
exports.PDFService = PDFService;
// Singleton instance
exports.pdfService = new PDFService();
