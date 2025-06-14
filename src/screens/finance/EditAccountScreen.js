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
import { Button, Divider, Menu } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance } from '../../contexts/FinanceContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';

// Custom components for menu items
const ColorMenuItem = ({ color }) => (
  <View style={[styles.menuColorPreview, { backgroundColor: color }]} />
);

const IconMenuItem = ({ iconName, color }) => (
  <MaterialIcons name={iconName} size={24} color={color} />
);

const EditAccountScreen = ({ navigation, route }) => {
  const { account } = route.params;
  const { updateAccount } = useFinance();
  const { nuclearFamilyMembers, extendedFamilyMembers } = useFamilySharing();
  
  // State for the form
  const [formData, setFormData] = useState({
    name: account.name || '',
    type: account.type || 'checking',
    balance: account.balance ? account.balance.toString() : '0',
    initialBalance: account.initialBalance ? account.initialBalance.toString() : (account.balance ? account.balance.toString() : '0'),
    currency: account.currency || 'USD',
    icon: account.icon || 'account-balance',
    color: account.color || '#2196F3',
    description: account.description || '',
    sharedWith: account.sharedWith || [],
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
  
  // Currencies
  const currencies = [
    { value: 'GHS', label: 'GHS (₵)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'CAD', label: 'CAD ($)' },
    { value: 'AUD', label: 'AUD ($)' },
    { value: 'NGN', label: 'NGN (₦)' },
  ];
  
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
    { value: 'wallet', label: 'Wallet', isMaterialCommunity: true },
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
      // Create data object for update
      const accountData = {
        name: formData.name.trim(),
        type: formData.type,
        balance: parseFloat(formData.balance),
        initialBalance: parseFloat(formData.initialBalance),
        currency: formData.currency,
        icon: formData.icon,
        color: formData.color,
        description: formData.description,
        sharedWith: formData.sharedWith
      };
      
      // Update account
      const success = await updateAccount(account.id, accountData);
      
      if (success) {
        Alert.alert('Success', 'Account updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to update account. Please try again.');
      }
    } catch (error) {
      console.error('Error updating account:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle sharing settings
  const handleSharingSettings = () => {
    // Prepare a list of family members for the sharing dialog
    const members = [];
    
    if (account.scope === 'nuclear') {
      // Add nuclear family members
      nuclearFamilyMembers.forEach(member => {
        members.push({
          id: member.id,
          name: member.name,
          isShared: formData.sharedWith.includes(member.id)
        });
      });
    } else if (account.scope === 'extended') {
      // Add extended family members
      extendedFamilyMembers.forEach(member => {
        members.push({
          id: member.id,
          name: member.name,
          isShared: formData.sharedWith.includes(member.id)
        });
      });
    }
    
    // Navigate to sharing screen
    navigation.navigate('AccountSharing', {
      members: members,
      onSave: (sharedWith) => {
        setFormData(prev => ({
          ...prev,
          sharedWith
        }));
      }
    });
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Account Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Enter account name"
          />
        </View>
        
        {/* Account Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account Type</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowTypeMenu(true)}
          >
            <Text style={styles.selectorText}>
              {accountTypes.find(type => type.value === formData.type)?.label || 'Select Type'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          
          <Menu
            visible={showTypeMenu}
            onDismiss={() => setShowTypeMenu(false)}
            anchor={{ x: 0, y: 0 }}
            style={styles.menu}
          >
            {accountTypes.map(type => (
              <Menu.Item
                key={type.value}
                title={type.label}
                onPress={() => {
                  handleInputChange('type', type.value);
                  setShowTypeMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        
        {/* Balance */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current Balance</Text>
          <TextInput
            style={styles.input}
            value={formData.balance}
            onChangeText={(text) => handleInputChange('balance', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
        
        {/* Initial Balance */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Initial Balance</Text>
          <TextInput
            style={styles.input}
            value={formData.initialBalance}
            onChangeText={(text) => handleInputChange('initialBalance', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            The starting balance of this account. Used for balance recalculation.
          </Text>
        </View>
        
        {/* Currency */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Currency</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowCurrencyMenu(true)}
          >
            <Text style={styles.selectorText}>
              {currencies.find(curr => curr.value === formData.currency)?.label || 'Select Currency'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          
          <Menu
            visible={showCurrencyMenu}
            onDismiss={() => setShowCurrencyMenu(false)}
            anchor={{ x: 0, y: 0 }}
            style={styles.menu}
          >
            {currencies.map(currency => (
              <Menu.Item
                key={currency.value}
                title={currency.label}
                onPress={() => {
                  handleInputChange('currency', currency.value);
                  setShowCurrencyMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        
        {/* Appearance section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Appearance</Text>
        </View>
        
        <View style={styles.appearanceRow}>
          {/* Color */}
          <View style={styles.colorSelector}>
            <Text style={styles.smallLabel}>Color</Text>
            <TouchableOpacity 
              onPress={() => setShowColorMenu(true)}
              style={[styles.colorButton, { backgroundColor: formData.color }]}
            />
            
            <Menu
              visible={showColorMenu}
              onDismiss={() => setShowColorMenu(false)}
              anchor={{ x: 0, y: 0 }}
              style={styles.menu}
            >
              {colors.map(color => (
                <Menu.Item
                  key={color.value}
                  title={color.label}
                  onPress={() => {
                    handleInputChange('color', color.value);
                    setShowColorMenu(false);
                  }}
                  leadingIcon={() => <ColorMenuItem color={color.value} />}
                />
              ))}
            </Menu>
          </View>
          
          {/* Icon */}
          <View style={styles.iconSelector}>
            <Text style={styles.smallLabel}>Icon</Text>
            <TouchableOpacity 
              onPress={() => setShowIconMenu(true)}
              style={styles.iconButton}
            >
              <MaterialIcons name={formData.icon} size={24} color={formData.color} />
            </TouchableOpacity>
            
            <Menu
              visible={showIconMenu}
              onDismiss={() => setShowIconMenu(false)}
              anchor={{ x: 0, y: 0 }}
              style={styles.menu}
            >
              {icons.map(icon => (
                <Menu.Item
                  key={icon.value}
                  title={icon.label}
                  onPress={() => {
                    handleInputChange('icon', icon.value);
                    setShowIconMenu(false);
                  }}
                  leadingIcon={() => <IconMenuItem iconName={icon.value} color={formData.color} />}
                />
              ))}
            </Menu>
          </View>
        </View>
        
        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            placeholder="Add notes about this account"
            multiline={true}
            numberOfLines={4}
          />
        </View>
        
        {/* Sharing Options - only for non-personal accounts */}
        {account.scope !== 'personal' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sharing Settings</Text>
            <TouchableOpacity 
              style={styles.sharingButton}
              onPress={handleSharingSettings}
            >
              <Text style={styles.sharingButtonText}>
                Manage Sharing Settings
              </Text>
              <MaterialIcons name="people" size={24} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.sharingInfo}>
              {formData.sharedWith.length === 0 
                ? 'Not shared with anyone' 
                : `Shared with ${formData.sharedWith.length} ${formData.sharedWith.length === 1 ? 'person' : 'people'}`}
            </Text>
          </View>
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Save Changes
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancel
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
  },
  selectorText: {
    fontSize: 16,
  },
  menu: {
    marginTop: 40,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appearanceRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  colorSelector: {
    flex: 1,
    alignItems: 'center',
  },
  iconSelector: {
    flex: 1,
    alignItems: 'center',
  },
  smallLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sharingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderRadius: 4,
    padding: 12,
  },
  sharingButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  sharingInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 16,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
  menuColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
});

export default EditAccountScreen;
