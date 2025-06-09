// Record type utilities and constants

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

// Generate a simple barcode pattern (simulation)
export const generateBarcodePattern = (data) => {
  if (!data) return '';
  
  // Simple barcode simulation using alternating thick/thin lines
  const chars = data.toString().split('');
  let pattern = '';
  
  chars.forEach((char, index) => {
    const charCode = char.charCodeAt(0);
    // Create pattern based on character code
    for (let i = 0; i < 8; i++) {
      pattern += (charCode & (1 << i)) ? '█' : '▌';
    }
    if (index < chars.length - 1) pattern += ' ';
  });
  
  return pattern;
};

// Format insurance provider names for ID cards
export const formatProviderForCard = (provider) => {
  if (!provider) return '';
  
  if (provider.toLowerCase().includes('nhis')) {
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
