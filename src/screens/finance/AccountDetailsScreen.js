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
    updateAccount 
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
  
  // Filter transactions for this account
  useEffect(() => {
    if (transactions.length > 0) {
      const filteredTransactions = transactions.filter(t => t.accountId === account.id);
      setAccountTransactions(filteredTransactions);
      
      // Calculate stats
      const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
      const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
      setStats({
        totalIncome: income,
        totalExpense: expense,
        netIncome: income - expense
      });
    }
  }, [transactions, account]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: account.currency || 'USD',
      minimumFractionDigits: 2 
    }).format(amount);
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
    // Reload data
    await Promise.all([
      // Reload accounts and transactions
    ]);
    setRefreshing(false);
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
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
      
      {/* Transactions section */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
        </View>
        
        <TransactionList 
          transactions={accountTransactions} 
          onTransactionPress={navigateToTransactionDetails} 
          formatCurrency={(val) => formatCurrency(val)}
        />
      </View>
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
