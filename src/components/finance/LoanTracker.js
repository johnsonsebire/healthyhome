import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const LoanTracker = ({ loan, onPress, onRecordPayment }) => {
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const loanDate = date.toDate ? date.toDate() : new Date(date);
    return loanDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
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
  
  // Calculate paid amount (support both new payments array and old schedule)
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
    const totalAmount = loan.amount || 0;
    const paidAmount = calculatePaidAmount();
    
    return totalAmount - paidAmount;
  };
  
  // Calculate progress percentage
  const calculateProgressPercentage = () => {
    const totalAmount = loan.amount || 0;
    if (totalAmount === 0) return 100;
    
    const paidAmount = calculatePaidAmount();
    
    return Math.min(100, (paidAmount / totalAmount) * 100);
  };
  
  const progressPercentage = calculateProgressPercentage();
  
  // Get next payment information
  const getNextPayment = () => {
    if (!loan.paymentSchedule || loan.paymentSchedule.length === 0) {
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
  
  const nextPayment = getNextPayment();
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons 
                name={loan.isLent ? 'trending-up' : 'trending-down'} 
                size={24} 
                color={loan.isLent ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.loanType}>
                {loan.isLent ? 'Money Lent' : 'Money Borrowed'}
              </Text>
            </View>
            <View style={[styles.statusContainer, { backgroundColor: `${statusInfo.color}20` }]}>
              <MaterialIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(loan.amount)}</Text>
          </View>
          
          <View style={styles.counterpartyContainer}>
            <MaterialIcons name="person" size={16} color="#666" />
            <Text style={styles.counterpartyText}>
              {loan.isLent ? 'Lent to: ' : 'Borrowed from: '}
              <Text style={styles.counterpartyName}>
                {loan.counterpartyName || (loan.isLent ? loan.borrower : loan.lender) || 'N/A'}
              </Text>
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progressPercentage}%`, backgroundColor: statusInfo.color }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercentage.toFixed(0)}% paid
            </Text>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <MaterialIcons name="date-range" size={16} color="#666" />
              <Text style={styles.detailText}>
                Start: {formatDate(loan.startDate)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <MaterialIcons name="event" size={16} color="#666" />
              <Text style={styles.detailText}>
                Due: {formatDate(loan.dueDate)}
              </Text>
            </View>
          </View>
          
          {loan.interestRate > 0 && (
            <View style={styles.interestContainer}>
              <MaterialIcons name="attach-money" size={16} color="#666" />
              <Text style={styles.interestText}>
                Interest Rate: {loan.interestRate}%
              </Text>
            </View>
          )}
          
          {nextPayment && loan.status === 'active' && (
            <View style={styles.nextPaymentContainer}>
              <Text style={styles.nextPaymentLabel}>Next Payment</Text>
              <View style={styles.nextPaymentDetails}>
                <Text style={styles.nextPaymentAmount}>
                  {formatCurrency(nextPayment.amount)}
                </Text>
                <Text style={styles.nextPaymentDate}>
                  Due on {formatDate(nextPayment.dueDate)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.recordPaymentButton}
                onPress={() => onRecordPayment && onRecordPayment(loan, nextPayment)}
              >
                <MaterialIcons name="payment" size={16} color="white" />
                <Text style={styles.recordPaymentText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  amountContainer: {
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterpartyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterpartyText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  counterpartyName: {
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  interestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  interestText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  nextPaymentContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  nextPaymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  nextPaymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextPaymentDate: {
    fontSize: 12,
    color: '#666',
  },
  recordPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  recordPaymentText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default LoanTracker;
