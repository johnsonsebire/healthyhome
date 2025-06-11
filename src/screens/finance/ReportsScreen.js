import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator
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
    if (transactions.length > 0) {
      generateReport();
    }
  }, [transactions, selectedPeriod, selectedScope]);
  
  // Create account filter options
  useEffect(() => {
    if (accounts.length > 0) {
      const accountOptions = accounts
        .filter(account => account.scope === selectedScope)
        .map(account => ({
          id: account.id,
          name: account.name,
          selected: true
        }));
      
      setFilterOptions(prev => ({
        ...prev,
        accounts: accountOptions
      }));
    }
  }, [accounts, selectedScope]);
  
  // Create category filter options
  useEffect(() => {
    if (transactions.length > 0) {
      const allCategories = new Set();
      
      transactions.forEach(transaction => {
        if (transaction.category) {
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
      const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
      
      // Check if account is selected in filters
      const isAccountSelected = filterOptions.accounts.some(
        account => account.id === transaction.accountId && account.selected
      );
      
      // Check if category is selected in filters (if no categories are selected, show all)
      const isCategorySelected = filterOptions.categories.length === 0 || 
        filterOptions.categories.some(
          category => category.id === transaction.category && category.selected
        );
      
      return isInDateRange && isAccountSelected && isCategorySelected;
    });
    
    // Calculate totals
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    // Group by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        const category = transaction.category || 'Other';
        incomeByCategory[category] = (incomeByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
      } else if (transaction.type === 'expense') {
        const category = transaction.category || 'Other';
        expenseByCategory[category] = (expenseByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
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
      const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      const dateKey = transactionDate.toLocaleDateString('en-US', dateFormat);
      
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = { income: 0, expense: 0 };
      }
      
      if (transaction.type === 'income') {
        dateGroups[dateKey].income += (parseFloat(transaction.amount) || 0);
      } else if (transaction.type === 'expense') {
        dateGroups[dateKey].expense += (parseFloat(transaction.amount) || 0);
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
  };
  
  // Toggle account filter
  const toggleAccountFilter = (accountId) => {
    setFilterOptions(prev => ({
      ...prev,
      accounts: prev.accounts.map(account => 
        account.id === accountId 
          ? { ...account, selected: !account.selected } 
          : account
      )
    }));
  };
  
  // Toggle category filter
  const toggleCategoryFilter = (categoryId) => {
    setFilterOptions(prev => ({
      ...prev,
      categories: prev.categories.map(category => 
        category.id === categoryId 
          ? { ...category, selected: !category.selected } 
          : category
      )
    }));
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
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
      {!isLoading && (!reportData || !transactions.length) && (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="insert-chart" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No financial data available</Text>
          <Text style={styles.noDataSubText}>
            Add some transactions to generate reports
          </Text>
        </View>
      )}
      
      {/* Report Summary */}
      {reportData && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.reportTitle}>
              Financial Summary ({getScopeLabel(selectedScope)})
            </Text>
            <Text style={styles.reportPeriod}>
              {reportData.startDate} - {reportData.endDate}
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
                  reportData.netIncome >= 0 ? styles.incomeText : styles.expenseText
                ]}>
                  {formatCurrency(reportData.netIncome)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
      
      {/* Filters */}
      {reportData && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Filters</Text>
          
          {/* Account filters */}
          <Text style={styles.filterLabel}>Accounts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {filterOptions.accounts.map(account => (
              <Chip
                key={account.id}
                selected={account.selected}
                onPress={() => toggleAccountFilter(account.id)}
                style={[styles.filterChip, account.selected ? styles.selectedChip : {}]}
                mode={account.selected ? 'flat' : 'outlined'}
                showSelectedCheck={true}
              >
                {account.name}
              </Chip>
            ))}
          </ScrollView>
          
          {/* Category filters */}
          <Text style={styles.filterLabel}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {filterOptions.categories.map(category => (
              <Chip
                key={category.id}
                selected={category.selected}
                onPress={() => toggleCategoryFilter(category.id)}
                style={[styles.filterChip, category.selected ? styles.selectedChip : {}]}
                mode={category.selected ? 'flat' : 'outlined'}
                showSelectedCheck={true}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Charts */}
      {reportData && (
        <>
          {/* Income vs Expenses Chart */}
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Income vs Expenses</Text>
              <FinancialReportChart 
                data={{
                  labels: ['Income', 'Expenses'],
                  datasets: [
                    {
                      data: [
                        reportData.totalIncome,
                        reportData.totalExpense
                      ]
                    }
                  ]
                }}
                colors={['#4CAF50', '#F44336']}
                type="bar"
              />
            </Card.Content>
          </Card>
          
          {/* Expense Breakdown Chart */}
          {Object.keys(reportData.expenseByCategory).length > 0 && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <Text style={styles.chartTitle}>Expense Breakdown</Text>
                <FinancialReportChart 
                  data={{
                    labels: Object.keys(reportData.expenseByCategory).map(
                      key => key.replace('_', ' ')
                    ),
                    datasets: [
                      {
                        data: Object.values(reportData.expenseByCategory)
                      }
                    ]
                  }}
                  type="pie"
                />
              </Card.Content>
            </Card>
          )}
          
          {/* Income Breakdown Chart */}
          {Object.keys(reportData.incomeByCategory).length > 0 && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <Text style={styles.chartTitle}>Income Breakdown</Text>
                <FinancialReportChart 
                  data={{
                    labels: Object.keys(reportData.incomeByCategory).map(
                      key => key.replace('_', ' ')
                    ),
                    datasets: [
                      {
                        data: Object.values(reportData.incomeByCategory)
                      }
                    ]
                  }}
                  type="pie"
                />
              </Card.Content>
            </Card>
          )}
          
          {/* Trends Chart */}
          {Object.keys(reportData.dateGroups).length > 0 && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <Text style={styles.chartTitle}>Trends</Text>
                <FinancialReportChart 
                  data={{
                    labels: Object.keys(reportData.dateGroups),
                    datasets: [
                      {
                        data: Object.values(reportData.dateGroups).map(group => group.income),
                        color: '#4CAF50'
                      },
                      {
                        data: Object.values(reportData.dateGroups).map(group => group.expense),
                        color: '#F44336'
                      }
                    ]
                  }}
                  colors={['#4CAF50', '#F44336']}
                  legend={['Income', 'Expenses']}
                  type="line"
                />
              </Card.Content>
            </Card>
          )}
        </>
      )}
      
      {/* Action Buttons */}
      {reportData && (
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            icon="share" 
            onPress={() => {
              // Implement share functionality
              Alert.alert('Coming Soon', 'Report sharing will be available soon.');
            }}
          >
            Share Report
          </Button>
          
          <Button 
            mode="outlined" 
            icon="file-download" 
            onPress={() => {
              // Implement download functionality
              Alert.alert('Coming Soon', 'Report downloading will be available soon.');
            }}
            style={styles.downloadButton}
          >
            Download PDF
          </Button>
        </View>
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
});

export default ReportsScreen;
