import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, FAB, Menu, Chip } from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';
import currencyService from '../../services/currencyService';

const LoanPaymentsScreen = ({ navigation, route }) => {
  const { loan } = route.params;
  const { deleteLoanPayment } = useFinance();
  
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get payments from loan
  const payments = loan.payments || [];
  
  // Calculate totals
  const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const remainingBalance = parseFloat(loan.amount) - totalPaid;
  
  // Format currency
  const formatCurrency = (amount) => {
    return currencyService.formatCurrency(amount, loan.currency || 'GHS');
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      let dateObj;
      
      // Handle Firestore timestamp
      if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        // Try to parse string or number
        dateObj = new Date(date);
      }
      
      // Validate that the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date detected in LoanPaymentsScreen:', date);
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date in LoanPaymentsScreen:', error, date);
      return 'Invalid Date';
    }
  };
  
  // Handle payment selection
  const handlePaymentPress = (payment) => {
    setSelectedPayment(payment);
    setMenuVisible(true);
  };
  
  // Handle edit payment
  const handleEditPayment = () => {
    setMenuVisible(false);
    navigation.navigate('EditLoanPayment', { 
      loan, 
      payment: selectedPayment 
    });
  };
  
  // Handle delete payment
  const handleDeletePayment = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteLoanPayment(loan.id, selectedPayment.id);
            if (success) {
              Alert.alert('Success', 'Payment deleted successfully');
            }
          }
        }
      ]
    );
  };
  
  // Navigate to add payment
  const navigateToAddPayment = () => {
    navigation.navigate('AddLoanPayment', { loan });
  };
  
  // Render payment item
  const renderPaymentItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.paymentItem}
      onPress={() => handlePaymentPress(item)}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Payment #{index + 1}</Text>
          <Text style={styles.paymentDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      
      {item.note ? (
        <Text style={styles.paymentNote} numberOfLines={2}>
          {item.note}
        </Text>
      ) : null}
      
      <View style={styles.paymentMeta}>
        <Chip 
          icon="check-circle" 
          mode="flat" 
          style={styles.statusChip}
          textStyle={styles.statusChipText}
        >
          Paid
        </Chip>
        <Text style={styles.createdDate}>
          Added: {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Text style={styles.loanName}>{loan.name}</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(loan.amount)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {formatCurrency(remainingBalance)}
              </Text>
            </View>
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(100, (totalPaid / parseFloat(loan.amount)) * 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((totalPaid / parseFloat(loan.amount)) * 100)}% paid
            </Text>
          </View>
        </View>
      </Card>
      
      <Text style={styles.sectionTitle}>Payment History</Text>
    </View>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="payment" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No payments recorded yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap the + button to add your first payment
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Payment Menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={<View />}
        style={styles.menu}
      >
        <Menu.Item 
          icon="pencil" 
          onPress={handleEditPayment} 
          title="Edit Payment" 
        />
        <Menu.Item 
          icon="delete" 
          onPress={handleDeletePayment} 
          title="Delete Payment"
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
      
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContainer,
          payments.length === 0 && styles.emptyContainer
        ]}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Add Payment FAB */}
      {remainingBalance > 0 && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={navigateToAddPayment}
          label="Add Payment"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  menu: {
    position: 'absolute',
    top: 100,
    right: 20,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  summaryContent: {
    padding: 16,
  },
  loanName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  paymentItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  paymentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: '#E8F5E9',
  },
  statusChipText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});

export default LoanPaymentsScreen;
