import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../../contexts/FinanceContext';
import currencyService from '../../services/currencyService';

const EditLoanPaymentScreen = ({ navigation, route }) => {
  const { loan, payment } = route.params;
  const { updateLoanPayment } = useFinance();
  
  const [formData, setFormData] = useState({
    amount: payment.amount?.toString() || '',
    date: payment.date instanceof Date ? payment.date : new Date(payment.date),
    note: payment.note || ''
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate remaining balance (excluding current payment)
  const calculateRemainingBalance = () => {
    const loanAmount = parseFloat(loan.amount) || 0;
    const otherPayments = (loan.payments || []).filter(p => p.id !== payment.id);
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => 
      sum + (parseFloat(p.amount) || 0), 0);
    return loanAmount - otherPaymentsTotal;
  };
  
  const availableBalance = calculateRemainingBalance();
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('date', selectedDate);
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return currencyService.formatCurrency(amount, loan.currency || 'GHS');
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate amount
      const paymentAmount = parseFloat(formData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid payment amount');
        return;
      }
      
      if (paymentAmount > availableBalance) {
        Alert.alert('Error', `Payment amount cannot exceed available balance of ${formatCurrency(availableBalance)}`);
        return;
      }
      
      setIsSubmitting(true);
      
      const updatedPaymentData = {
        amount: paymentAmount,
        date: formData.date,
        note: formData.note.trim()
      };
      
      const success = await updateLoanPayment(loan.id, payment.id, updatedPaymentData);
      
      if (success) {
        Alert.alert(
          'Success', 
          'Payment updated successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', 'Failed to update payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Loan Information */}
        <View style={styles.loanInfoCard}>
          <Text style={styles.loanName}>{loan.name}</Text>
          <Text style={styles.loanAmount}>
            Total Amount: {formatCurrency(loan.amount)}
          </Text>
          <Text style={styles.availableBalance}>
            Available for this payment: {formatCurrency(availableBalance)}
          </Text>
        </View>
        
        {/* Payment Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Amount</Text>
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
          <Text style={styles.maxAmountText}>
            Maximum: {formatCurrency(availableBalance)}
          </Text>
        </View>
        
        {/* Payment Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Date</Text>
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
        </View>
        
        {/* Payment Note */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Note (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.note}
            onChangeText={(value) => handleInputChange('note', value)}
            placeholder="Add a note about this payment"
            multiline={true}
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
            labelStyle={styles.submitButtonText}
          >
            Update Payment
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
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
  loanInfoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  loanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  loanAmount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  availableBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  maxAmountText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    marginBottom: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderColor: '#666',
  },
});

export default EditLoanPaymentScreen;
