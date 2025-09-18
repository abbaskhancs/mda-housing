/**
 * Simple test to verify number-to-words functionality
 */

const { formatCurrencyInWords } = require('./dist/utils/numberToWords');

// Test cases
const testCases = [
  { amount: 1500, expected: 'ایک ہزار پانچ سو روپے only' },
  { amount: 25000, expected: 'پچیس ہزار روپے only' },
  { amount: 150000, expected: 'ایک لاکھ پچاس ہزار روپے only' },
  { amount: 2500000, expected: 'پچیس لاکھ روپے only' }
];

console.log('🧪 TESTING NUMBER-TO-WORDS UTILITY');
console.log('===================================\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. Testing amount: ${testCase.amount}`);
  
  const result = formatCurrencyInWords(testCase.amount);
  console.log(`   Result: ${result}`);
  console.log(`   Expected: ${testCase.expected}`);
  
  if (result === testCase.expected) {
    console.log('   ✅ PASS\n');
  } else {
    console.log('   ❌ FAIL\n');
  }
});

console.log('🎯 Testing consistency between calls...');
const amount = 75000;
const call1 = formatCurrencyInWords(amount);
const call2 = formatCurrencyInWords(amount);
const call3 = formatCurrencyInWords(amount);

console.log(`Amount: ${amount}`);
console.log(`Call 1: ${call1}`);
console.log(`Call 2: ${call2}`);
console.log(`Call 3: ${call3}`);

if (call1 === call2 && call2 === call3) {
  console.log('✅ All calls produce identical results');
} else {
  console.log('❌ Inconsistent results between calls');
}

console.log('\n🎉 Number-to-words utility test completed!');
