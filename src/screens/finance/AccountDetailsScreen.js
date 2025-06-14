import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Button, Divider, Menu } from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';
import TransactionList from '../../components/finance/TransactionList';

const AccountDetailsScreen = ({ route, navigation }) => {
  const { account: initialAccount } = route.params;
  const { 
    accounts, 
    transactions, 
    isLoading, 
    deleteAccount,
    updateAccount,
    recalculateAccountBalance,
    loadTransactions
  } = useFinance();
  
  const [account, setAccount] = useState(initialAccount);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0
  });
  
  // Set header title and options
  useEffect(() => {
    navigation.setOptions({
      title: account.name,
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      )
    });
  }, [account]);
  
  // Update account when accounts state changes
  useEffect(() => {
    const updatedAccount = accounts.find(a => a.id === account.id);
    if (updatedAccount) {
      setAccount(updatedAccount);
    }
  }, [accounts]);
  
  // Recalculate account balance when component mounts or transactions change
  useEffect(() => {
    const recalculateBalance = async () => {
      try {
        if (account && account.id) {
          await recalculateAccountBalance(account.id);
          console.log('Account balance automatically recalculated');
        }
      } catch (error) {
        console.error('Error automatically recalculating balance:', error);
      }
    };
    
    recalculateBalance();
  }, [account?.id, transactions.length]);
  
  // Filter transactions for this account
  useEffect(() => {
    console.log(`Total transactions in state: ${transactions.length}`);
    if (transactions.length > 0) {
      // Filter transactions that belong to this account and are not empty/undefined
      const filteredTransactions = transactions.filter(t => t && t.accountId === account.id);
      console.log(`Filtered transactions for account ${account.id}: ${filteredTransactions.length}`);
      
      // Deduplicate transactions by ID
      const uniqueTransactionsMap = new Map();
      filteredTransactions.forEach(transaction => {
        if (transaction && transaction.id) {
          // Only add if not already in the map, or replace with newer transaction (by updatedAt)
          if (!uniqueTransactionsMap.has(transaction.id) ||
              (transaction.updatedAt && uniqueTransactionsMap.get(transaction.id).updatedAt &&
               transaction.updatedAt > uniqueTransactionsMap.get(transaction.id).updatedAt)) {
            uniqueTransactionsMap.set(transaction.id, transaction);
          }
        }
      });
      
      // Convert map back to array
      const uniqueTransactions = Array.from(uniqueTransactionsMap.values());
      console.log(`Unique transactions after deduplication: ${uniqueTransactions.length}`);
      
      // Log transaction IDs for debugging
      uniqueTransactions.forEach(t => {
        console.log(`Transaction: ${t.id}, Type: ${t.type}, Amount: ${t.amount}, Date: ${t.date}`);
      });
      
      setAccountTransactions(uniqueTransactions);
      
      // Calculate stats with enhanced precision and error handling
      let income = 0;
      let expense = 0;
      
      // Include initial balance as part of income calculation if available
      const initialBalance = getInitialBalance(account);
      if (initialBalance > 0) {
        income += initialBalance;
        console.log(`Added initial balance to income: +${initialBalance}`);
      }
      
      // Process each transaction carefully
      uniqueTransactions.forEach(t => {
        if (!t) {
          console.warn('Skipping undefined transaction');
          return;
        }
        
        try {
          // Ensure we're working with a valid number
          let amount = 0;
          
          if (typeof t.amount === 'number') {
            amount = t.amount;
          } else if (typeof t.amount === 'string') {
            amount = parseFloat(t.amount);
          } else if (t.amount) {
            amount = parseFloat(t.amount);
          }
          
          if (isNaN(amount)) {
            console.warn(`Skipping transaction with NaN amount: ${t.id}, ${t.amount}`);
            return;
          }
          
          // Round to avoid floating point errors
          amount = Math.round(amount * 100) / 100;
          
          // Add to the appropriate total
          if (t.type === 'income') {
            income += amount;
            console.log(`Added income transaction: +${amount} (ID: ${t.id})`);
          } else if (t.type === 'expense') {
            expense += amount;
            console.log(`Added expense transaction: -${amount} (ID: ${t.id})`);
          } else {
            console.warn(`Skipping transaction with unknown type: ${t.id}, ${t.type}`);
          }
        } catch (error) {
          console.error(`Error processing transaction: ${t.id}`, error);
        }
      });
      
      // Round totals to avoid floating point errors
      income = Math.round(income * 100) / 100;
      expense = Math.round(expense * 100) / 100;
      const netIncome = Math.round((income - expense) * 100) / 100;
      
      console.log(`Account ${account.id} - Income total: ${income}, Expense total: ${expense}, Net: ${netIncome}`);
      
      setStats({
        totalIncome: income,
        totalExpense: expense,
        netIncome: netIncome
      });
    } else {
      setAccountTransactions([]);
      setStats({
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0
      });
      console.log(`No transactions available for account ${account.id}`);
    }
  }, [transactions, account.id]);
  
  // Format currency with enhanced error handling
  const formatCurrency = (amount) => {
    try {
      // First ensure we have a valid number to work with
      let validAmount = 0;
      
      if (typeof amount === 'number') {
        validAmount = amount;
      } else if (typeof amount === 'string') {
        validAmount = parseFloat(amount);
      } else if (amount) {
        validAmount = parseFloat(amount);
      }
      
      if (isNaN(validAmount)) {
        console.warn('Invalid amount for currency formatting:', amount);
        return '0.00';
      }
      
      // Round to 2 decimal places to avoid floating point issues
      validAmount = Math.round(validAmount * 100) / 100;
      
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: account.currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(validAmount);
    } catch (error) {
      console.error('Error formatting currency:', error, amount);
      return '0.00';
    }
  };
  
  // Get account color based on type
  const getAccountColor = () => {
    if (account.color) return account.color;
    
    switch (account.type) {
      case 'savings':
        return '#4CAF50';
      case 'checking':
        return '#2196F3';
      case 'credit':
        return '#F44336';
      case 'investment':
        return '#9C27B0';
      default:
        return '#607D8B';
    }
  };
  
  // Get account icon based on type
  const getAccountIcon = () => {
    if (account.icon) return account.icon;
    
    switch (account.type) {
      case 'savings':
        return 'savings';
      case 'checking':
        return 'account-balance';
      case 'credit':
        return 'credit-card';
      case 'investment':
        return 'trending-up';
      default:
        return 'account-balance-wallet';
    }
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Recalculate account balance
      await recalculateAccountBalance(account.id);
      
      // Force a reload of transactions
      if (loadTransactions) {
        await loadTransactions();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Navigate to transaction details
  const navigateToTransactionDetails = (transaction) => {
    navigation.navigate('TransactionDetails', { transaction });
  };
  
  // Navigate to add transaction for this account
  const navigateToAddTransaction = () => {
    navigation.navigate('AddTransaction', { accountId: account.id });
  };
  
  // Navigate to edit account
  const navigateToEditAccount = () => {
    setMenuVisible(false);
    navigation.navigate('EditAccount', { account });
  };
  
  // Handle balance recalculation
  const handleRecalculateBalance = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Recalculate Balance',
      'This will recalculate the account balance based on all transactions. Proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Recalculate',
          onPress: async () => {
            try {
              setRefreshing(true);
              
              // Call the recalculate function from context
              console.log(`Initiating balance recalculation for account ${account.id}`);
              const success = await recalculateAccountBalance(account.id);
              
              // Briefly wait to ensure any Firebase operations complete
              await new Promise(resolve => setTimeout(resolve, 500));
              
              if (success) {
                Alert.alert(
                  'Success', 
                  'Account balance has been recalculated based on all transactions.'
                );
              } else {
                Alert.alert('Error', 'Failed to recalculate balance. Please try again.');
              }
            } catch (error) {
              console.error('Error recalculating balance:', error, error.stack);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAccount(account.id);
            if (success) {
              Alert.alert('Success', 'Account deleted successfully');
              navigation.goBack();
            }
          }
        }
      ]
    );
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
  
  // Helper function to safely get initial balance
  const getInitialBalance = (account) => {
    if (!account) return 0;
    
    try {
      let initialBalance = 0;
      
      if (typeof account.initialBalance === 'number') {
        initialBalance = account.initialBalance;
      } else if (typeof account.initialBalance === 'string') {
        initialBalance = parseFloat(account.initialBalance);
      } else if (account.initialBalance) {
        initialBalance = parseFloat(account.initialBalance);
      }
      
      if (isNaN(initialBalance)) {
        console.warn(`Invalid initial balance for account ${account.id}, using 0`);
        return 0;
      }
      
      return Math.round(initialBalance * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error parsing initial balance:', error);
      return 0;
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Account options menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item 
          icon="pencil" 
          onPress={navigateToEditAccount} 
          title="Edit Account" 
        />
        <Menu.Item 
          icon="delete" 
          onPress={handleDeleteAccount} 
          title="Delete Account" 
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
      
      {/* Use FlatList with header components to avoid nesting */}
      <TransactionList 
        transactions={accountTransactions} 
        onTransactionPress={navigateToTransactionDetails} 
        formatCurrency={(val) => formatCurrency(val)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <>
            {/* Account overview card */}
            <Card style={styles.overviewCard}>
              <View style={styles.accountHeader}>
                <View style={styles.iconContainer}>
                  <MaterialIcons 
                    name={getAccountIcon()} 
                    size={40} 
                    color={getAccountColor()} 
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>{account.type}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={[styles.balanceAmount, { color: getAccountColor() }]}>
                  {formatCurrency(account.balance || 0)}
                </Text>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                    {formatCurrency(stats.totalIncome)}
                  </Text>
                  {getInitialBalance(account) > 0 && (
                    <Text style={styles.statNote}>Includes initial balance</Text>
                  )}
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text style={[styles.statValue, { color: '#F44336' }]}>
                    {formatCurrency(stats.totalExpense)}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Net</Text>
                  <Text style={[styles.statValue, { 
                    color: stats.netIncome >= 0 ? '#4CAF50' : '#F44336' 
                  }]}>
                    {formatCurrency(stats.netIncome)}
                  </Text>
                </View>
              </View>
              
              {account.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{account.description}</Text>
                </View>
              )}
              
              <View style={styles.metaSection}>
                <Text style={styles.metaText}>
                  Created: {formatDate(account.createdAt)}
                </Text>
                {account.updatedAt && (
                  <Text style={styles.metaText}>
                    Last updated: {formatDate(account.updatedAt)}
                  </Text>
                )}
              </View>
            </Card>
            
            {/* Action buttons */}
            <View style={styles.actionButtonsContainer}>
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={navigateToAddTransaction}
                style={styles.addButton}
              >
                Add Transaction
              </Button>
            </View>
            
            {/* Transactions header */}
            <View style={styles.transactionsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transactions</Text>
              </View>
            </View>
          </>
        )}
      />
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
    top: 40,
    right: 20,
  },
  overviewCard: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  accountHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  accountType: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  balanceSection: {
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statNote: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  descriptionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
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
    padding: 16,
  },
  addButton: {
    borderRadius: 4,
  },
  transactionsSection: {
    marginTop: 8,
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  sectionHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AccountDetailsScreen;
