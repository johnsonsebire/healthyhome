// Record type utilities and constants
import { generateBarcode } from 'expo-barcode-generator';

export const RECORD_TYPE_DISPLAY_NAMES = {
  prescription: 'Prescription',
  diagnosis: 'Diagnosis',
  hospital_card: 'Hospital Card',
  bill: 'Medical Bill',
  insurance: 'Insurance'
};

export const RECORD_TYPE_COLORS = {
  prescription: '#10b981',
  diagnosis: '#f59e0b',
  hospital_card: '#6366f1',
  bill: '#ef4444',
  insurance: '#8b5cf6'
};

export const RECORD_TYPE_ICONS = {
  prescription: 'medical',
  diagnosis: 'pulse',
  hospital_card: 'card',
  bill: 'receipt',
  insurance: 'shield-checkmark'
};

export const getRecordTypeDisplayName = (type) => {
  return RECORD_TYPE_DISPLAY_NAMES[type] || type;
};

export const getRecordTypeColor = (type) => {
  return RECORD_TYPE_COLORS[type] || '#6366f1';
};

export const getRecordTypeIcon = (type) => {
  return RECORD_TYPE_ICONS[type] || 'document';
};

// Generate a proper barcode using expo-barcode-generator with CODE128
export const generateBarcodePattern = async (data) => {
  if (!data) return '';
  
  try {
    // Generate CODE128 barcode
    const barcode = await generateBarcode({
      value: data.toString(),
      format: 'CODE128',
      width: 200,
      height: 60,
      displayValue: false,
    });
    
    return barcode;
  } catch (error) {
    console.error('Error generating barcode:', error);
    // Fallback to text pattern if barcode generation fails
    return generateBarcodePatternSync(data);
  }
};

// Synchronous barcode pattern generation for immediate display
export const generateBarcodePatternSync = (data) => {
  if (!data) return '';
  
  const value = data.toString();
  const barWidth = 2;
  let pattern = '';
  
  // Create alternating pattern based on data
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i) % 4;
    switch (charCode) {
      case 0:
        pattern += '█'.repeat(barWidth) + '▌'.repeat(barWidth);
        break;
      case 1:
        pattern += '▌'.repeat(barWidth) + '█'.repeat(barWidth);
        break;
      case 2:
        pattern += '█'.repeat(barWidth * 2);
        break;
      default:
        pattern += '▌'.repeat(barWidth * 2);
    }
  }
  
  return pattern;
};

// Format insurance provider names for display and ID cards
export const formatProviderForCard = (provider) => {
  if (!provider) return { organization: '', cardType: 'INSURANCE CARD', country: '' };
  
  const providerLower = provider.toLowerCase();
  
  if (providerLower.includes('nhis') || providerLower === 'nhis') {
    return {
      country: 'REPUBLIC OF GHANA',
      organization: 'NATIONAL HEALTH INSURANCE SCHEME',
      cardType: 'MEMBERSHIP IDENTIFICATION CARD'
    };
  }
  
  return {
    country: '',
    organization: provider.toUpperCase(),
    cardType: 'INSURANCE CARD'
  };
};

// Get proper display name for insurance providers
export const getProviderDisplayName = (providerId, customProvider = null) => {
  if (providerId === 'other' && customProvider) {
    return customProvider;
  }
  
  const providerMap = {
    'nhis': 'NHIS (National Health Insurance Scheme)',
    'other': 'Other'
  };
  
  return providerMap[providerId] || providerId;
};
