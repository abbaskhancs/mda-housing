import puppeteer, { Browser } from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { logger } from '../config/logger';

export interface PDFTemplateData {
  application: any;
  plot?: any;
  attachments?: any[];
  clearances?: any[];
  reviews?: any[];
  accountsBreakdown?: any;
  transferDeed?: any;
  witness1?: any;
  witness2?: any;
  sectionName?: string;
  memoId?: string;
  memoDate?: Date;
  [key: string]: any;
}

export class PDFService {
  private browser: Browser | null = null;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates');
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('ur-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Time formatting helper
    handlebars.registerHelper('formatTime', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleTimeString('ur-PK', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Currency formatting helper
    handlebars.registerHelper('formatCurrency', (amount: number) => {
      if (!amount) return '0';
      return new Intl.NumberFormat('ur-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0
      }).format(amount);
    });

    // Status text helper
    handlebars.registerHelper('getStatusText', (status: string) => {
      const statusMap: { [key: string]: string } = {
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
    handlebars.registerHelper('getDocTypeText', (docType: string) => {
      const docTypeMap: { [key: string]: string } = {
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
    handlebars.registerHelper('formatCurrencyInWords', (amount: number) => {
      if (!amount) return 'صفر';
      // This is a basic implementation - in production, you'd want a proper number-to-words library
      const words = ['صفر', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس'];
      if (amount <= 10) return words[amount];
      return amount.toString();
    });
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
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

  private async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      logger.error('Error generating QR code:', error);
      return '';
    }
  }

  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, templateName);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      return templateContent;
    } catch (error) {
      logger.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  private async renderTemplate(templateName: string, data: PDFTemplateData): Promise<string> {
    try {
      const templateContent = await this.loadTemplate(templateName);
      const template = handlebars.compile(templateContent);
      
      // Generate QR code for the application
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications/${data.application.id}`;
      const qrCodeDataURL = await this.generateQRCode(qrData);
      
      // Add QR code to data
      const templateData = {
        ...data,
        qrCodeDataURL
      };
      
      return template(templateData);
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      throw error;
    }
  }

  async generatePDF(templateName: string, data: PDFTemplateData, options?: {
    format?: 'A4' | 'Letter';
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
  }): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
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
    } finally {
      await page.close();
    }
  }

  // Specific methods for each document type
  async generateIntakeReceipt(data: PDFTemplateData): Promise<Buffer> {
    return this.generatePDF('intake/receipt.hbs', data);
  }

  async generateClearanceCertificate(data: PDFTemplateData): Promise<Buffer> {
    return this.generatePDF('clearance/clearance-bca-housing.hbs', data);
  }

  async generateChallan(data: PDFTemplateData): Promise<Buffer> {
    return this.generatePDF('accounts/challan.hbs', data);
  }

  async generateDispatchMemo(data: PDFTemplateData): Promise<Buffer> {
    return this.generatePDF('dispatch/memo.hbs', data);
  }

  async generateTransferDeed(data: PDFTemplateData): Promise<Buffer> {
    return this.generatePDF('deed/transfer-deed.hbs', data);
  }

  // Utility method to generate all document types for an application
  async generateAllDocuments(applicationData: PDFTemplateData): Promise<{
    intakeReceipt?: Buffer;
    clearanceBCA?: Buffer;
    clearanceHousing?: Buffer;
    challan?: Buffer;
    dispatchMemo?: Buffer;
    transferDeed?: Buffer;
  }> {
    const results: any = {};

    try {
      // Generate intake receipt
      results.intakeReceipt = await this.generateIntakeReceipt(applicationData);
    } catch (error) {
      logger.error('Error generating intake receipt:', error);
    }

    try {
      // Generate BCA clearance if available
      if (applicationData.clearances?.some(c => c.section === 'BCA')) {
        results.clearanceBCA = await this.generateClearanceCertificate({
          ...applicationData,
          sectionName: 'BCA'
        });
      }
    } catch (error) {
      logger.error('Error generating BCA clearance:', error);
    }

    try {
      // Generate Housing clearance if available
      if (applicationData.clearances?.some(c => c.section === 'HOUSING')) {
        results.clearanceHousing = await this.generateClearanceCertificate({
          ...applicationData,
          sectionName: 'HOUSING'
        });
      }
    } catch (error) {
      logger.error('Error generating Housing clearance:', error);
    }

    try {
      // Generate challan if available
      if (applicationData.accountsBreakdown) {
        results.challan = await this.generateChallan(applicationData);
      }
    } catch (error) {
      logger.error('Error generating challan:', error);
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
    } catch (error) {
      logger.error('Error generating dispatch memo:', error);
    }

    try {
      // Generate transfer deed if available
      if (applicationData.transferDeed) {
        results.transferDeed = await this.generateTransferDeed(applicationData);
      }
    } catch (error) {
      logger.error('Error generating transfer deed:', error);
    }

    return results;
  }
}

// Singleton instance
export const pdfService = new PDFService();
