/**
 * Utility functions for converting numbers to words in English and Urdu
 * Used for challan generation and amount display
 */
export declare function numberToWordsEnglish(num: number): string;
export declare function numberToWordsUrdu(num: number): string;
export declare function formatCurrencyInWords(amount: number, currency?: string, language?: 'en' | 'ur'): string;
export declare function formatCurrencyInWordsHelper(amount: number): string;
export declare function formatCurrency(amount: number): string;
