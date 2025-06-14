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
import { Button, Divider, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../../contexts/FinanceContext';

const EditTransactionScreen = ({ navigation, route }) => {
  // Verify transaction exists in route params to prevent crashes
  if (!route.params || !route.params.transaction) {
    console.error("EditTransactionScreen: No transaction provided in route params");
    Alert.alert(
      "Error", 
      "Could not load transaction details. Please try again.",
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
    return null;
  }
  
  const { transaction } = route.params;
  const financeContext = useFinance();
  const { accounts, updateTransaction } = financeContext;
  
  // State for the form
  const [formData, setFormData] = useState({
    accountId: transaction.accountId || '',
    amount: transaction.amount ? transaction.amount.toString() : '',
    type: transaction.type || 'expense',
    category: transaction.category || '',
    description: transaction.description || '',
    date: transaction.date ? (transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date)) : new Date(),
    paymentMethod: transaction.paymentMethod || '',
    notes: transaction.notes || '',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPaymentMethodMenu, setShowPaymentMethodMenu] = useState(false);
  
  // Income categories
  const incomeCategories = [
    { value: 'salary', label: 'Salary' },
    { value: 'investment', label: 'Investment' },
    { value: 'gift', label: 'Gift' },
    { value: 'other_income', label: 'Other Income' },
  ];
  
  // Expense categories
  const expenseCategories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'housing', label: 'Housing' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'debt', label: 'Debt Payment' },
    { value: 'savings', label: 'Savings' },
    { value: 'other_expense', label: 'Other Expense' },
  ];
  
  // Payment methods
  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_payment', label: 'Mobile Payment' },
    { value: 'check', label: 'Check' },
    { value: 'other', label: 'Other' },
  ];
  
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
  
  // Get categories based on transaction type
  const getCategories = useCallback(() => {
    return formData.type === 'income' ? incomeCategories : expenseCategories;
  }, [formData.type, incomeCategories, expenseCategories]);
  
  // Check if selected account exists
  const accountExists = useCallback(() => {
    try {
      if (!formData.accountId) return false;
      return accounts.some(account => account && account.id === formData.accountId);
    } catch (error) {
      console.error('Error checking if account exists:', error);
      return false;
    }
  }, [accounts, formData.accountId]);
  
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate form
    if (!formData.accountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }
    
    // Check if selected account exists
    if (!accountExists()) {
      Alert.alert('Error', 'The selected account no longer exists. Please select a different account.');
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
      const success = await updateTransaction(transaction.id, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      if (success) {
        Alert.alert(
          'Success', 
          'Transaction updated successfully', 
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to update transaction. Please try again.');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, transaction.id, updateTransaction, navigation]);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Transaction Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              formData.type === 'expense' && styles.activeTypeButton
            ]}
            onPress={() => handleInputChange('type', 'expense')}
          >
            <MaterialIcons 
              name="arrow-upward" 
              size={24} 
              color={formData.type === 'expense' ? '#fff' : '#F44336'} 
            />
            <Text style={[
              styles.typeButtonText,
              formData.type === 'expense' && styles.activeTypeText
            ]}>
              Expense
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              formData.type === 'income' && styles.activeTypeButtonIncome
            ]}
            onPress={() => handleInputChange('type', 'income')}
          >
            <MaterialIcons 
              name="arrow-downward" 
              size={24} 
              color={formData.type === 'income' ? '#fff' : '#4CAF50'} 
            />
            <Text style={[
              styles.typeButtonText,
              styles.incomeText,
              formData.type === 'income' && styles.activeTypeText
            ]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => handleInputChange('amount', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
        
        {/* Account */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowAccountMenu(true)}
          >
            <Text style={styles.selectorText}>
              {accounts.find(a => a && a.id === formData.accountId)?.name || 'Select Account'}
              {formData.accountId && !accounts.some(a => a && a.id === formData.accountId) && ' (Account not found)'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          
          <Menu
            visible={showAccountMenu}
            onDismiss={() => setShowAccountMenu(false)}
            anchor={{ x: 0, y: 0 }}
            style={styles.menu}
          >
            {accounts
              .filter(account => account && account.id) // Make sure account is valid
              .map(account => (
                <Menu.Item
                  key={account.id}
                  title={account.name || 'Unnamed Account'}
                  onPress={() => {
                    handleInputChange('accountId', account.id);
                    setShowAccountMenu(false);
                  }}
                />
              ))
            }
            {accounts.length === 0 && (
              <Menu.Item
                title="No accounts available"
                disabled={true}
              />
            )}
          </Menu>
        </View>
        
        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowCategoryMenu(true)}
          >
            <Text style={styles.selectorText}>
              {getCategories().find(c => c.value === formData.category)?.label || 'Select Category'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          
          <Menu
            visible={showCategoryMenu}
            onDismiss={() => setShowCategoryMenu(false)}
            anchor={{ x: 0, y: 0 }}
            style={styles.menu}
          >
            {getCategories().map(category => (
              <Menu.Item
                key={category.value}
                title={category.label}
                onPress={() => {
                  handleInputChange('category', category.value);
                  setShowCategoryMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        
        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.selectorText}>
              {formatDate(formData.date)}
            </Text>
            <MaterialIcons name="calendar-today" size={24} color="#666" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
        
        {/* Payment Method */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Method (Optional)</Text>
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowPaymentMethodMenu(true)}
          >
            <Text style={styles.selectorText}>
              {paymentMethods.find(p => p.value === formData.paymentMethod)?.label || 'Select Payment Method'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          
          <Menu
            visible={showPaymentMethodMenu}
            onDismiss={() => setShowPaymentMethodMenu(false)}
            anchor={{ x: 0, y: 0 }}
            style={styles.menu}
          >
            {paymentMethods.map(method => (
              <Menu.Item
                key={method.value}
                title={method.label}
                onPress={() => {
                  handleInputChange('paymentMethod', method.value);
                  setShowPaymentMethodMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        
        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.input}
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            placeholder="Enter description"
          />
        </View>
        
        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => handleInputChange('notes', text)}
            placeholder="Add additional notes"
            multiline={true}
            numberOfLines={4}
          />
        </View>
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
          Update Transaction
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activeTypeButton: {
    backgroundColor: '#F44336',
  },
  activeTypeButtonIncome: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#F44336',
  },
  incomeText: {
    color: '#4CAF50',
  },
  activeTypeText: {
    color: '#fff',
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
  actionButtons: {
    padding: 16,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
});

export default EditTransactionScreen;
