import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { Button, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../../contexts/FinanceContext';

const AddTransactionScreen = ({ navigation, route }) => {
  // Get finance context and account if passed from route params
  const financeContext = useFinance();
  const selectedAccount = route.params?.account || null;
  
  // State for the form
  const [formData, setFormData] = useState({
    accountId: selectedAccount?.id || '',
    amount: '',
    type: 'expense', // Default to expense
    category: '',
    description: '',
    date: new Date(),
  });
  
  const [accounts, setAccounts] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load accounts from context
  useEffect(() => {
    if (financeContext && financeContext.accounts) {
      setAccounts(financeContext.accounts);
    }
  }, [financeContext]);
  
  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  }, []);
  
  // Handle date change
  const handleDateChange = useCallback((event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prevData => ({
        ...prevData,
        date: selectedDate
      }));
    }
  }, []);
  
  // Format date for display
  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);
  
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate form
    if (!formData.accountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await financeContext.createTransaction({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      Alert.alert(
        'Success', 
        'Transaction added successfully', 
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, financeContext, navigation]);
  
  // Get categories based on transaction type
  const getCategories = useCallback(() => {
    if (formData.type === 'income') {
      return [
        'salary',
        'investment',
        'gift',
        'other_income'
      ];
    } else {
      return [
        'food',
        'shopping',
        'transportation',
        'housing',
        'utilities',
        'healthcare',
        'education',
        'entertainment',
        'debt',
        'savings',
        'other_expense'
      ];
    }
  }, [formData.type]);
  
  // Format category for display
  const formatCategory = useCallback((category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Transaction Type */}
        <Text style={styles.sectionTitle}>Transaction Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              formData.type === 'expense' && styles.typeButtonSelected
            ]}
            onPress={() => handleInputChange('type', 'expense')}
          >
            <MaterialIcons 
              name="remove-circle" 
              size={24} 
              color={formData.type === 'expense' ? 'white' : '#F44336'} 
            />
            <Text 
              style={[
                styles.typeButtonText,
                formData.type === 'expense' && styles.typeButtonTextSelected
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              formData.type === 'income' && styles.typeButtonSelectedIncome
            ]}
            onPress={() => handleInputChange('type', 'income')}
          >
            <MaterialIcons 
              name="add-circle" 
              size={24} 
              color={formData.type === 'income' ? 'white' : '#4CAF50'} 
            />
            <Text 
              style={[
                styles.typeButtonText,
                formData.type === 'income' && styles.typeButtonTextSelected
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Amount */}
        <Text style={styles.inputLabel}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₵</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={formData.amount}
            onChangeText={(value) => handleInputChange('amount', value)}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Account Selection */}
        <Text style={styles.inputLabel}>Account</Text>
        <View style={styles.accountSelector}>
          {accounts.map(account => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountOption,
                formData.accountId === account.id && styles.accountOptionSelected
              ]}
              onPress={() => handleInputChange('accountId', account.id)}
            >
              <MaterialIcons 
                name={account.icon || "account-balance-wallet"} 
                size={20} 
                color={formData.accountId === account.id ? 'white' : '#333'} 
              />
              <Text 
                style={[
                  styles.accountOptionText,
                  formData.accountId === account.id && styles.accountOptionTextSelected
                ]}
              >
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Category Selection */}
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.categorySelector}>
          {getCategories().map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryOption,
                formData.category === category && (
                  formData.type === 'expense' 
                    ? styles.categoryOptionSelected 
                    : styles.categoryOptionSelectedIncome
                )
              ]}
              onPress={() => handleInputChange('category', category)}
            >
              <Text 
                style={[
                  styles.categoryOptionText,
                  formData.category === category && styles.categoryOptionTextSelected
                ]}
              >
                {formatCategory(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Description */}
        <Text style={styles.inputLabel}>Description (Optional)</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Enter description"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          placeholderTextColor="#999"
        />
        
        {/* Date */}
        <Text style={styles.inputLabel}>Date</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialIcons name="calendar-today" size={20} color="#333" />
          <Text style={styles.dateText}>{formatDate(formData.date)}</Text>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        
        {/* Submit Button */}
        <Button
          mode="contained"
          style={styles.submitButton}
          labelStyle={styles.submitButtonText}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Add {formData.type === 'expense' ? 'Expense' : 'Income'}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  typeButtonSelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  typeButtonSelectedIncome: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  divider: {
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
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
    fontSize: 24,
    paddingHorizontal: 16,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    paddingVertical: 12,
    paddingRight: 16,
  },
  accountSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    margin: 4,
  },
  accountOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  accountOptionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  accountOptionTextSelected: {
    color: 'white',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    margin: 4,
  },
  categoryOptionSelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  categoryOptionSelectedIncome: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryOptionText: {
    fontSize: 14,
  },
  categoryOptionTextSelected: {
    color: 'white',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddTransactionScreen;
