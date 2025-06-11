import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import AccountCard from '../../components/finance/AccountCard';
import FinancialReportChart from '../../components/finance/FinancialReportChart';
import TransactionList from '../../components/finance/TransactionList';

const PersonalFinanceScreen = ({ navigation }) => {
  const { 
    accounts, 
    transactions, 
    isLoading,
    currentScope,
    changeScope
  } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [reportData, setReportData] = useState(null);
  
  // Set scope to personal when component mounts
  useEffect(() => {
    if (currentScope !== FINANCE_SCOPE.PERSONAL) {
      changeScope(FINANCE_SCOPE.PERSONAL);
    }
  }, []);
  
  // Update recent transactions when transactions change
  useEffect(() => {
    // Get the 5 most recent transactions
    const recent = [...transactions]
      .sort((a, b) => {
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, 5);
    
    setRecentTransactions(recent);
    
    // Generate report data
    generateReportData();
  }, [transactions]);
  
  // Generate report data for the current month
  const generateReportData = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Filter transactions for the current month
    const monthTransactions = transactions.filter(transaction => {
      const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      return transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
    });
    
    // Calculate totals
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    // Group by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    monthTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        const category = transaction.category || 'Other';
        incomeByCategory[category] = (incomeByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
      } else if (transaction.type === 'expense') {
        const category = transaction.category || 'Other';
        expenseByCategory[category] = (expenseByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
      }
    });
    
    setReportData({
      startDate: firstDayOfMonth.toLocaleDateString(),
      endDate: lastDayOfMonth.toLocaleDateString(),
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      incomeByCategory,
      expenseByCategory
    });
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
  
  // Navigate to account details
  const navigateToAccountDetails = (account) => {
    navigation.navigate('AccountDetails', { account });
  };
  
  // Navigate to transaction details
  const navigateToTransactionDetails = (transaction) => {
    navigation.navigate('TransactionDetails', { transaction });
  };
  
  // Navigate to all accounts
  const navigateToAllAccounts = () => {
    navigation.navigate('AccountsScreen');
  };
  
  // Navigate to all transactions
  const navigateToAllTransactions = () => {
    navigation.navigate('TransactionsScreen');
  };
  
  // Navigate to reports
  const navigateToReports = () => {
    navigation.navigate('Reports');
  };
  
  // Navigate to add transaction
  const navigateToAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };
  
  // Navigate to add account
  const navigateToAddAccount = () => {
    navigation.navigate('AddAccount');
  };
  
  // Navigate to loans
  const navigateToLoans = () => {
    navigation.navigate('Loans');
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Calculate total balance across all accounts
  const calculateTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + (parseFloat(account.balance) || 0), 0);
  };
  
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Balance Summary */}
      <View style={styles.balanceSummary}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(calculateTotalBalance())}
        </Text>
      </View>
      
      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToAddTransaction}
        >
          <MaterialIcons name="add-circle" size={24} color="#2196F3" />
          <Text style={styles.quickActionText}>Add Transaction</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToAddAccount}
        >
          <MaterialIcons name="account-balance" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>Add Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToReports}
        >
          <MaterialIcons name="insert-chart" size={24} color="#FFC107" />
          <Text style={styles.quickActionText}>Reports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToLoans}
        >
          <MaterialIcons name="monetization-on" size={24} color="#9C27B0" />
          <Text style={styles.quickActionText}>Loans</Text>
        </TouchableOpacity>
      </View>
      
      {/* Accounts Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <TouchableOpacity onPress={navigateToAllAccounts}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {accounts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="account-balance-wallet" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No accounts yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddAccount}
            >
              <Text style={styles.emptyStateButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          accounts.slice(0, 3).map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => navigateToAccountDetails(account)}
            />
          ))
        )}
      </View>
      
      {/* Monthly Report Section */}
      {reportData && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <TouchableOpacity onPress={navigateToReports}>
              <Text style={styles.seeAllText}>More Reports</Text>
            </TouchableOpacity>
          </View>
          
          <FinancialReportChart data={reportData} />
        </View>
      )}
      
      {/* Recent Transactions Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={navigateToAllTransactions}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="receipt-long" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddTransaction}
            >
              <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TransactionList
            transactions={recentTransactions}
            onTransactionPress={navigateToTransactionDetails}
            formatCurrency={formatCurrency}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  balanceSummary: {
    backgroundColor: '#2196F3',
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    elevation: 2,
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 4,
    color: '#333',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2196F3',
  },
  emptyStateContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
    margin: 16,
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default PersonalFinanceScreen;
