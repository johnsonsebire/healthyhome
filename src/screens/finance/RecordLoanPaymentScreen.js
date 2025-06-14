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
import { Button, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../../contexts/FinanceContext';

const RecordLoanPaymentScreen = ({ navigation, route }) => {
  const { loan, payment } = route.params;
  const { recordLoanPayment } = useFinance();
  
  // State for the form
  const [formData, setFormData] = useState({
    amount: payment ? payment.amount.toString() : '',
    date: new Date(),
    notes: ''
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Make sure the date is valid
      if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        console.error('Invalid date selected:', selectedDate);
        Alert.alert('Error', 'The selected date is invalid. Please try again.');
        return;
      }
      
      // Set a sensible range limit (prevent dates too far in the past or future)
      const minDate = new Date(1900, 0, 1);
      const maxDate = new Date(2100, 11, 31);
      
      if (selectedDate < minDate || selectedDate > maxDate) {
        console.error('Date out of reasonable range:', selectedDate);
        Alert.alert('Error', 'The selected date is out of the allowed range. Please select a date between 1900 and 2100.');
        return;
      }
      
      setFormData({
        ...formData,
        date: selectedDate
      });
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      // Handle Firestore timestamp
      if (date && typeof date.toDate === 'function') {
        date = date.toDate();
      }
      
      // Ensure date is a proper Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Validate that the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date detected:', date);
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Log the incoming payment data to debug
      console.log('Original payment data:', JSON.stringify({
        paymentNumber: payment.paymentNumber,
        dueDate: payment.dueDate ? 
          (typeof payment.dueDate.toDate === 'function' ? 
            payment.dueDate.toDate().toISOString() : 
            payment.dueDate instanceof Date ? 
              payment.dueDate.toISOString() : String(payment.dueDate)) 
          : 'undefined'
      }));
      
      // Safely handle the due date
      let dueDate;
      try {
        if (payment.dueDate) {
          // Handle Firestore timestamp
          if (typeof payment.dueDate.toDate === 'function') {
            dueDate = payment.dueDate;  // Keep as Firestore timestamp
          } else if (payment.dueDate instanceof Date) {
            dueDate = payment.dueDate;  // Already a Date object
          } else {
            // Try to create a valid date
            const parsedDate = new Date(payment.dueDate);
            if (!isNaN(parsedDate.getTime())) {
              dueDate = parsedDate;
            } else {
              throw new Error('Invalid due date format');
            }
          }
        } else {
          dueDate = new Date(); // Fallback to current date
        }
      } catch (dateError) {
        console.error('Error parsing due date:', dateError);
        dueDate = new Date(); // Fallback to current date if parsing fails
      }
      
      // Create a safe version of the payment object with all required fields
      const paymentToRecord = {
        // Include necessary payment data - make sure paymentNumber is not defaulting to 0
        paymentNumber: payment.paymentNumber || 1, // Changed from 0 to 1 as payment numbers start from 1
        amount: payment.amount || parseFloat(formData.amount),
        dueDate: dueDate,
        
        // Add the new payment data
        paidAmount: parseFloat(formData.amount),
        notes: formData.notes || '',
        
        // Use a safe current date for the payment date
        paidDate: new Date(), // Use current date instead of formData.date
      };
      
      console.log('Recording payment with data:', JSON.stringify({
        ...paymentToRecord,
        dueDate: typeof paymentToRecord.dueDate.toDate === 'function' ? 
          paymentToRecord.dueDate.toDate().toISOString() : 
          paymentToRecord.dueDate.toISOString(),
        paidDate: paymentToRecord.paidDate.toISOString()
      }, null, 2));
      
      const success = await recordLoanPayment(loan.id, paymentToRecord);
      
      if (success) {
        Alert.alert(
          'Success', 
          'Payment recorded successfully', 
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to record payment. Please try again.');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', `${error.message || 'An unexpected error occurred. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Payment Info */}
        <View style={styles.paymentInfoContainer}>
          <Text style={styles.paymentTitle}>Payment #{payment.paymentNumber}</Text>
          <Text style={styles.loanName}>{loan.name}</Text>
          
          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(payment.dueDate)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Due</Text>
              <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
            </View>
          </View>
        </View>
        
        {/* Payment Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Amount</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => handleInputChange('amount', text)}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
        
        {/* Payment Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment Date</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
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
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date(2100, 11, 31)}
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
            placeholder="Add notes about this payment"
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
          Record Payment
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
  paymentInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loanName: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
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

export default RecordLoanPaymentScreen;
