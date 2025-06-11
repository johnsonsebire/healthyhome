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

// Generate barcode component - improved appearance for better UI integration
export const generateBarcodeComponent = (data) => {
  if (!data) {
    return (
      <View style={{ 
        width: '100%',
        height: 60, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb'
      }}>
        <Text style={{ color: '#6b7280', fontSize: 14 }}>No data for barcode</Text>
      </View>
    );
  }

  // Convert data to string and ensure it's not too long
  const barcodeData = data.toString().substring(0, 30);

  // Generate a visually appealing barcode pattern with better spacing
  const generateBars = (input) => {
    const bars = [];
    const value = input.toString();
    
    // Create start pattern - wider for better visibility
    bars.push({ width: 3, color: '#000' });
    bars.push({ width: 2, color: '#fff' });
    bars.push({ width: 3, color: '#000' });
    bars.push({ width: 2, color: '#fff' });
    
    // Create bars based on character values - with increased spacing
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      
      // Variable width bars based on character value
      const barWidth = 2 + (charCode % 4); // Width between 2-5 pixels
      bars.push({ width: barWidth, color: '#000' });
      bars.push({ width: 2, color: '#fff' }); // Wider spacing between bars
      
      // Add second bar with different width for visual variety
      const secondBarWidth = 1 + (charCode % 3); // Width between 1-3 pixels
      bars.push({ width: secondBarWidth, color: '#000' });
      bars.push({ width: 3, color: '#fff' }); // Even wider spacing
    }
    
    // End pattern - wider for better visibility
    bars.push({ width: 3, color: '#000' });
    bars.push({ width: 2, color: '#fff' });
    bars.push({ width: 3, color: '#000' });
    
    return bars;
  };

  const bars = generateBars(barcodeData);
  
  return (
    <View style={{ 
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#e5e7eb'
    }}>
      <View style={{
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingVertical: 12,
        paddingHorizontal: 16
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          width: '100%',
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#f3f4f6',
          minHeight: 80
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            <View style={{ flex: 1 }} />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80%' // Make the barcode take up 80% of available width
            }}>
              {bars.map((bar, index) => (
                <View
                  key={index}
                  style={{
                    width: bar.width,
                    height: 60,
                    backgroundColor: bar.color,
                    marginHorizontal: 0.5, // Add small horizontal spacing between bars
                  }}
                />
              ))}
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </View>
        <Text style={{ 
          fontSize: 12, 
          marginTop: 8,
          fontFamily: 'monospace',
          color: '#4b5563',
          letterSpacing: 0.5,
          textAlign: 'center'
        }}>{barcodeData}</Text>
      </View>
    </View>
  );
};

// Format insurance provider names for display and ID cards
export const formatProviderForCard = (provider) => {
  if (!provider) return { organization: '', cardType: 'INSURANCE CARD', country: '' };
  
  const providerLower = provider.toLowerCase();
  
  if (providerLower.includes('nhis') || providerLower.includes('national health insurance')) {
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
    'nhis': 'National Health Insurance Scheme (NHIS)',
    'other': 'Other'
  };
  
  return providerMap[providerId] || providerId;
};
