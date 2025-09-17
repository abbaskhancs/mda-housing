"use strict";
/**
 * Utility functions for converting numbers to words in English and Urdu
 * Used for challan generation and amount display
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberToWordsEnglish = numberToWordsEnglish;
exports.numberToWordsUrdu = numberToWordsUrdu;
exports.formatCurrencyInWords = formatCurrencyInWords;
exports.formatCurrencyInWordsHelper = formatCurrencyInWordsHelper;
// English number to words conversion
const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const thousands = ['', 'thousand', 'million', 'billion'];
// Urdu number to words conversion
const urduOnes = ['', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو'];
const urduTeens = ['دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس'];
const urduTens = ['', '', 'بیس', 'تیس', 'چالیس', 'پچاس', 'ساٹھ', 'ستر', 'اسی', 'نوے'];
const urduHundreds = ['', 'ایک سو', 'دو سو', 'تین سو', 'چار سو', 'پانچ سو', 'چھ سو', 'سات سو', 'آٹھ سو', 'نو سو'];
function convertHundreds(num) {
    let result = '';
    if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' hundred';
        num %= 100;
        if (num > 0)
            result += ' ';
    }
    if (num >= 20) {
        result += tens[Math.floor(num / 10)];
        num %= 10;
        if (num > 0)
            result += '-' + ones[num];
    }
    else if (num >= 10) {
        result += teens[num - 10];
    }
    else if (num > 0) {
        result += ones[num];
    }
    return result;
}
function convertHundredsUrdu(num) {
    let result = '';
    if (num >= 100) {
        result += urduHundreds[Math.floor(num / 100)];
        num %= 100;
        if (num > 0)
            result += ' ';
    }
    if (num >= 20) {
        result += urduTens[Math.floor(num / 10)];
        num %= 10;
        if (num > 0)
            result += ' ' + urduOnes[num];
    }
    else if (num >= 10) {
        result += urduTeens[num - 10];
    }
    else if (num > 0) {
        result += urduOnes[num];
    }
    return result;
}
function numberToWordsEnglish(num) {
    if (num === 0)
        return 'zero';
    if (num < 0)
        return 'negative ' + numberToWordsEnglish(-num);
    let result = '';
    let thousandCounter = 0;
    while (num > 0) {
        if (num % 1000 !== 0) {
            const chunk = convertHundreds(num % 1000);
            if (thousandCounter > 0) {
                result = chunk + ' ' + thousands[thousandCounter] + (result ? ' ' + result : '');
            }
            else {
                result = chunk;
            }
        }
        num = Math.floor(num / 1000);
        thousandCounter++;
    }
    return result.trim();
}
function numberToWordsUrdu(num) {
    if (num === 0)
        return 'صفر';
    if (num < 0)
        return 'منفی ' + numberToWordsUrdu(-num);
    let result = '';
    // Handle crores (10,000,000)
    if (num >= 10000000) {
        const crores = Math.floor(num / 10000000);
        result += convertHundredsUrdu(crores) + ' کروڑ';
        num %= 10000000;
        if (num > 0)
            result += ' ';
    }
    // Handle lakhs (100,000)
    if (num >= 100000) {
        const lakhs = Math.floor(num / 100000);
        result += convertHundredsUrdu(lakhs) + ' لاکھ';
        num %= 100000;
        if (num > 0)
            result += ' ';
    }
    // Handle thousands (1,000)
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        result += convertHundredsUrdu(thousands) + ' ہزار';
        num %= 1000;
        if (num > 0)
            result += ' ';
    }
    // Handle remaining hundreds, tens, and ones
    if (num > 0) {
        result += convertHundredsUrdu(num);
    }
    return result.trim();
}
function formatCurrencyInWords(amount, currency = 'PKR', language = 'ur') {
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);
    let result = '';
    if (language === 'ur') {
        result = numberToWordsUrdu(wholePart);
        if (currency === 'PKR') {
            result += ' روپے';
            if (decimalPart > 0) {
                result += ' ' + numberToWordsUrdu(decimalPart) + ' پیسے';
            }
        }
    }
    else {
        result = numberToWordsEnglish(wholePart);
        if (currency === 'PKR') {
            result += ' rupees';
            if (decimalPart > 0) {
                result += ' and ' + numberToWordsEnglish(decimalPart) + ' paisa';
            }
        }
    }
    return result + ' only';
}
// Helper function for templates
function formatCurrencyInWordsHelper(amount) {
    return formatCurrencyInWords(amount, 'PKR', 'ur');
}
