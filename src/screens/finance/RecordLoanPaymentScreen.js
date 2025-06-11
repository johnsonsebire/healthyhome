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
      setFormData({
        ...formData,
        date: selectedDate
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
      const success = await recordLoanPayment(loan.id, {
        ...payment,
        paidAmount: parseFloat(formData.amount),
        paidDate: formData.date,
        notes: formData.notes
      });
      
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
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
