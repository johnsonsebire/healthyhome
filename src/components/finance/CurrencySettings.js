import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Divider } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import currencyService from '../../services/currencyService';

const CurrencySettings = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    displayCurrency: 'GHS',
    autoConvert: true,
    defaultAccountCurrency: 'GHS',
    showExchangeRates: true,
    rateUpdateFrequency: 'daily'
  });

  // Load current settings when modal opens
  useEffect(() => {
    if (visible && user) {
      loadSettings();
    }
  }, [visible, user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const userSettings = await currencyService.loadUserCurrencySettings(user.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading currency settings:', error);
      Alert.alert('Error', 'Failed to load currency settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await currencyService.saveUserCurrencySettings(user.uid, settings);
      Alert.alert('Success', 'Currency settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving currency settings:', error);
      Alert.alert('Error', 'Failed to save currency settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (currency) => {
    setSettings({
      ...settings,
      displayCurrency: currency
    });
  };

  const handleDefaultAccountCurrencyChange = (currency) => {
    setSettings({
      ...settings,
      defaultAccountCurrency: currency
    });
  };

  const handleAutoConvertToggle = (value) => {
    setSettings({
      ...settings,
      autoConvert: value
    });
  };

  const handleShowExchangeRatesToggle = (value) => {
    setSettings({
      ...settings,
      showExchangeRates: value
    });
  };

  const getCurrencyDisplayName = (code) => {
    const currency = currencyService.getSupportedCurrencies().find(c => c.code === code);
    return currency ? `${currency.name} (${currency.symbol})` : code;
  };

  const CurrencySelector = ({ title, selectedCurrency, onSelect, description }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScrollView}>
        {currencyService.getSupportedCurrencies().map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyOption,
              selectedCurrency === currency.code && styles.currencyOptionSelected
            ]}
            onPress={() => onSelect(currency.code)}
          >
            <Text style={styles.currencyFlag}>{currency.flag}</Text>
            <Text style={[
              styles.currencyCode,
              selectedCurrency === currency.code && styles.currencyCodeSelected
            ]}>
              {currency.code}
            </Text>
            <Text style={[
              styles.currencySymbol,
              selectedCurrency === currency.code && styles.currencySymbolSelected
            ]}>
              {currency.symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Currency Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Currency Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <CurrencySelector
            title="Display Currency"
            description="All amounts will be shown in this currency when auto-convert is enabled"
            selectedCurrency={settings.displayCurrency}
            onSelect={handleCurrencyChange}
          />

          <Divider style={styles.divider} />

          <CurrencySelector
            title="Default Account Currency"
            description="New accounts will default to this currency"
            selectedCurrency={settings.defaultAccountCurrency}
            onSelect={handleDefaultAccountCurrencyChange}
          />

          <Divider style={styles.divider} />

          {/* Auto Convert Setting */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto Convert</Text>
              <Text style={styles.settingDescription}>
                Automatically convert and display all amounts in your display currency
              </Text>
            </View>
            <Switch
              value={settings.autoConvert}
              onValueChange={handleAutoConvertToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.autoConvert ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Show Exchange Rates Setting */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Exchange Rates</Text>
              <Text style={styles.settingDescription}>
                Display current exchange rates in currency conversion notifications
              </Text>
            </View>
            <Switch
              value={settings.showExchangeRates}
              onValueChange={handleShowExchangeRatesToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.showExchangeRates ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Exchange Rates Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Exchange Rate Information</Text>
            <Text style={styles.infoText}>
              • Exchange rates are updated automatically every few hours
            </Text>
            <Text style={styles.infoText}>
              • GHS (Ghanaian Cedi) is used as the base currency for all conversions
            </Text>
            <Text style={styles.infoText}>
              • Rates are provided for informational purposes and may vary from actual market rates
            </Text>
            <Text style={styles.infoText}>
              • When auto-convert is disabled, amounts are shown in their original currencies
            </Text>
          </View>

          {/* Current Exchange Rates Preview */}
          <View style={styles.ratesPreview}>
            <Text style={styles.ratesTitle}>Current Exchange Rates (to GHS)</Text>
            {currencyService.getSupportedCurrencies()
              .filter(currency => currency.code !== 'GHS')
              .slice(0, 5)
              .map((currency) => (
                <View key={currency.code} style={styles.rateRow}>
                  <Text style={styles.rateText}>
                    1 {currency.code} = {currencyService.getExchangeRate(currency.code, 'GHS').toFixed(4)} GHS
                  </Text>
                </View>
              ))
            }
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={saveSettings}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            mode="outlined"
            onPress={onClose}
            disabled={saving}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  currencyScrollView: {
    marginHorizontal: -8,
  },
  currencyOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  currencyOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  currencyFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  currencyCodeSelected: {
    color: '#6366f1',
  },
  currencySymbol: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  currencySymbolSelected: {
    color: '#6366f1',
  },
  divider: {
    marginVertical: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratesPreview: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  ratesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rateRow: {
    paddingVertical: 4,
  },
  rateText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
});

export default CurrencySettings;
