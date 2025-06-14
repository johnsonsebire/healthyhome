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
import { Button, Divider, Menu, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import currencyService from '../../services/currencyService';

const EditLoanScreen = ({ navigation, route }) => {
  const { updateLoan } = useFinance();
  const { loan: initialLoan } = route.params;
  
  // Helper function to safely convert dates
  const safelyConvertDate = (dateValue) => {
    if (!dateValue) return new Date();
    
    // If it's a Firestore timestamp with toDate method
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a string or number, try to convert
    const convertedDate = new Date(dateValue);
    return isNaN(convertedDate.getTime()) ? new Date() : convertedDate;
  };
  
  // State for the form
  const [formData, setFormData] = useState({
    name: initialLoan.name || '',
    amount: initialLoan.amount?.toString() || '',
    interestRate: initialLoan.interestRate?.toString() || '0',
    term: initialLoan.term?.toString() || '12',
    startDate: safelyConvertDate(initialLoan.startDate),
    dueDate: safelyConvertDate(initialLoan.dueDate),
    type: initialLoan.type || 'borrowed',
    lender: initialLoan.lender || '',
    borrower: initialLoan.borrower || '',
    paymentFrequency: initialLoan.paymentFrequency || 'monthly',
    scope: initialLoan.scope || FINANCE_SCOPE.PERSONAL,
    status: initialLoan.status || 'active',
    notes: initialLoan.notes || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState(initialLoan.paymentSchedule || []);
  
  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: 'Edit Loan',
      headerBackTitle: 'Back'
    });
  }, [navigation]);
  
  // Update payment schedule when relevant fields change
  useEffect(() => {
    if (formData.amount && formData.term && formData.startDate && formData.paymentFrequency) {
      generatePaymentSchedule();
    }
  }, [formData.amount, formData.term, formData.startDate, formData.interestRate, formData.paymentFrequency]);
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Handle start date change
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      // Also update due date to maintain the term length
      const newDueDate = new Date(selectedDate);
      const term = parseInt(formData.term) || 12;
      
      if (formData.paymentFrequency === 'monthly') {
        newDueDate.setMonth(newDueDate.getMonth() + term);
      } else if (formData.paymentFrequency === 'bi-weekly') {
        newDueDate.setDate(newDueDate.getDate() + (term * 14));
      } else if (formData.paymentFrequency === 'weekly') {
        newDueDate.setDate(newDueDate.getDate() + (term * 7));
      }
      
      setFormData({
        ...formData,
        startDate: selectedDate,
        dueDate: newDueDate
      });
    }
  };
  
  // Handle due date change
  const handleDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        dueDate: selectedDate
      });
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Invalid Date';
    
    // Handle different date formats
    let dateObj;
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };
  
  // Generate payment schedule
  const generatePaymentSchedule = () => {
    const amount = parseFloat(formData.amount) || 0;
    const term = parseInt(formData.term) || 12;
    const interestRate = parseFloat(formData.interestRate) || 0;
    const startDate = new Date(formData.startDate);
    
    // Validate startDate is a valid date
    if (amount <= 0 || term <= 0 || isNaN(startDate.getTime())) {
      setPaymentSchedule([]);
      return;
    }
    
    // Calculate total amount with interest
    const totalInterest = (amount * interestRate / 100);
    const totalAmount = amount + totalInterest;
    
    // Calculate payment amount per period
    const paymentAmount = totalAmount / term;
    
    // Generate schedule (preserve existing payment statuses)
    const schedule = [];
    const existingSchedule = initialLoan.paymentSchedule || [];
    
    for (let i = 0; i < term; i++) {
      const dueDate = new Date(startDate);
      
      if (formData.paymentFrequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + (i + 1));
      } else if (formData.paymentFrequency === 'bi-weekly') {
        dueDate.setDate(dueDate.getDate() + ((i + 1) * 14));
      } else if (formData.paymentFrequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + ((i + 1) * 7));
      }
      
      // Ensure dueDate is valid before adding to schedule
      if (isNaN(dueDate.getTime())) {
        console.error('Invalid due date generated for payment', i + 1);
        continue;
      }
      
      // Preserve existing payment status if available
      const existingPayment = existingSchedule[i];
      const status = existingPayment ? existingPayment.status : 'pending';
      
      schedule.push({
        paymentNumber: i + 1,
        dueDate,
        amount: paymentAmount,
        status: status
      });
    }
    
    setPaymentSchedule(schedule);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a loan name');
      return;
    }
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid loan amount');
      return;
    }
    
    if (formData.type === 'borrowed' && !formData.lender.trim()) {
      Alert.alert('Error', 'Please enter the lender name');
      return;
    }
    
    if (formData.type === 'lent' && !formData.borrower.trim()) {
      Alert.alert('Error', 'Please enter the borrower name');
      return;
    }
    
    if (paymentSchedule.length === 0) {
      Alert.alert('Error', 'Failed to generate payment schedule');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create data object for submission
      const loanData = {
        ...formData,
        amount: parseFloat(formData.amount),
        interestRate: parseFloat(formData.interestRate) || 0,
        term: parseInt(formData.term) || 12,
        paymentSchedule,
        // Preserve existing payment data or initialize if not present
        payments: initialLoan.payments || [],
        totalPaid: initialLoan.totalPaid || 0
      };
      
      // Update loan
      const success = await updateLoan(initialLoan.id, loanData);
      
      if (success) {
        Alert.alert(
          'Success', 
          'Loan updated successfully', 
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to update loan. Please try again.');
      }
    } catch (error) {
      console.error('Error updating loan:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Loan Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Loan Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Enter loan name or purpose"
          />
        </View>
        
        {/* Loan Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Loan Type</Text>
          <SegmentedButtons
            value={formData.type}
            onValueChange={(value) => handleInputChange('type', value)}
            buttons={[
              { value: 'borrowed', label: 'I Borrowed' },
              { value: 'lent', label: 'I Lent' }
            ]}
          />
        </View>
        
        {/* Lender/Borrower */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {formData.type === 'borrowed' ? 'Lender Name' : 'Borrower Name'}
          </Text>
          <TextInput
            style={styles.input}
            value={formData.type === 'borrowed' ? formData.lender : formData.borrower}
            onChangeText={(text) => {
              if (formData.type === 'borrowed') {
                handleInputChange('lender', text);
              } else {
                handleInputChange('borrower', text);
              }
            }}
            placeholder={formData.type === 'borrowed' ? "Who lent you money?" : "Who borrowed from you?"}
          />
        </View>
        
        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Loan Amount</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => handleInputChange('amount', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
        
        {/* Interest Rate */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Interest Rate (% per year)</Text>
          <TextInput
            style={styles.input}
            value={formData.interestRate}
            onChangeText={(text) => handleInputChange('interestRate', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
        
        {/* Term */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Term (number of payments)</Text>
          <TextInput
            style={styles.input}
            value={formData.term}
            onChangeText={(text) => handleInputChange('term', text)}
            placeholder="12"
            keyboardType="numeric"
          />
        </View>
        
        {/* Payment Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Frequency</Text>
          <SegmentedButtons
            value={formData.paymentFrequency}
            onValueChange={(value) => handleInputChange('paymentFrequency', value)}
            buttons={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'bi-weekly', label: 'Bi-Weekly' },
              { value: 'weekly', label: 'Weekly' }
            ]}
          />
        </View>
        
        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {formatDate(formData.startDate)}
            </Text>
            <MaterialIcons name="calendar-today" size={24} color="#666" />
          </TouchableOpacity>
          
          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          )}
        </View>
        
        {/* Due Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => setShowDueDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {formatDate(formData.dueDate)}
            </Text>
            <MaterialIcons name="calendar-today" size={24} color="#666" />
          </TouchableOpacity>
          
          {showDueDatePicker && (
            <DateTimePicker
              value={formData.dueDate}
              mode="date"
              display="default"
              onChange={handleDueDateChange}
            />
          )}
        </View>
        
        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => handleInputChange('notes', text)}
            placeholder="Additional notes about this loan"
            multiline
            numberOfLines={3}
          />
        </View>
        
        {/* Payment Schedule Preview */}
        {paymentSchedule.length > 0 && (
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Payment</Text>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Due Date</Text>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Amount</Text>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Status</Text>
            </View>
            
            {/* Display first 3 payments */}
            {paymentSchedule.slice(0, 3).map((payment, index) => {
              // Ensure payment object is valid
              if (!payment || !payment.dueDate) {
                return null;
              }
              
              return (
                <View key={index} style={styles.scheduleRow}>
                  <Text style={styles.scheduleCell}>#{payment.paymentNumber || (index + 1)}</Text>
                  <Text style={styles.scheduleCell}>{formatDate(payment.dueDate)}</Text>
                  <Text style={styles.scheduleCell}>
                    {currencyService.formatCurrency(payment.amount || 0, 'GHS')}
                  </Text>
                  <Text style={[styles.scheduleCell, { 
                    color: payment.status === 'paid' ? '#4CAF50' : payment.status === 'overdue' ? '#F44336' : '#666' 
                  }]}>
                    {payment.status === 'paid' ? 'Paid' : payment.status === 'overdue' ? 'Overdue' : 'Pending'}
                  </Text>
                </View>
              );
            })}
            
            {/* Indicator for more payments */}
            {paymentSchedule.length > 3 && (
              <Text style={styles.morePaymentsText}>
                +{paymentSchedule.length - 3} more payments
              </Text>
            )}
            
            {/* Summary */}
            <View style={styles.scheduleSummary}>
              <Text style={styles.summaryText}>
                Total payments: {paymentSchedule.length}
              </Text>
              <Text style={styles.summaryText}>
                Total amount: {currencyService.formatCurrency(paymentSchedule.reduce((sum, payment) => sum + payment.amount, 0), 'GHS')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Scope */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Finance Scope</Text>
          <SegmentedButtons
            value={formData.scope}
            onValueChange={(value) => handleInputChange('scope', value)}
            buttons={[
              { value: FINANCE_SCOPE.PERSONAL, label: 'Personal' },
              { value: FINANCE_SCOPE.NUCLEAR, label: 'Family' },
              { value: FINANCE_SCOPE.EXTENDED, label: 'Extended' }
            ]}
          />
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting ? 'Updating...' : 'Update Loan'}
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
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  scheduleContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scheduleHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  scheduleCell: {
    flex: 1,
    fontSize: 14,
  },
  scheduleHeaderText: {
    fontWeight: 'bold',
    color: '#333',
  },
  morePaymentsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  scheduleSummary: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 2,
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

export default EditLoanScreen;
