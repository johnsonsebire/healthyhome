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

const AddLoanScreen = ({ navigation, route }) => {
  const { createLoan } = useFinance();
  
  // Get scope if passed from route params
  const scope = route.params?.scope || FINANCE_SCOPE.PERSONAL;
  
  // State for the form
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    interestRate: '0',
    term: '12', // Default to 12 months
    startDate: new Date(),
    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 12)), // Default to 12 months from now
    type: 'borrowed', // borrowed or lent
    lender: '', // If borrowed
    borrower: '', // If lent
    paymentFrequency: 'monthly', // monthly, bi-weekly, weekly
    scope: scope,
    status: 'active'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Generate payment schedule
  const generatePaymentSchedule = () => {
    const amount = parseFloat(formData.amount) || 0;
    const term = parseInt(formData.term) || 12;
    const interestRate = parseFloat(formData.interestRate) || 0;
    const startDate = new Date(formData.startDate);
    
    if (amount <= 0 || term <= 0) {
      setPaymentSchedule([]);
      return;
    }
    
    // Calculate total amount with interest
    const totalInterest = (amount * interestRate / 100);
    const totalAmount = amount + totalInterest;
    
    // Calculate payment amount per period
    const paymentAmount = totalAmount / term;
    
    // Generate schedule
    const schedule = [];
    
    for (let i = 0; i < term; i++) {
      const dueDate = new Date(startDate);
      
      if (formData.paymentFrequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + (i + 1));
      } else if (formData.paymentFrequency === 'bi-weekly') {
        dueDate.setDate(dueDate.getDate() + ((i + 1) * 14));
      } else if (formData.paymentFrequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + ((i + 1) * 7));
      }
      
      schedule.push({
        paymentNumber: i + 1,
        dueDate,
        amount: paymentAmount,
        status: 'pending'
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
        paymentSchedule
      };
      
      // Create loan
      const loan = await createLoan(loanData);
      
      if (loan) {
        Alert.alert(
          'Success', 
          'Loan added successfully', 
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to add loan. Please try again.');
      }
    } catch (error) {
      console.error('Error adding loan:', error);
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
        
        {/* Payment Schedule Preview */}
        {paymentSchedule.length > 0 && (
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Payment</Text>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Due Date</Text>
              <Text style={[styles.scheduleCell, styles.scheduleHeaderText]}>Amount</Text>
            </View>
            
            {/* Display first 3 payments */}
            {paymentSchedule.slice(0, 3).map((payment, index) => (
              <View key={index} style={styles.scheduleRow}>
                <Text style={styles.scheduleCell}>#{payment.paymentNumber}</Text>
                <Text style={styles.scheduleCell}>{formatDate(payment.dueDate)}</Text>
                <Text style={styles.scheduleCell}>
                  ${payment.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            
            {/* Indicator for more payments */}
            {paymentSchedule.length > 3 && (
              <Text style={styles.morePagmentsText}>
                +{paymentSchedule.length - 3} more payments
              </Text>
            )}
            
            {/* Summary */}
            <View style={styles.scheduleSummary}>
              <Text style={styles.summaryText}>
                Total payments: {paymentSchedule.length}
              </Text>
              <Text style={styles.summaryText}>
                Total amount: ${paymentSchedule.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
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
          style={styles.submitButton}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Add Loan
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
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
  },
  scheduleContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 8,
    marginBottom: 8,
  },
  scheduleHeaderText: {
    fontWeight: 'bold',
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  scheduleCell: {
    flex: 1,
    fontSize: 14,
  },
  morePagmentsText: {
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

export default AddLoanScreen;
