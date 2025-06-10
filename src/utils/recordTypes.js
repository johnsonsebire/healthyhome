// Record type utilities and constants
import React from 'react';
import { View, Text } from 'react-native';

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

// Proper barcode component using a reliable pattern approach
export const generateBarcodeComponent = (data) => {
  if (!data) {
    return (
      <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>No data for barcode</Text>
      </View>
    );
  }

  // Convert data to string and ensure it's not too long
  const barcodeData = data.toString().substring(0, 30);

  // Generate a visually appealing barcode pattern
  const generateBars = (input) => {
    const bars = [];
    const value = input.toString();
    
    // Create start pattern
    bars.push({ width: 2, color: '#000' });
    bars.push({ width: 1, color: '#fff' });
    bars.push({ width: 2, color: '#000' });
    
    // Create bars based on character values
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      
      // Thin bar
      bars.push({ width: 1, color: '#000' });
      bars.push({ width: 1, color: '#fff' });
      
      // Varying width bar based on character value
      const barWidth = (charCode % 3) + 1;
      bars.push({ width: barWidth, color: '#000' });
      bars.push({ width: 1, color: '#fff' });
    }
    
    // End pattern
    bars.push({ width: 2, color: '#000' });
    bars.push({ width: 1, color: '#fff' });
    bars.push({ width: 2, color: '#000' });
    
    return bars;
  };

  const bars = generateBars(barcodeData);
  
  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View style={{
        flexDirection: 'row',
        height: 60,
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ddd'
      }}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={{
              width: bar.width,
              height: 50,
              backgroundColor: bar.color,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 12, marginTop: 5, fontFamily: 'monospace' }}>{barcodeData}</Text>
    </View>
  );
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
