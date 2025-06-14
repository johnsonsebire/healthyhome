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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Menu, Searchbar } from 'react-native-paper';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountCard from '../../components/finance/AccountCard';
import currencyService from '../../services/currencyService';

const AccountsScreen = ({ navigation, route }) => {
  const { accounts, isLoading, deleteAccount } = useFinance();
  const { user } = useAuth();
  
  // Safely handle route params with proper null checks
  const scope = route?.params?.scope || FINANCE_SCOPE.PERSONAL;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
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
            onPress={() => navigation.navigate('AddAccount', { scope })}
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
        return 'Personal Accounts';
      case FINANCE_SCOPE.NUCLEAR:
        return 'Family Accounts';
      case FINANCE_SCOPE.EXTENDED:
        return 'Extended Family Accounts';
      default:
        return 'All Accounts';
    }
  };

  // Filter accounts by scope
  const scopedAccounts = accounts.filter(account => 
    scope === 'all' ? true : account.scope === scope
  );

  // Filter and search accounts
  const filteredAccounts = scopedAccounts.filter(account => {
    // Search filter
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchesType = filterType === 'all' || account.type === filterType;

    return matchesSearch && matchesType;
  });

  // Sort accounts
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'balance':
        const balanceA = currencyService.convertAccountBalance(a, displayCurrency, userCurrencySettings);
        const balanceB = currencyService.convertAccountBalance(b, displayCurrency, userCurrencySettings);
        return balanceB - balanceA; // Highest balance first
      case 'type':
        return a.type.localeCompare(b.type);
      case 'recent':
        const dateA = a.updatedAt ? new Date(a.updatedAt.toDate ? a.updatedAt.toDate() : a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt.toDate ? b.updatedAt.toDate() : b.updatedAt) : new Date(0);
        return dateB - dateA; // Most recent first
      default:
        return 0;
    }
  });

  // Get unique account types for filter
  const accountTypes = [...new Set(scopedAccounts.map(account => account.type))];

  // Calculate total balance in display currency
  const totalBalance = currencyService.getTotalBalanceInCurrency(
    filteredAccounts, 
    displayCurrency, 
    userCurrencySettings
  );

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh currency rates
    await currencyService.refreshRates();
    setRefreshing(false);
  };

  // Navigate to account details
  const navigateToAccountDetails = (account) => {
    navigation.navigate('AccountDetails', { account });
  };

  // Navigate to add account
  const navigateToAddAccount = () => {
    navigation.navigate('AddAccount', { scope });
  };

  // Handle account deletion
  const handleDeleteAccount = async (account) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAccount(account.id);
            if (success) {
              Alert.alert('Success', 'Account deleted successfully');
            }
          }
        }
      ]
    );
  };

  // Format currency for display
  const formatCurrency = (amount, currency) => {
    if (userCurrencySettings?.autoConvert && currency !== displayCurrency) {
      const convertedAmount = currencyService.convertCurrency(amount, currency, displayCurrency);
      return currencyService.formatCurrency(convertedAmount, displayCurrency);
    }
    return currencyService.formatCurrency(amount, currency);
  };

  // Render account type filter chips
  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterChipsContainer}
      contentContainerStyle={styles.filterChipsContent}
    >
      <Chip
        selected={filterType === 'all'}
        onPress={() => setFilterType('all')}
        style={[styles.filterChip, filterType === 'all' && styles.selectedChip]}
        textStyle={filterType === 'all' ? styles.selectedChipText : styles.chipText}
      >
        All ({scopedAccounts.length})
      </Chip>
      {accountTypes.map(type => {
        const count = scopedAccounts.filter(acc => acc.type === type).length;
        return (
          <Chip
            key={type}
            selected={filterType === type}
            onPress={() => setFilterType(type)}
            style={[styles.filterChip, filterType === type && styles.selectedChip]}
            textStyle={filterType === type ? styles.selectedChipText : styles.chipText}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
          </Chip>
        );
      })}
    </ScrollView>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons name="wallet" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Accounts Found</Text>
      <Text style={styles.emptyStateDescription}>
        {searchQuery || filterType !== 'all' 
          ? 'Try adjusting your search or filters'
          : `Create your first ${scope === FINANCE_SCOPE.PERSONAL ? 'personal' : scope === FINANCE_SCOPE.NUCLEAR ? 'family' : 'extended family'} account to get started`
        }
      </Text>
      {!searchQuery && filterType === 'all' && (
        <Button
          mode="contained"
          onPress={navigateToAddAccount}
          style={styles.emptyStateButton}
          icon="plus"
        >
          Add Account
        </Button>
      )}
    </View>
  );

  // Render account summary
  const renderAccountSummary = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Accounts</Text>
          <Text style={styles.summaryValue}>{filteredAccounts.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={[styles.summaryValue, styles.balanceValue]}>
            {currencyService.formatCurrency(totalBalance, displayCurrency)}
          </Text>
          <Text style={styles.currencyNote}>in {displayCurrency}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Sort Menu */}
      <Menu
        visible={showSortMenu}
        onDismiss={() => setShowSortMenu(false)}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item 
          title="Sort by Name" 
          onPress={() => { setSortBy('name'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'name' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Balance" 
          onPress={() => { setSortBy('balance'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'balance' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Type" 
          onPress={() => { setSortBy('type'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'type' ? 'check' : undefined}
        />
        <Menu.Item 
          title="Sort by Recent" 
          onPress={() => { setSortBy('recent'); setShowSortMenu(false); }}
          leadingIcon={sortBy === 'recent' ? 'check' : undefined}
        />
      </Menu>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        {sortedAccounts.length > 0 && renderAccountSummary()}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search accounts..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#666"
            inputStyle={styles.searchInput}
          />
        </View>

        {/* Filter Chips */}
        {accountTypes.length > 0 && renderFilterChips()}

        {/* Accounts List */}
        <View style={styles.accountsList}>
          {sortedAccounts.length === 0 ? (
            renderEmptyState()
          ) : (
            sortedAccounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => navigateToAccountDetails(account)}
                onLongPress={() => handleDeleteAccount(account)}
                formatCurrency={formatCurrency}
                displayCurrency={displayCurrency}
                userCurrencySettings={userCurrencySettings}
              />
            ))
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

      {/* Floating Action Button */}
      {sortedAccounts.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToAddAccount}
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
    flexDirection: 'row',
    padding: 16,
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
  balanceValue: {
    color: '#2196F3',
  },
  currencyNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  accountsList: {
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

export default AccountsScreen;
