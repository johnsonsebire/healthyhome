import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Button, Divider, Menu, Chip } from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import currencyService from '../../services/currencyService';

const LoanDetailsScreen = ({ route, navigation }) => {
  const { loan: initialLoan } = route.params;
  const { 
    loans, 
    recordLoanPayment,
    recordPartialLoanPayment,
    updateLoanPayment,
    deleteLoanPayment,
    markLoanAsPaid,
    markLoanAsUnpaid,
    updateLoan,
    deleteLoan
  } = useFinance();
  
  const { user } = useAuth();
  
  const [loan, setLoan] = useState(initialLoan);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);
  const [userCurrencySettings, setUserCurrencySettings] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('GHS');
  
  // Load user currency settings
  useEffect(() => {
    const loadCurrencySettings = async () => {
      if (user) {
        try {
          const settings = await currencyService.loadUserCurrencySettings(user.uid);
          setUserCurrencySettings(settings);
          setDisplayCurrency(settings.displayCurrency || 'GHS');
        } catch (error) {
          console.error('Error loading currency settings:', error);
        }
      }
    };

    loadCurrencySettings();
  }, [user]);

  // Initialize currency service
  useEffect(() => {
    currencyService.initializeExchangeRates();
  }, []);
  
  // Set header title and options
  useEffect(() => {
    navigation.setOptions({
      title: loan.name,
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      )
    });
  }, [loan]);
  
  // Update loan when loans state changes
  useEffect(() => {
    const updatedLoan = loans.find(l => l.id === loan.id);
    if (updatedLoan) {
      setLoan(updatedLoan);
    }
  }, [loans]);
  
  // Format currency using currency service
  const formatCurrency = (amount) => {
    // Use the loan's currency if available, otherwise use display currency
    const targetCurrency = loan.currency || displayCurrency || 'GHS';
    return currencyService.formatCurrency(amount, targetCurrency);
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
        console.warn('Invalid date detected in LoanDetailsScreen:', date);
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date in LoanDetailsScreen:', error, date);
      return 'Invalid Date';
    }
  };
  
  // Get loan status information
  const getLoanStatusInfo = () => {
    const statusMap = {
      'active': {
        icon: 'schedule',
        color: '#2196F3',
        label: 'Active'
      },
      'paid': {
        icon: 'check-circle',
        color: '#4CAF50',
        label: 'Paid'
      },
      'defaulted': {
        icon: 'error',
        color: '#F44336',
        label: 'Defaulted'
      }
    };
    
    return statusMap[loan.status] || statusMap.active;
  };
  
  const statusInfo = getLoanStatusInfo();
  
  // Calculate total amount (principal only for new payment system)
  const calculateTotalAmount = () => {
    return loan.amount || 0;
  };
  
  // Calculate paid amount (support both old schedule-based and new payments array)
  const calculatePaidAmount = () => {
    // New payment system - use payments array and totalPaid
    if (loan.payments && Array.isArray(loan.payments)) {
      return loan.totalPaid || loan.payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    }
    
    // Fallback to old payment schedule system
    if (loan.paymentSchedule) {
      return loan.paymentSchedule
        .filter(payment => payment.status === 'paid')
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }
    
    return 0;
  };
  
  // Calculate remaining amount
  const calculateRemainingAmount = () => {
    return calculateTotalAmount() - calculatePaidAmount();
  };
  
  // Calculate progress percentage
  const calculateProgressPercentage = () => {
    const totalAmount = calculateTotalAmount();
    if (totalAmount === 0) return 100;
    
    const paidAmount = calculatePaidAmount();
    return Math.min(100, (paidAmount / totalAmount) * 100);
  };
  
  // Get next payment
  const getNextPayment = () => {
    if (!loan.paymentSchedule || loan.paymentSchedule.length === 0 || loan.status === 'paid') {
      return null;
    }
    
    const now = new Date();
    
    const nextPayment = loan.paymentSchedule
      .filter(payment => payment.status !== 'paid')
      .sort((a, b) => {
        const dateA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        const dateB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
        return dateA - dateB;
      })[0];
    
    return nextPayment;
  };
  
  // Navigate to edit loan
  const navigateToEditLoan = () => {
    setMenuVisible(false);
    navigation.navigate('EditLoan', { loan });
  };

  // Navigate to add payment
  const navigateToAddPayment = () => {
    setMenuVisible(false);
    navigation.navigate('AddLoanPayment', { loan });
  };

  // Navigate to payment history
  const navigateToPaymentHistory = () => {
    setMenuVisible(false);
    navigation.navigate('LoanPayments', { loan });
  };
  
  // Handle loan deletion
  const handleDeleteLoan = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteLoan(loan.id);
            if (success) {
              Alert.alert('Success', 'Loan deleted successfully');
              navigation.goBack();
            }
          }
        }
      ]
    );
  };
  
  // Handle mark as paid (enhanced version)
  const handleMarkAsPaid = () => {
    setMenuVisible(false);
    
    const remainingAmount = calculateRemainingAmount();
    
    Alert.alert(
      'Mark Loan as Paid',
      `This will record a payment of ${formatCurrency(remainingAmount)} to complete the loan. Are you sure?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            const success = await markLoanAsPaid(loan.id);
            
            if (success) {
              Alert.alert('Success', 'Loan marked as paid');
            }
          }
        }
      ]
    );
  };

  // Handle mark as unpaid (new function)
  const handleMarkAsUnpaid = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Mark Loan as Unpaid',
      'This will remove all payments and reset the loan status. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Unpaid',
          style: 'destructive',
          onPress: async () => {
            const success = await markLoanAsUnpaid(loan.id);
            
            if (success) {
              Alert.alert('Success', 'Loan marked as unpaid - all payments removed');
            }
          }
        }
      ]
    );
  };
  
  // Handle mark as defaulted
  const handleMarkAsDefaulted = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Mark Loan as Defaulted',
      'Are you sure you want to mark this loan as defaulted?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Defaulted',
          style: 'destructive',
          onPress: async () => {
            const success = await updateLoan(loan.id, {
              status: 'defaulted'
            });
            
            if (success) {
              Alert.alert('Success', 'Loan marked as defaulted');
            }
          }
        }
      ]
    );
  };
  
  // Handle mark payment as paid
  const handleMarkPaymentAsPaid = (payment) => {
    setPaymentMenuVisible(false);
    setSelectedPayment(null);
    
    Alert.alert(
      'Mark Payment as Paid',
      `Are you sure you want to mark payment #${payment.paymentNumber} as paid?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            const success = await recordLoanPayment(loan.id, payment);
            
            if (success) {
              Alert.alert('Success', 'Payment recorded successfully');
            }
          }
        }
      ]
    );
  };
  
  // Render a payment item
  const renderPaymentItem = ({ item }) => {
    const isPaid = item.status === 'paid';
    const dueDate = item.dueDate.toDate ? item.dueDate.toDate() : new Date(item.dueDate);
    const isOverdue = !isPaid && dueDate < new Date();
    
    return (
      <TouchableOpacity 
        style={styles.paymentItem}
        onPress={() => {
          if (!isPaid) {
            setSelectedPayment(item);
            setPaymentMenuVisible(true);
          }
        }}
      >
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentNumber}>Payment #{item.paymentNumber}</Text>
          <Text style={styles.paymentDate}>Due: {formatDate(item.dueDate)}</Text>
        </View>
        
        <View style={styles.paymentAmount}>
          <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
          {isPaid ? (
            <Chip 
              icon="check-circle" 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: '#E8F5E9' }]}
              textStyle={{ color: '#4CAF50' }}
            >
              Paid
            </Chip>
          ) : isOverdue ? (
            <Chip 
              icon="alert-circle" 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}
              textStyle={{ color: '#F44336' }}
            >
              Overdue
            </Chip>
          ) : (
            <Chip 
              icon="clock-outline" 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: '#E3F2FD' }]}
              textStyle={{ color: '#2196F3' }}
            >
              Pending
            </Chip>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render separator between payment items
  const renderSeparator = () => <Divider style={styles.divider} />;
  
  return (
    <ScrollView style={styles.container}>
      {/* Loan options menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item 
          icon="pencil" 
          onPress={navigateToEditLoan} 
          title="Edit Loan" 
        />
        <Menu.Item 
          icon="payment" 
          onPress={navigateToAddPayment} 
          title="Add Payment" 
          disabled={loan.status === 'paid'}
        />
        <Menu.Item 
          icon="history" 
          onPress={navigateToPaymentHistory} 
          title="Payment History" 
        />
        <Divider />
        <Menu.Item 
          icon="check-circle" 
          onPress={handleMarkAsPaid} 
          title="Mark as Paid" 
          disabled={loan.status === 'paid'}
        />
        <Menu.Item 
          icon="undo" 
          onPress={handleMarkAsUnpaid} 
          title="Mark as Unpaid" 
          disabled={loan.status !== 'paid'}
        />
        <Menu.Item 
          icon="alert-circle" 
          onPress={handleMarkAsDefaulted} 
          title="Mark as Defaulted" 
          titleStyle={{ color: '#F44336' }}
          disabled={loan.status === 'defaulted'}
        />
        <Divider />
        <Menu.Item 
          icon="delete" 
          onPress={handleDeleteLoan} 
          title="Delete Loan" 
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
      
      {/* Payment options menu */}
      <Menu
        visible={paymentMenuVisible}
        onDismiss={() => {
          setPaymentMenuVisible(false);
          setSelectedPayment(null);
        }}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item 
          icon="check-circle" 
          onPress={() => handleMarkPaymentAsPaid(selectedPayment)} 
          title="Mark as Paid" 
        />
      </Menu>
      
      {/* Loan overview card */}
      <Card style={styles.overviewCard}>
        <View style={styles.loanHeader}>
          <View style={[styles.iconContainer, { backgroundColor: statusInfo.color + '20' }]}>
            <MaterialIcons 
              name={statusInfo.icon} 
              size={40} 
              color={statusInfo.color} 
            />
          </View>
          <View style={styles.loanInfo}>
            <Text style={styles.loanName}>{loan.name}</Text>
            <View style={styles.loanTypeContainer}>
              <Chip 
                mode="flat" 
                style={styles.loanTypeChip}
              >
                {loan.type === 'borrowed' ? 'Borrowed' : 'Lent'}
              </Chip>
              <Chip 
                icon={statusInfo.icon}
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
                textStyle={{ color: statusInfo.color }}
              >
                {statusInfo.label}
              </Chip>
            </View>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(calculateTotalAmount())}
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${calculateProgressPercentage()}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {formatCurrency(calculatePaidAmount())} of {formatCurrency(calculateTotalAmount())} paid ({calculateProgressPercentage().toFixed(0)}%)
            </Text>
          </View>
        </View>
        
        {/* Quick Payment Actions */}
        {loan.status !== 'paid' && (
          <>
            <Divider style={styles.divider} />
            
            <View style={styles.quickActionsSection}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <Button 
                  mode="contained" 
                  icon="payment" 
                  onPress={navigateToAddPayment}
                  style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}
                  compact
                >
                  Add Payment
                </Button>
                
                <Button 
                  mode="outlined" 
                  icon="history" 
                  onPress={navigateToPaymentHistory}
                  style={styles.quickActionButton}
                  compact
                >
                  View Payments
                </Button>
                
                {calculateRemainingAmount() > 0 && (
                  <Button 
                    mode="contained" 
                    icon="check-circle" 
                    onPress={handleMarkAsPaid}
                    style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}
                    compact
                  >
                    Mark Paid
                  </Button>
                )}
              </View>
            </View>
          </>
        )}
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {loan.type === 'borrowed' ? 'Lender' : 'Borrower'}
            </Text>
            <Text style={styles.detailValue}>
              {loan.type === 'borrowed' ? loan.lender : loan.borrower}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Principal Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(loan.amount)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interest Rate</Text>
            <Text style={styles.detailValue}>{loan.interestRate}%</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Term</Text>
            <Text style={styles.detailValue}>{loan.term} payments</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Frequency</Text>
            <Text style={styles.detailValue}>
              {loan.paymentFrequency === 'monthly' 
                ? 'Monthly' 
                : loan.paymentFrequency === 'bi-weekly' 
                ? 'Bi-Weekly' 
                : 'Weekly'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(loan.startDate)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{formatDate(loan.dueDate)}</Text>
          </View>
        </View>
        
        {getNextPayment() && (
          <>
            <Divider style={styles.divider} />
            
            <View style={styles.nextPaymentSection}>
              <Text style={styles.nextPaymentLabel}>Next Payment</Text>
              <Text style={styles.nextPaymentDate}>
                Due: {formatDate(getNextPayment().dueDate)}
              </Text>
              <Text style={styles.nextPaymentAmount}>
                {formatCurrency(getNextPayment().amount)}
              </Text>
              
              <Button 
                mode="contained" 
                icon="check-circle" 
                onPress={() => handleMarkPaymentAsPaid(getNextPayment())}
                style={styles.payNowButton}
              >
                Mark as Paid
              </Button>
            </View>
          </>
        )}
      </Card>
      
      {/* Payment History & Schedule */}
      <Card style={styles.paymentCard}>
        <Card.Title title={loan.payments && loan.payments.length > 0 ? "Payment History" : "Payment Schedule"} />
        <Card.Content>
          {/* New Payment System - Show payment history */}
          {loan.payments && loan.payments.length > 0 ? (
            <View>
              <Text style={styles.sectionSubtitle}>Recent Payments</Text>
              <FlatList
                data={loan.payments.slice(-5).reverse()} // Show last 5 payments
                renderItem={({ item }) => (
                  <View style={styles.paymentHistoryItem}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
                      <Text style={styles.paymentDate}>{formatDate(item.date)}</Text>
                      {item.note && <Text style={styles.paymentNote}>{item.note}</Text>}
                    </View>
                    <Chip 
                      icon="check-circle" 
                      mode="flat" 
                      style={[styles.statusChip, { backgroundColor: '#E8F5E9' }]}
                      textStyle={{ color: '#4CAF50' }}
                    >
                      Paid
                    </Chip>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={renderSeparator}
                scrollEnabled={false}
              />
              
              {loan.payments.length > 5 && (
                <Button 
                  mode="text" 
                  onPress={navigateToPaymentHistory}
                  style={styles.viewAllButton}
                >
                  View All {loan.payments.length} Payments
                </Button>
              )}
              
              {/* Show remaining balance */}
              {calculateRemainingAmount() > 0 && (
                <View style={styles.remainingBalanceSection}>
                  <Text style={styles.remainingBalanceLabel}>Remaining Balance</Text>
                  <Text style={styles.remainingBalanceAmount}>
                    {formatCurrency(calculateRemainingAmount())}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* Fallback to old payment schedule system */
            <FlatList
              data={loan.paymentSchedule || []}
              renderItem={renderPaymentItem}
              keyExtractor={(item, index) => `payment-${index}`}
              ItemSeparatorComponent={renderSeparator}
              scrollEnabled={false}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  overviewCard: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  loanHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loanInfo: {
    flex: 1,
  },
  loanName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loanTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanTypeChip: {
    marginRight: 8,
  },
  statusChip: {
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  amountSection: {
    padding: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  quickActionsSection: {
    padding: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    marginHorizontal: 2,
    marginVertical: 4,
    minWidth: '30%',
  },
  detailsSection: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextPaymentSection: {
    padding: 16,
    alignItems: 'center',
  },
  nextPaymentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nextPaymentDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nextPaymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  payNowButton: {
    borderRadius: 4,
  },
  paymentCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    elevation: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentNumber: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  paymentHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  viewAllButton: {
    marginTop: 8,
  },
  remainingBalanceSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  remainingBalanceLabel: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  remainingBalanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
});

export default LoanDetailsScreen;
