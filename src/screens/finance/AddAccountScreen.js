import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { Button, Divider, Menu, Icon } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import currencyService from '../../services/currencyService';

// Custom components for menu items
const ColorMenuItem = ({ color, label }) => (
  <View style={[styles.menuColorPreview, { backgroundColor: color }]} />
);

const IconMenuItem = ({ iconName, color }) => (
  <MaterialIcons name={iconName} size={24} color={color} />
);

const AddAccountScreen = ({ navigation, route }) => {
  const { createAccount } = useFinance();
  
  // Get scope if passed from route params
  const scope = route.params?.scope || FINANCE_SCOPE.PERSONAL;
  
  // State for the form
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    initialBalance: '', // Added initialBalance
    currency: 'GHS',
    icon: 'account-balance',
    color: '#2196F3',
    scope: scope,
    sharedWith: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  
  // Account types
  const accountTypes = [
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' },
  ];
  
  // Currencies - Use currency service
  const currencies = currencyService.getSupportedCurrencies().map(currency => ({
    value: currency.code,
    label: `${currency.code} (${currency.symbol})`
  }));
  
  // Colors
  const colors = [
    { value: '#2196F3', label: 'Blue' },
    { value: '#4CAF50', label: 'Green' },
    { value: '#F44336', label: 'Red' },
    { value: '#FFC107', label: 'Yellow' },
    { value: '#9C27B0', label: 'Purple' },
    { value: '#FF9800', label: 'Orange' },
    { value: '#607D8B', label: 'Gray' },
  ];
  
  // Icons
  const icons = [
    { value: 'account-balance', label: 'Bank' },
    { value: 'account-balance-wallet', label: 'Wallet' },
    { value: 'credit-card', label: 'Credit Card' },
    { value: 'savings', label: 'Savings' },
    { value: 'attach-money', label: 'Cash' },
    { value: 'trending-up', label: 'Investment' },
    { value: 'star', label: 'Star' },
  ];
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }
    
    if (!formData.balance || isNaN(formData.balance)) {
      Alert.alert('Error', 'Please enter a valid balance');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const parsedBalance = parseFloat(formData.balance);
      // Use the balance as initialBalance if none is provided
      const parsedInitialBalance = formData.initialBalance ? 
        parseFloat(formData.initialBalance) : parsedBalance;
      
      await createAccount({
        ...formData,
        balance: parsedBalance,
        initialBalance: parsedInitialBalance
      });
      
      Alert.alert(
        'Success', 
        'Account created successfully', 
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get scope label
  const getScopeLabel = () => {
    switch (scope) {
      case FINANCE_SCOPE.PERSONAL:
        return 'Personal Account';
      case FINANCE_SCOPE.NUCLEAR:
        return 'Family Account';
      case FINANCE_SCOPE.EXTENDED:
        return 'Extended Family Account';
      default:
        return 'Account';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.scopeLabel}>{getScopeLabel()}</Text>
        
        {/* Account Name */}
        <Text style={styles.inputLabel}>Account Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter account name"
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholderTextColor="#999"
        />
        
        {/* Account Type */}
        <Text style={styles.inputLabel}>Account Type</Text>
        <Menu
          visible={showTypeMenu}
          onDismiss={() => setShowTypeMenu(false)}
          anchor={
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowTypeMenu(true)}
            >
              <Text style={styles.dropdownText}>
                {accountTypes.find(type => type.value === formData.type)?.label || 'Select Type'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>
          }
        >
          {accountTypes.map(type => (
            <Menu.Item
              key={type.value}
              onPress={() => {
                handleInputChange('type', type.value);
                setShowTypeMenu(false);
              }}
              title={type.label}
            />
          ))}
        </Menu>
        
        {/* Initial Balance */}
        <Text style={styles.inputLabel}>Initial Balance</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>
            {currencyService.getCurrencySymbol(formData.currency)}
          </Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={formData.balance}
            onChangeText={(value) => {
              handleInputChange('balance', value);
              // Automatically set initial balance to match balance if not manually set
              if (!formData.initialBalance) {
                handleInputChange('initialBalance', value);
              }
            }}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Currency */}
        <Text style={styles.inputLabel}>Currency</Text>
        <Menu
          visible={showCurrencyMenu}
          onDismiss={() => setShowCurrencyMenu(false)}
          anchor={
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowCurrencyMenu(true)}
            >
              <Text style={styles.dropdownText}>
                {currencies.find(curr => curr.value === formData.currency)?.label || 'Select Currency'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>
          }
        >
          {currencies.map(currency => (
            <Menu.Item
              key={currency.value}
              onPress={() => {
                handleInputChange('currency', currency.value);
                setShowCurrencyMenu(false);
              }}
              title={currency.label}
            />
          ))}
        </Menu>
        
        <Divider style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        {/* Account Color */}
        <Text style={styles.inputLabel}>Account Color</Text>
        <Menu
          visible={showColorMenu}
          onDismiss={() => setShowColorMenu(false)}
          anchor={
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowColorMenu(true)}
            >
              <View 
                style={[
                  styles.colorPreview, 
                  { backgroundColor: formData.color }
                ]} 
              />
              <Text style={styles.dropdownText}>
                {colors.find(c => c.value === formData.color)?.label || 'Select Color'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>
          }
        >
          {colors.map(color => (
            <Menu.Item
              key={color.value}
              onPress={() => {
                handleInputChange('color', color.value);
                setShowColorMenu(false);
              }}
              title={color.label}
              leadingIcon={() => <ColorMenuItem color={color.value} label={color.label} />}
            />
          ))}
        </Menu>
        
        {/* Account Icon */}
        <Text style={styles.inputLabel}>Account Icon</Text>
        <Menu
          visible={showIconMenu}
          onDismiss={() => setShowIconMenu(false)}
          anchor={
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowIconMenu(true)}
            >
              <MaterialIcons name={formData.icon} size={24} color={formData.color} />
              <Text style={styles.dropdownText}>
                {icons.find(i => i.value === formData.icon)?.label || 'Select Icon'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>
          }
        >
          {icons.map(icon => (
            <Menu.Item
              key={icon.value}
              onPress={() => {
                handleInputChange('icon', icon.value);
                setShowIconMenu(false);
              }}
              title={icon.label}
              leadingIcon={() => <IconMenuItem iconName={icon.value} color={formData.color} />}
            />
          ))}
        </Menu>
        
        {/* Preview */}
        <Text style={styles.inputLabel}>Preview</Text>
        <View style={styles.previewContainer}>
          <View 
            style={[
              styles.accountPreview, 
              { borderLeftColor: formData.color }
            ]}
          >
            <View style={styles.previewIconContainer}>
              <MaterialIcons name={formData.icon} size={32} color={formData.color} />
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewName}>{formData.name || 'Account Name'}</Text>
              <Text style={styles.previewType}>
                {accountTypes.find(type => type.value === formData.type)?.label || 'Account Type'}
              </Text>
            </View>
            <View style={styles.previewBalanceContainer}>
              <Text style={[styles.previewBalance, { color: formData.color }]}>
                {currencyService.formatCurrency(parseFloat(formData.balance) || 0, formData.currency)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Submit Button */}
        <Button
          mode="contained"
          style={styles.submitButton}
          labelStyle={styles.submitButtonText}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Create Account
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  scopeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 20,
    paddingHorizontal: 12,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    paddingVertical: 10,
    paddingRight: 12,
  },
  divider: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  menuColorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  previewContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  accountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
  },
  previewIconContainer: {
    marginRight: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewType: {
    fontSize: 14,
    color: '#666',
  },
  previewBalanceContainer: {
    alignItems: 'flex-end',
  },
  previewBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    marginVertical: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddAccountScreen;
