// Test file to check expo-barcode-generator usage
import { generateBarcode } from 'expo-barcode-generator';

console.log('Testing expo-barcode-generator...');
console.log('generateBarcode function:', typeof generateBarcode);

try {
  const result = generateBarcode({
    value: 'TEST123',
    format: 'CODE128',
    width: 200,
    height: 60,
    displayValue: false,
  });
  
  console.log('Barcode result:', result);
  console.log('Result type:', typeof result);
} catch (error) {
  console.error('Error:', error);
}
