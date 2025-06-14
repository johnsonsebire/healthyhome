import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, Chip, SegmentedButtons } from 'react-native-paper';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import FinancialReportChart from '../../components/finance/FinancialReportChart';

const ReportsScreen = ({ navigation }) => {
  const { 
    accounts, 
    transactions, 
    isLoading, 
    currentScope, 
    changeScope
  } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedScope, setSelectedScope] = useState(currentScope);
  const [reportData, setReportData] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    accounts: [],
    categories: []
  });
  
  // Load data when scope changes
  useEffect(() => {
    if (selectedScope !== currentScope) {
      changeScope(selectedScope);
    }
  }, [selectedScope]);
  
  // Generate report when transactions, period, or scope changes
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      try {
        generateReport();
      } catch (error) {
        console.error('Error generating report:', error);
        // Set a minimal valid report data structure as fallback
        setReportData({
          startDate: new Date().toLocaleDateString(),
          endDate: new Date().toLocaleDateString(),
          totalIncome: 0,
          totalExpense: 0,
          netIncome: 0,
          incomeByCategory: {},
          expenseByCategory: {},
          dateGroups: {}
        });
      }
    }
  }, [transactions, selectedPeriod, selectedScope]);
  
  // Create account filter options
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      try {
        const accountOptions = accounts
          .filter(account => account && account.scope === selectedScope)
          .map(account => ({
            id: account.id,
            name: account.name || 'Unnamed Account',
            selected: true
          }));
        
        setFilterOptions(prev => ({
          ...prev,
          accounts: accountOptions
        }));
      } catch (error) {
        console.error('Error creating account filter options:', error);
        // Set empty array as fallback
        setFilterOptions(prev => ({
          ...prev,
          accounts: []
        }));
      }
    }
  }, [accounts, selectedScope]);
  
  // Create category filter options
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      try {
        const allCategories = new Set();
        
        transactions.forEach(transaction => {
          if (transaction && transaction.category) {
            allCategories.add(transaction.category);
          }
        });
        
        const categoryOptions = Array.from(allCategories).map(category => ({
          id: category,
          name: category.replace('_', ' '),
          selected: true
        }));
        
        setFilterOptions(prev => ({
          ...prev,
          categories: categoryOptions
        }));
      } catch (error) {
        console.error('Error creating category filter options:', error);
        // Set empty array as fallback
        setFilterOptions(prev => ({
          ...prev,
          categories: []
        }));
      }
    }
  }, [transactions]);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await Promise.all([
      // Reload accounts and transactions
    ]);
    setRefreshing(false);
  };
  
  // Generate report data based on the selected period
  const generateReport = () => {
    try {
      // Get start and end dates based on selected period
      const now = new Date();
      let startDate, endDate;
      
      switch (selectedPeriod) {
        case 'week':
          // Last 7 days
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          endDate = now;
          break;
        case 'month':
          // Current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          // Current quarter
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
          break;
        case 'year':
          // Current year
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      // Filter transactions based on date range and selected filters
      const filteredTransactions = transactions.filter(transaction => {
        try {
          if (!transaction || !transaction.date) {
            console.warn('Skipping transaction with missing date', transaction?.id);
            return false;
          }
          
          const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
          const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
          
          // Check if account is selected in filters
          const isAccountSelected = filterOptions.accounts.some(
            account => account && account.id === transaction.accountId && account.selected
          );
          
          // Check if category is selected in filters (if no categories are selected, show all)
          const isCategorySelected = !transaction.category || 
            filterOptions.categories.length === 0 || 
            filterOptions.categories.some(
              category => category && category.id === transaction.category && category.selected
            );
          
          return isInDateRange && isAccountSelected && isCategorySelected;
        } catch (error) {
          console.error('Error filtering transaction:', error, transaction);
          return false;
        }
      });
      
      // Calculate totals
      const totalIncome = filteredTransactions
        .filter(t => t && t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
      const totalExpense = filteredTransactions
        .filter(t => t && t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
      // Group by category
      const incomeByCategory = {};
      const expenseByCategory = {};
      
      filteredTransactions.forEach(transaction => {
        try {
          if (!transaction) {
            console.warn('Skipping undefined transaction in category grouping');
            return;
          }
          
          if (!transaction.type) {
            console.warn('Skipping transaction with missing type in category grouping', transaction.id);
            return;
          }
          
          // Parse amount safely
          const amount = parseFloat(transaction.amount) || 0;
          
          // Get category safely
          const category = transaction.category || 'Other';
          
          if (transaction.type === 'income') {
            incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
          } else if (transaction.type === 'expense') {
            expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
          } else {
            console.warn('Unknown transaction type:', transaction.type, 'for transaction', transaction.id);
          }
        } catch (error) {
          console.error('Error processing transaction for category grouping:', error, transaction?.id);
        }
      });
      
      // Group by date for trends
      const dateGroups = {};
      let dateFormat;
      
      switch (selectedPeriod) {
        case 'week':
          dateFormat = { day: '2-digit' };
          break;
        case 'month':
          dateFormat = { day: '2-digit' };
          break;
        case 'quarter':
          dateFormat = { month: 'short', day: '2-digit' };
          break;
        case 'year':
          dateFormat = { month: 'short' };
          break;
        default:
          dateFormat = { day: '2-digit' };
      }
      
      filteredTransactions.forEach(transaction => {
        try {
          if (!transaction || !transaction.date) {
            console.warn('Skipping transaction with missing date in date grouping', transaction?.id);
            return;
          }
          
          // Convert date safely
          let transactionDate;
          try {
            transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
            if (isNaN(transactionDate.getTime())) {
              console.warn('Invalid date for transaction', transaction.id);
              return;
            }
          } catch (dateError) {
            console.warn('Error converting date for transaction', transaction.id, dateError);
            return;
          }
          
          // Format date key safely
          let dateKey;
          try {
            dateKey = transactionDate.toLocaleDateString('en-US', dateFormat);
          } catch (formatError) {
            console.warn('Error formatting date for transaction', transaction.id, formatError);
            dateKey = 'Unknown Date';
          }
          
          if (!dateGroups[dateKey]) {
            dateGroups[dateKey] = { income: 0, expense: 0 };
          }
          
          // Parse amount safely
          const amount = parseFloat(transaction.amount) || 0;
          
          if (transaction.type === 'income') {
            dateGroups[dateKey].income += amount;
          } else if (transaction.type === 'expense') {
            dateGroups[dateKey].expense += amount;
          }
        } catch (error) {
          console.error('Error processing transaction for date group:', error, transaction?.id);
        }
      });
      
      // Set report data
      setReportData({
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory,
        dateGroups
      });
    } catch (error) {
      console.error('Error generating report:', error);
      // Set fallback data
      setReportData({
        startDate: new Date().toLocaleDateString(),
        endDate: new Date().toLocaleDateString(),
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        incomeByCategory: {},
        expenseByCategory: {},
        dateGroups: {}
      });
    }
  };
  
  // Toggle account filter
  const toggleAccountFilter = (accountId) => {
    try {
      if (!accountId) {
        console.warn('Attempted to toggle account filter with undefined accountId');
        return;
      }
      
      setFilterOptions(prev => ({
        ...prev,
        accounts: prev.accounts.map(account => 
          account && account.id === accountId 
            ? { ...account, selected: !account.selected } 
            : account
        )
      }));
    } catch (error) {
      console.error('Error toggling account filter:', error);
    }
  };
  
  // Toggle category filter
  const toggleCategoryFilter = (categoryId) => {
    try {
      if (!categoryId) {
        console.warn('Attempted to toggle category filter with undefined categoryId');
        return;
      }
      
      setFilterOptions(prev => ({
        ...prev,
        categories: prev.categories.map(category => 
          category && category.id === categoryId 
            ? { ...category, selected: !category.selected } 
            : category
        )
      }));
    } catch (error) {
      console.error('Error toggling category filter:', error);
    }
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    try {
      if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
        console.warn('Invalid amount passed to formatCurrency:', amount);
        amount = 0;
      }
      
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency,
        minimumFractionDigits: 2 
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '$0.00'; // Default fallback
    }
  };
  
  // Get scope label
  const getScopeLabel = (scope) => {
    switch (scope) {
      case FINANCE_SCOPE.PERSONAL:
        return 'Personal';
      case FINANCE_SCOPE.NUCLEAR:
        return 'Family';
      case FINANCE_SCOPE.EXTENDED:
        return 'Extended Family';
      default:
        return 'Personal';
    }
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Report Options */}
      <View style={styles.optionsContainer}>
        {/* Time Period Selector */}
        <Text style={styles.optionLabel}>Time Period</Text>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' }
          ]}
          style={styles.segmentedButtons}
        />
        
        {/* Scope Selector */}
        <Text style={styles.optionLabel}>Finance Scope</Text>
        <SegmentedButtons
          value={selectedScope}
          onValueChange={setSelectedScope}
          buttons={[
            { value: FINANCE_SCOPE.PERSONAL, label: 'Personal' },
            { value: FINANCE_SCOPE.NUCLEAR, label: 'Family' },
            { value: FINANCE_SCOPE.EXTENDED, label: 'Extended' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      {/* Loading indicator */}
      {isLoading && (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      )}
      
      {/* No data message */}
      {!isLoading && (!reportData || !transactions || transactions.length === 0) && (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="insert-chart" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No financial data available</Text>
          <Text style={styles.noDataSubText}>
            Add some transactions to generate reports
          </Text>
        </View>
      )}
      
      {/* Report Summary */}
      {!isLoading && reportData && (
        <>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.reportTitle}>
                Financial Summary ({getScopeLabel(selectedScope)})
              </Text>
              <Text style={styles.reportPeriod}>
                {reportData.startDate || 'N/A'} - {reportData.endDate || 'N/A'}
              </Text>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Income</Text>
                  <Text style={[styles.summaryValue, styles.incomeText]}>
                    {formatCurrency(reportData.totalIncome)}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Expenses</Text>
                  <Text style={[styles.summaryValue, styles.expenseText]}>
                    {formatCurrency(reportData.totalExpense)}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net</Text>
                  <Text style={[
                    styles.summaryValue, 
                    (reportData.netIncome >= 0) ? styles.incomeText : styles.expenseText
                  ]}>
                    {formatCurrency(reportData.netIncome)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* Charts - simplified to just the summary chart to fix errors */}
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Financial Summary</Text>
              <FinancialReportChart 
                data={{
                  startDate: reportData?.startDate || 'N/A',
                  endDate: reportData?.endDate || 'N/A',
                  totalIncome: reportData?.totalIncome || 0,
                  totalExpense: reportData?.totalExpense || 0,
                  netIncome: (reportData?.netIncome !== undefined) ? reportData.netIncome : 0,
                  incomeByCategory: reportData?.incomeByCategory || {},
                  expenseByCategory: reportData?.expenseByCategory || {}
                }}
                type="income-expense"
                currency={currentScope === FINANCE_SCOPE.PERSONAL ? 'GHS' : 'USD'}
              />
            </Card.Content>
          </Card>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              icon="share" 
              onPress={() => {
                Alert.alert('Coming Soon', 'Report sharing will be available soon.');
              }}
            >
              Share Report
            </Button>
            
            <Button 
              mode="outlined" 
              icon="file-download" 
              onPress={() => {
                Alert.alert('Coming Soon', 'Report downloading will be available soon.');
              }}
              style={styles.downloadButton}
            >
              Download PDF
            </Button>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  optionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#444',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  loader: {
    marginTop: 32,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noDataSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportPeriod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#E3F2FD',
  },
  noFilterText: {
    color: '#666',
    fontStyle: 'italic',
    padding: 8,
  },
  chartCard: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    padding: 16,
    marginBottom: 16,
  },
  downloadButton: {
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 24,
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ReportsScreen;
