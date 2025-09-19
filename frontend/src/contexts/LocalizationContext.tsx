"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = 'en' | 'ur';

type LocalizationContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

// Translation keys and values
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.newApplication': 'New Application',
    'nav.bcaConsole': 'BCA Console',
    'nav.housingConsole': 'Housing Console',
    'nav.accountsConsole': 'Accounts Console',
    'nav.approvalConsole': 'Approval Console',
    'nav.adminPanel': 'Admin Panel',
    'nav.userManagement': 'User Management',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.registers': 'Registers',
    
    // Common
    'common.name': 'Name',
    'common.cnic': 'CNIC',
    'common.fatherName': "Father's Name",
    'common.phone': 'Phone',
    'common.email': 'Email',
    'common.address': 'Address',
    'common.required': 'Required',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.submit': 'Submit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Application Form
    'form.newApplication': 'New Application',
    'form.sellerInformation': 'Seller Information',
    'form.buyerInformation': 'Buyer Information',
    'form.attorneyInformation': 'Attorney Information (Optional)',
    'form.propertyInformation': 'Property Information',
    'form.plotNumber': 'Plot Number',
    'form.blockNumber': 'Block Number',
    'form.sectorNumber': 'Sector Number',
    'form.area': 'Area (sq ft)',
    'form.location': 'Location',
    'form.waterNocRequired': 'Water NOC required?',
    'form.waterNocRequirement': 'Water NOC Requirement',
    'form.attachments': 'Attachments',
    'form.docType': 'Doc Type',
    'form.file': 'File',
    'form.originalSeen': 'Original seen',
    'form.addRow': '+ Add row',
    'form.select': 'Select',
    'form.createApplication': 'Create Application',
    'form.submitting': 'Submitting...',
    
    // Success Messages
    'success.applicationCreated': 'Application Created Successfully!',
    'success.downloadReceipt': 'Download Intake Receipt PDF',
    'success.redirecting': 'Redirecting to application details in 3 seconds...',
    
    // Validation Messages
    'validation.validCnicRequired': 'Valid CNIC required (12345-1234567-1)',
    'validation.validEmailRequired': 'Valid email required',
    'validation.validAreaRequired': 'Valid area required',
    
    // Document Types
    'docType.AllotmentLetter': 'Allotment Letter',
    'docType.PrevTransferDeed': 'Previous Transfer Deed',
    'docType.AttorneyDeed': 'Attorney Deed',
    'docType.GiftDeed': 'Gift Deed',
    'docType.CNIC_Seller': 'CNIC (Seller)',
    'docType.CNIC_Buyer': 'CNIC (Buyer)',
    'docType.CNIC_Attorney': 'CNIC (Attorney)',
    'docType.UtilityBill_Latest': 'Latest Utility Bill',
    'docType.NOC_BuiltStructure': 'NOC Built Structure',
    'docType.Photo_Seller': 'Photo (Seller)',
    'docType.Photo_Buyer': 'Photo (Buyer)',
    'docType.PrevChallan': 'Previous Challan',
    'docType.NOC_Water': 'Water NOC',
    
    // Home Page
    'home.welcome': 'Welcome to MDA Housing',
    'home.subtitle': 'Housing Transfer Workflow Management System',
    
    // Language Toggle
    'language.english': 'English',
    'language.urdu': 'اردو',
    'language.toggle': 'Language',
  },
  ur: {
    // Navigation
    'nav.home': 'ہوم',
    'nav.newApplication': 'نئی درخواست',
    'nav.bcaConsole': 'بی سی اے کنسول',
    'nav.housingConsole': 'ہاؤسنگ کنسول',
    'nav.accountsConsole': 'اکاؤنٹس کنسول',
    'nav.approvalConsole': 'منظوری کنسول',
    'nav.adminPanel': 'ایڈمن پینل',
    'nav.userManagement': 'صارف کا انتظام',
    'nav.logout': 'لاگ آؤٹ',
    'nav.login': 'لاگ ان',
    'nav.registers': 'رجسٹرز',
    
    // Common
    'common.name': 'نام',
    'common.cnic': 'شناختی کارڈ',
    'common.fatherName': 'والد کا نام',
    'common.phone': 'فون',
    'common.email': 'ای میل',
    'common.address': 'پتہ',
    'common.required': 'ضروری',
    'common.cancel': 'منسوخ کریں',
    'common.save': 'محفوظ کریں',
    'common.submit': 'جمع کریں',
    'common.loading': 'لوڈ ہو رہا ہے...',
    'common.error': 'خرابی',
    'common.success': 'کامیابی',
    'common.yes': 'ہاں',
    'common.no': 'نہیں',
    
    // Application Form
    'form.newApplication': 'نئی درخواست',
    'form.sellerInformation': 'فروخت کنندہ کی معلومات',
    'form.buyerInformation': 'خریدار کی معلومات',
    'form.attorneyInformation': 'اٹارنی کی معلومات (اختیاری)',
    'form.propertyInformation': 'جائیداد کی معلومات',
    'form.plotNumber': 'پلاٹ نمبر',
    'form.blockNumber': 'بلاک نمبر',
    'form.sectorNumber': 'سیکٹر نمبر',
    'form.area': 'رقبہ (مربع فٹ)',
    'form.location': 'مقام',
    'form.waterNocRequired': 'کیا واٹر NOC درکار ہے؟',
    'form.waterNocRequirement': 'واٹر NOC کی ضرورت',
    'form.attachments': 'منسلکات',
    'form.docType': 'دستاویز',
    'form.file': 'فائل',
    'form.originalSeen': 'اصلی دیکھا گیا',
    'form.addRow': 'قطار شامل کریں +',
    'form.select': 'منتخب کریں',
    'form.createApplication': 'درخواست بنائیں',
    'form.submitting': 'جمع کر رہے ہیں...',
    
    // Success Messages
    'success.applicationCreated': 'درخواست کامیابی سے بن گئی!',
    'success.downloadReceipt': 'رسید ڈاؤن لوڈ کریں',
    'success.redirecting': '3 سیکنڈ میں درخواست کی تفصیلات پر بھیج رہے ہیں...',
    
    // Validation Messages
    'validation.validCnicRequired': 'درست شناختی کارڈ درکار (12345-1234567-1)',
    'validation.validEmailRequired': 'درست ای میل درکار',
    'validation.validAreaRequired': 'درست رقبہ درکار',
    
    // Document Types
    'docType.AllotmentLetter': 'الاٹمنٹ لیٹر',
    'docType.PrevTransferDeed': 'سابقہ منتقلی ڈید',
    'docType.AttorneyDeed': 'اٹارنی ڈید',
    'docType.GiftDeed': 'گفٹ ڈید',
    'docType.CNIC_Seller': 'شناختی کارڈ (فروخت کنندہ)',
    'docType.CNIC_Buyer': 'شناختی کارڈ (خریدار)',
    'docType.CNIC_Attorney': 'شناختی کارڈ (اٹارنی)',
    'docType.UtilityBill_Latest': 'حالیہ یوٹیلیٹی بل',
    'docType.NOC_BuiltStructure': 'تعمیر کا این او سی',
    'docType.Photo_Seller': 'تصویر (فروخت کنندہ)',
    'docType.Photo_Buyer': 'تصویر (خریدار)',
    'docType.PrevChallan': 'سابقہ چالان',
    'docType.NOC_Water': 'پانی کا این او سی',
    
    // Home Page
    'home.welcome': 'ایم ڈی اے ہاؤسنگ میں خوش آمدید',
    'home.subtitle': 'ہاؤسنگ ٹرانسفر ورک فلو مینجمنٹ سسٹم',
    
    // Language Toggle
    'language.english': 'English',
    'language.urdu': 'اردو',
    'language.toggle': 'زبان',
  }
};

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ur'); // Default to Urdu

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('app_language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ur')) {
        setLanguageState(savedLanguage);
      }
    }
  }, []);

  // Save language preference to localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
  }, []);

  // Translation function
  const t = useCallback((key: string, fallback?: string): string => {
    const translation = translations[language]?.[key];
    if (translation) {
      return translation;
    }
    
    // Fallback to English if Urdu translation not found
    if (language === 'ur') {
      const englishTranslation = translations.en?.[key];
      if (englishTranslation) {
        return englishTranslation;
      }
    }
    
    // Return fallback or key if no translation found
    return fallback || key;
  }, [language]);

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    setLanguage,
    t
  }), [language, setLanguage, t]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
