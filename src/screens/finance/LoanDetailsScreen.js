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

const LoanDetailsScreen = ({ route, navigation }) => {
  const { loan: initialLoan } = route.params;
  const { 
    loans, 
    recordLoanPayment,
    updateLoan,
    deleteLoan
  } = useFinance();
  
  const [loan, setLoan] = useState(initialLoan);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);
  
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
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
  
  // Calculate total amount
  const calculateTotalAmount = () => {
    const principal = loan.amount || 0;
    const interest = principal * (loan.interestRate / 100);
    return principal + interest;
  };
  
  // Calculate paid amount
  const calculatePaidAmount = () => {
    if (!loan.paymentSchedule) return 0;
    
    return loan.paymentSchedule
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
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
  
  // Handle mark as paid
  const handleMarkAsPaid = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Mark Loan as Paid',
      'Are you sure you want to mark this entire loan as paid?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            const updatedSchedule = loan.paymentSchedule.map(payment => ({
              ...payment,
              status: 'paid'
            }));
            
            const success = await updateLoan(loan.id, {
              status: 'paid',
              paymentSchedule: updatedSchedule
            });
            
            if (success) {
              Alert.alert('Success', 'Loan marked as paid');
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
          icon="check-circle" 
          onPress={handleMarkAsPaid} 
          title="Mark as Paid" 
          disabled={loan.status === 'paid'}
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
      
      {/* Payment Schedule */}
      <Card style={styles.paymentCard}>
        <Card.Title title="Payment Schedule" />
        <Card.Content>
          <FlatList
            data={loan.paymentSchedule || []}
            renderItem={renderPaymentItem}
            keyExtractor={(item, index) => `payment-${index}`}
            ItemSeparatorComponent={renderSeparator}
            scrollEnabled={false}
          />
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
});

export default LoanDetailsScreen;
