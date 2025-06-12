import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Menu, Searchbar, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import TransactionList from '../../components/finance/TransactionList';
import currencyService from '../../services/currencyService';

const TransactionsScreen = ({ navigation, route }) => {
  const { transactions, accounts, isLoading, deleteTransaction } = useFinance();
  const { user } = useAuth();
  
  // Safely handle route params with proper null checks
  const scope = route?.params?.scope || FINANCE_SCOPE.PERSONAL;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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

  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      title: getScopeTitle(),
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSortMenu(true)}
          >
            <MaterialIcons name="sort" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, scope]);

  // Get scope title
  const getScopeTitle = () => {
    switch (scope) {
      case FINANCE_SCOPE.PERSONAL:
        return 'Personal Transactions';
      case FINANCE_SCOPE.NUCLEAR:
        return 'Family Transactions';
      case FINANCE_SCOPE.EXTENDED:
        return 'Extended Family Transactions';
      default:
        return 'All Transactions';
    }
  };

  // Filter accounts by scope
  const scopedAccounts = accounts.filter(account => 
    scope === 'all' ? true : account.scope === scope
  );

  // Get account IDs for the current scope
  const scopedAccountIds = scopedAccounts.map(account => account.id);

  // Filter transactions by scope (only transactions from accounts in current scope)
  const scopedTransactions = transactions.filter(transaction => 
    scopedAccountIds.includes(transaction.accountId)
  );

  // Apply filters to transactions
  const filteredTransactions = scopedTransactions.filter(transaction => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (transaction.description || '').toLowerCase().includes(searchLower) ||
      (transaction.category || '').toLowerCase().includes(searchLower) ||
      transaction.type.toLowerCase().includes(searchLower);
    
    // Type filter
    const matchesType = filterType === 'all' || transaction.type === filterType;

    // Category filter
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;

    // Account filter
    const matchesAccount = filterAccount === 'all' || transaction.accountId === filterAccount;

    // Date range filter
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      
      if (dateRange.start) {
        matchesDateRange = matchesDateRange && transactionDate >= dateRange.start;
      }
      
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        matchesDateRange = matchesDateRange && transactionDate <= endDate;
      }
    }

    return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesDateRange;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA; // Most recent first
      case 'amount':
        const amountA = currencyService.convertTransactionAmount(a, displayCurrency, userCurrencySettings);
        const amountB = currencyService.convertTransactionAmount(b, displayCurrency, userCurrencySettings);
        return amountB - amountA; // Highest amount first
      case 'type':
        return a.type.localeCompare(b.type);
      case 'category':
        return (a.category || '').localeCompare(b.category || '');
      default:
        return 0;
    }
  });

  // Get unique categories from transactions
  const categories = [...new Set(scopedTransactions.map(t => t.category).filter(Boolean))];

  // Calculate summary statistics
  const calculateSummary = () => {
    const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

    const totalIncome = incomeTransactions.reduce((sum, transaction) => {
      return sum + currencyService.convertTransactionAmount(transaction, displayCurrency, userCurrencySettings);
    }, 0);

    const totalExpense = expenseTransactions.reduce((sum, transaction) => {
      return sum + currencyService.convertTransactionAmount(transaction, displayCurrency, userCurrencySettings);
    }, 0);

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length
    };
  };

  const summary = calculateSummary();

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh currency rates
    await currencyService.refreshRates();
    setRefreshing(false);
  };

  // Navigate to transaction details
  const navigateToTransactionDetails = (transaction) => {
    navigation.navigate('TransactionDetails', { transaction });
  };

  // Navigate to add transaction
  const navigateToAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async (transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTransaction(transaction.id);
            if (success) {
              Alert.alert('Success', 'Transaction deleted successfully');
            }
          }
        }
      ]
    );
  };

  // Clear date range filter
  const clearDateFilter = () => {
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency for display
  const formatCurrency = (amount, currency) => {
    if (userCurrencySettings?.autoConvert && currency !== displayCurrency) {
      const convertedAmount = currencyService.convertCurrency(amount, currency, displayCurrency);
      return currencyService.formatCurrency(convertedAmount, displayCurrency);
    }
    return currencyService.formatCurrency(amount, currency);
  };

  // Render filter chips
  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterChipsContainer}
      contentContainerStyle={styles.filterChipsContent}
    >
      {/* Type Filter */}
      <Chip
        selected={filterType !== 'all'}
        onPress={() => setShowTypeMenu(true)}
        style={[styles.filterChip, filterType !== 'all' && styles.selectedChip]}
        textStyle={filterType !== 'all' ? styles.selectedChipText : styles.chipText}
        icon={filterType !== 'all' ? 'check' : 'filter-list'}
      >
        {filterType === 'all' ? 'All Types' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
      </Chip>

      {/* Account Filter */}
      <Chip
        selected={filterAccount !== 'all'}
        onPress={() => setShowAccountMenu(true)}
        style={[styles.filterChip, filterAccount !== 'all' && styles.selectedChip]}
        textStyle={filterAccount !== 'all' ? styles.selectedChipText : styles.chipText}
        icon={filterAccount !== 'all' ? 'check' : 'account-balance-wallet'}
      >
        {filterAccount === 'all' ? 'All Accounts' : 
         scopedAccounts.find(a => a.id === filterAccount)?.name || 'Account'}
      </Chip>

      {/* Category Filter */}
      {categories.length > 0 && (
        <Chip
          selected={filterCategory !== 'all'}
          onPress={() => setShowCategoryMenu(true)}
          style={[styles.filterChip, filterCategory !== 'all' && styles.selectedChip]}
          textStyle={filterCategory !== 'all' ? styles.selectedChipText : styles.chipText}
          icon={filterCategory !== 'all' ? 'check' : 'category'}
        >
          {filterCategory === 'all' ? 'All Categories' : 
           filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)}
        </Chip>
      )}

      {/* Date Filter */}
      <Chip
        selected={!!(dateRange.start || dateRange.end)}
        onPress={() => setShowDateFilter(true)}
        style={[styles.filterChip, (dateRange.start || dateRange.end) && styles.selectedChip]}
        textStyle={(dateRange.start || dateRange.end) ? styles.selectedChipText : styles.chipText}
        icon="date-range"
      >
        {dateRange.start || dateRange.end ? 'Date Range' : 'Filter Date'}
      </Chip>
    </ScrollView>
  );

  // Render summary card
  const renderSummary = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              {currencyService.formatCurrency(summary.totalIncome, displayCurrency)}
            </Text>
            <Text style={styles.summaryCount}>{summary.incomeCount} transactions</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              {currencyService.formatCurrency(summary.totalExpense, displayCurrency)}
            </Text>
            <Text style={styles.summaryCount}>{summary.expenseCount} transactions</Text>
          </View>
        </View>
        
        <Divider style={styles.summaryDividerHorizontal} />
        
        <View style={styles.netAmountContainer}>
          <Text style={styles.summaryLabel}>Net Amount</Text>
          <Text style={[
            styles.summaryValue, 
            styles.netAmount,
            { color: summary.netAmount >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {summary.netAmount >= 0 ? '+' : ''}
            {currencyService.formatCurrency(summary.netAmount, displayCurrency)}
          </Text>
        </View>
      </View>
    </Card>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="receipt-long" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Transactions Found</Text>
      <Text style={styles.emptyStateDescription}>
        {searchQuery || filterType !== 'all' || filterCategory !== 'all' || filterAccount !== 'all' || dateRange.start || dateRange.end
          ? 'Try adjusting your search or filters'
          : 'Start by adding your first transaction'
        }
      </Text>
      {!searchQuery && filterType === 'all' && filterCategory === 'all' && filterAccount === 'all' && !dateRange.start && !dateRange.end && (
        <Button
          mode="contained"
          onPress={navigateToAddTransaction}
          style={styles.emptyStateButton}
          icon="plus"
        >
          Add Transaction
        </Button>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sort Menu */}
      <Menu
        visible={showSortMenu}
        onDismiss={() => setShowSortMenu(false)}
        anchor={<View />}
        style={styles.menu}
      >
        <Menu.Item 
          title="Sort by Date" 
          onPress={() => { setSortBy('date'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'date' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Amount" 
          onPress={() => { setSortBy('amount'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'amount' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Type" 
          onPress={() => { setSortBy('type'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'type' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Category" 
          onPress={() => { setSortBy('category'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'category' ? 'check' : undefined}
        />
      </Menu>

      {/* Type Filter Menu */}
      <Menu
        visible={showTypeMenu}
        onDismiss={() => setShowTypeMenu(false)}
        anchor={<View />}
        style={styles.menu}
      >
        <Menu.Item 
          title="All Types" 
          onPress={() => { setFilterType('all'); setShowTypeMenu(false); }}
          leadingIcon={filterType === 'all' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Income" 
          onPress={() => { setFilterType('income'); setShowTypeMenu(false); }}
          leadingIcon={filterType === 'income' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Expense" 
          onPress={() => { setFilterType('expense'); setShowTypeMenu(false); }}
          leadingIcon={filterType === 'expense' ? 'check' : undefined}
        />
      </Menu>

      {/* Account Filter Menu */}
      <Menu
        visible={showAccountMenu}
        onDismiss={() => setShowAccountMenu(false)}
        anchor={<View />}
        style={styles.menu}
      >
        <Menu.Item 
          title="All Accounts" 
          onPress={() => { setFilterAccount('all'); setShowAccountMenu(false); }}
          leadingIcon={filterAccount === 'all' ? 'check' : undefined}
        />
        {scopedAccounts.map(account => (
          <Menu.Item 
            key={account.id}
            title={account.name} 
            onPress={() => { setFilterAccount(account.id); setShowAccountMenu(false); }}
            leadingIcon={filterAccount === account.id ? 'check' : undefined}
          />
        ))}
      </Menu>

      {/* Category Filter Menu */}
      <Menu
        visible={showCategoryMenu}
        onDismiss={() => setShowCategoryMenu(false)}
        anchor={<View />}
        style={styles.menu}
      >
        <Menu.Item 
          title="All Categories" 
          onPress={() => { setFilterCategory('all'); setShowCategoryMenu(false); }}
          leadingIcon={filterCategory === 'all' ? 'check' : undefined}
        />
        {categories.map(category => (
          <Menu.Item 
            key={category}
            title={category.charAt(0).toUpperCase() + category.slice(1)} 
            onPress={() => { setFilterCategory(category); setShowCategoryMenu(false); }}
            leadingIcon={filterCategory === category ? 'check' : undefined}
          />
        ))}
      </Menu>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        {sortedTransactions.length > 0 && renderSummary()}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search transactions..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#666"
            inputStyle={styles.searchInput}
          />
        </View>

        {/* Filter Chips */}
        {renderFilterChips()}

        {/* Active Filters Display */}
        {(dateRange.start || dateRange.end) && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            {(dateRange.start || dateRange.end) && (
              <View style={styles.activeFilterItem}>
                <Text style={styles.activeFilterText}>
                  Date: {dateRange.start ? formatDate(dateRange.start) : 'Any'} - {dateRange.end ? formatDate(dateRange.end) : 'Any'}
                </Text>
                <TouchableOpacity onPress={clearDateFilter}>
                  <MaterialIcons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Transactions List */}
        <View style={styles.transactionsList}>
          {sortedTransactions.length === 0 ? (
            renderEmptyState()
          ) : (
            <TransactionList
              transactions={sortedTransactions}
              onTransactionPress={navigateToTransactionDetails}
              onTransactionLongPress={handleDeleteTransaction}
              formatCurrency={formatCurrency}
              displayCurrency={displayCurrency}
              userCurrencySettings={userCurrencySettings}
            />
          )}
        </View>

        {/* Currency Conversion Note */}
        {userCurrencySettings?.autoConvert && (
          <View style={styles.conversionNote}>
            <MaterialIcons name="info" size={16} color="#666" />
            <Text style={styles.conversionText}>
              Amounts automatically converted to {displayCurrency}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Date Range Picker Modal */}
      {showDateFilter && (
        <View style={styles.dateFilterModal}>
          <Card style={styles.dateFilterCard}>
            <View style={styles.dateFilterHeader}>
              <Text style={styles.dateFilterTitle}>Filter by Date Range</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateFilterContent}>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.datePickerLabel}>Start Date</Text>
                <Text style={styles.datePickerValue}>
                  {dateRange.start ? formatDate(dateRange.start) : 'Select date'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerLabel}>End Date</Text>
                <Text style={styles.datePickerValue}>
                  {dateRange.end ? formatDate(dateRange.end) : 'Select date'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.dateFilterActions}>
                <Button
                  mode="outlined"
                  onPress={clearDateFilter}
                  style={styles.dateFilterButton}
                >
                  Clear
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setShowDateFilter(false)}
                  style={styles.dateFilterButton}
                >
                  Apply
                </Button>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={dateRange.start || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setDateRange(prev => ({ ...prev, start: selectedDate }));
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={dateRange.end || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setDateRange(prev => ({ ...prev, end: selectedDate }));
            }
          }}
        />
      )}

      {/* Floating Action Button */}
      {sortedTransactions.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToAddTransaction}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 12,
    padding: 4,
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  summaryContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  summaryDividerHorizontal: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  netAmountContainer: {
    alignItems: 'center',
  },
  netAmount: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  searchInput: {
    fontSize: 16,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChipsContent: {
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#fff',
  },
  selectedChip: {
    backgroundColor: '#2196F3',
  },
  chipText: {
    color: '#666',
  },
  selectedChipText: {
    color: '#fff',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  activeFiltersTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  activeFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#1976d2',
    marginRight: 8,
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
  },
  conversionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  conversionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  dateFilterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterCard: {
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  dateFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateFilterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateFilterContent: {
    padding: 16,
  },
  datePickerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    color: '#333',
  },
  dateFilterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dateFilterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default TransactionsScreen;
