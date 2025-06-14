import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, Divider, Menu } from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';

const TransactionDetailsScreen = ({ route, navigation }) => {
  // Verify transaction exists in route params to prevent crashes
  if (!route.params || !route.params.transaction) {
    console.error("TransactionDetailsScreen: No transaction provided in route params");
    Alert.alert(
      "Error", 
      "Could not load transaction details. Please try again.",
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
    return null;
  }
  
  const { transaction: initialTransaction } = route.params;
  const { 
    accounts, 
    transactions, 
    deleteTransaction,
    updateTransaction 
  } = useFinance();
  
  const [transaction, setTransaction] = useState(initialTransaction);
  const [account, setAccount] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Set header title and options
  useEffect(() => {
    navigation.setOptions({
      title: 'Transaction Details',
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      )
    });
  }, []);
  
  // Update transaction when transactions state changes
  useEffect(() => {
    const updatedTransaction = transactions.find(t => t.id === transaction.id);
    if (updatedTransaction) {
      setTransaction(updatedTransaction);
    }
  }, [transactions]);
  
  // Find the associated account
  useEffect(() => {
    if (accounts.length > 0 && transaction.accountId) {
      const associatedAccount = accounts.find(a => a.id === transaction.accountId);
      if (associatedAccount) {
        setAccount(associatedAccount);
      } else {
        // Handle case when account doesn't exist anymore
        console.warn(`Associated account ${transaction.accountId} not found for transaction ${transaction.id}`);
        setAccount(null);
      }
    }
  }, [accounts, transaction]);
  
  // Format category for display
  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Get color based on transaction type
  const getTransactionColor = () => {
    return transaction.type === 'income' ? '#4CAF50' : '#F44336';
  };
  
  // Get icon based on transaction category
  const getTransactionIcon = () => {
    const iconMap = {
      // Income categories
      'salary': props => <MaterialCommunityIcons name="wallet" {...props} />,
      'investment': 'trending-up',
      'gift': 'card-giftcard',
      'other_income': 'attach-money',
      
      // Expense categories
      'food': 'restaurant',
      'shopping': 'shopping-cart',
      'transportation': 'directions-car',
      'housing': 'home',
      'utilities': 'power',
      'healthcare': 'healing',
      'education': 'school',
      'entertainment': 'movie',
      'debt': 'credit-card',
      'savings': 'savings',
      'other_expense': 'receipt'
    };
    
    return iconMap[transaction.category] || (transaction.type === 'income' ? 'add-circle' : 'remove-circle');
  };
  
  // Navigate to edit transaction
  const navigateToEditTransaction = () => {
    setMenuVisible(false);
    navigation.navigate('EditTransaction', { transaction });
  };
  
  // Handle transaction deletion
  const handleDeleteTransaction = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTransaction(transaction.id);
            if (success) {
              Alert.alert('Success', 'Transaction deleted successfully');
              navigation.goBack();
            }
          }
        }
      ]
    );
  };
  
  // Navigate to account details
  const navigateToAccountDetails = () => {
    if (account) {
      navigation.navigate('AccountDetails', { account });
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Transaction options menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item 
          icon="pencil" 
          onPress={navigateToEditTransaction} 
          title="Edit Transaction" 
        />
        <Menu.Item 
          icon="delete" 
          onPress={handleDeleteTransaction} 
          title="Delete Transaction" 
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
      
      {/* Transaction overview card */}
      <Card style={styles.overviewCard}>
        <View style={styles.transactionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getTransactionColor() + '20' }]}>
            {typeof getTransactionIcon() === 'function' ? (
              getTransactionIcon()({ size: 40, color: getTransactionColor() })
            ) : (
              <MaterialIcons 
                name={getTransactionIcon()} 
                size={40} 
                color={getTransactionColor()} 
              />
            )}
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {transaction.description || transaction.category || (transaction.type === 'income' ? 'Income' : 'Expense')}
            </Text>
            <Text style={styles.transactionCategory}>
              {transaction.category ? formatCategory(transaction.category) : transaction.type}
            </Text>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={[styles.amountValue, { color: getTransactionColor() }]}>
            {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount, account?.currency || 'GHS')}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{formatTime(transaction.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={[
              styles.detailValue, 
              styles.typeValue, 
              { backgroundColor: getTransactionColor() + '20', color: getTransactionColor() }
            ]}>
              {transaction.type === 'income' ? 'Income' : 'Expense'}
            </Text>
          </View>
          
          {account ? (
            <TouchableOpacity style={styles.detailRow} onPress={navigateToAccountDetails}>
              <Text style={styles.detailLabel}>Account</Text>
              <View style={styles.accountDetail}>
                <Text style={styles.detailValue}>{account.name}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account</Text>
              <Text style={[styles.detailValue, {color: '#F44336'}]}>Account not found</Text>
            </View>
          )}
          
          {transaction.paymentMethod && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{transaction.paymentMethod}</Text>
            </View>
          )}
        </View>
        
        {transaction.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesContent}>{transaction.notes}</Text>
          </View>
        )}
        
        {transaction.attachments && transaction.attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.attachmentsLabel}>Attachments</Text>
            {/* Render attachments here */}
          </View>
        )}
        
        <View style={styles.metaSection}>
          <Text style={styles.metaText}>
            Created: {formatDate(transaction.createdAt)}
          </Text>
          {transaction.updatedAt && (
            <Text style={styles.metaText}>
              Last updated: {formatDate(transaction.updatedAt)}
            </Text>
          )}
        </View>
      </Card>
      
      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <Button 
          mode="outlined" 
          icon="pencil" 
          onPress={navigateToEditTransaction}
          style={styles.editButton}
        >
          Edit Transaction
        </Button>
        <Button 
          mode="outlined" 
          icon="delete" 
          onPress={handleDeleteTransaction}
          style={styles.deleteButton}
          textColor="#F44336"
        >
          Delete
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 20,
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
  transactionHeader: {
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
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  transactionCategory: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
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
  },
  detailsSection: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeValue: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  accountDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 14,
  },
  attachmentsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachmentsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metaSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#2196F3',
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#F44336',
  },
});

export default TransactionDetailsScreen;
