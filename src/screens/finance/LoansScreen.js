import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  RefreshControl,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Divider, Chip, SegmentedButtons, Card } from 'react-native-paper';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import LoanTracker from '../../components/finance/LoanTracker';

const LoansScreen = ({ navigation }) => {
  const { 
    loans, 
    isLoading, 
    currentScope, 
    changeScope
  } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScope, setSelectedScope] = useState(currentScope);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, paid, defaulted
  
  // Load data when scope changes
  useEffect(() => {
    if (selectedScope !== currentScope) {
      changeScope(selectedScope);
    }
  }, [selectedScope]);
  
  // Filter loans based on selected filter
  useEffect(() => {
    if (loans.length > 0) {
      let filtered = [...loans];
      
      if (filter !== 'all') {
        filtered = filtered.filter(loan => loan.status === filter);
      }
      
      // Sort by date (newest first)
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date();
        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date();
        return dateB - dateA;
      });
      
      setFilteredLoans(filtered);
    } else {
      setFilteredLoans([]);
    }
  }, [loans, filter]);
  
  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate('AddLoan')}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )
    });
  }, [navigation]);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await Promise.all([
      // Reload loans
    ]);
    setRefreshing(false);
  };
  
  // Navigate to loan details
  const navigateToLoanDetails = (loan) => {
    navigation.navigate('LoanDetails', { loan });
  };
  
  // Navigate to add loan
  const navigateToAddLoan = () => {
    navigation.navigate('AddLoan');
  };
  
  // Record loan payment
  const handleRecordPayment = (loan, payment) => {
    navigation.navigate('RecordLoanPayment', { loan, payment });
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };

  // Calculate loan summary metrics
  const calculateLoanSummary = () => {
    if (filteredLoans.length === 0) {
      return {
        totalLoans: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        activeLoans: 0,
        paidLoans: 0,
        defaultedLoans: 0,
        lentAmount: 0,
        borrowedAmount: 0
      };
    }

    let totalAmount = 0;
    let totalPaid = 0;
    let activeLoans = 0;
    let paidLoans = 0;
    let defaultedLoans = 0;
    let lentAmount = 0;
    let borrowedAmount = 0;

    filteredLoans.forEach(loan => {
      const loanAmount = parseFloat(loan.amount) || 0;
      totalAmount += loanAmount;

      // Calculate paid amount (support both new payments array and old schedule)
      let paidAmount = 0;
      if (loan.payments && Array.isArray(loan.payments)) {
        paidAmount = loan.totalPaid || loan.payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      } else if (loan.paymentSchedule) {
        paidAmount = loan.paymentSchedule
          .filter(payment => payment.status === 'paid')
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);
      }
      totalPaid += paidAmount;

      // Count by status
      switch (loan.status) {
        case 'active':
          activeLoans++;
          break;
        case 'paid':
          paidLoans++;
          break;
        case 'defaulted':
          defaultedLoans++;
          break;
      }

      // Count by type
      if (loan.isLent || loan.type === 'lent') {
        lentAmount += loanAmount;
      } else {
        borrowedAmount += loanAmount;
      }
    });

    return {
      totalLoans: filteredLoans.length,
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
      activeLoans,
      paidLoans,
      defaultedLoans,
      lentAmount,
      borrowedAmount
    };
  };

  const loanSummary = calculateLoanSummary();

  // Render loan summary card
  const renderLoanSummary = () => {
    // Only show summary if there are loans in the current scope (not filtered loans)
    if (loans.length === 0) return null;

    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>
            Loan Summary {filter !== 'all' ? `(${filter.charAt(0).toUpperCase() + filter.slice(1)})` : ''}
          </Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Loans</Text>
              <Text style={styles.summaryValue}>{loanSummary.totalLoans}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={[styles.summaryValue, styles.amountValue]}>
                {formatCurrency(loanSummary.totalAmount)}
              </Text>
            </View>
          </View>

          <Divider style={styles.horizontalDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {formatCurrency(loanSummary.totalPaid)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {formatCurrency(loanSummary.totalRemaining)}
              </Text>
            </View>
          </View>

          <Divider style={styles.horizontalDivider} />

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Chip icon="schedule" mode="flat" style={[styles.statusChip, { backgroundColor: '#E3F2FD' }]}>
                {loanSummary.activeLoans} Active
              </Chip>
            </View>
            <View style={styles.statusItem}>
              <Chip icon="check-circle" mode="flat" style={[styles.statusChip, { backgroundColor: '#E8F5E9' }]}>
                {loanSummary.paidLoans} Paid
              </Chip>
            </View>
            {loanSummary.defaultedLoans > 0 && (
              <View style={styles.statusItem}>
                <Chip icon="error" mode="flat" style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}>
                  {loanSummary.defaultedLoans} Defaulted
                </Chip>
              </View>
            )}
          </View>

          {(loanSummary.lentAmount > 0 || loanSummary.borrowedAmount > 0) && (
            <>
              <Divider style={styles.horizontalDivider} />
              <View style={styles.summaryRow}>
                {loanSummary.lentAmount > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Lent Out</Text>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                      {formatCurrency(loanSummary.lentAmount)}
                    </Text>
                  </View>
                )}
                {loanSummary.lentAmount > 0 && loanSummary.borrowedAmount > 0 && (
                  <View style={styles.summaryDivider} />
                )}
                {loanSummary.borrowedAmount > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Borrowed</Text>
                    <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                      {formatCurrency(loanSummary.borrowedAmount)}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="account-balance" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No loans found</Text>
      <Text style={styles.emptyStateDescription}>
        {isLoading ? 'Loading loans...' : 'You haven\'t added any loans yet'}
      </Text>
      {!isLoading && (
        <Button 
          mode="contained" 
          onPress={navigateToAddLoan}
          style={styles.addButton}
          icon="plus"
        >
          Add Loan
        </Button>
      )}
    </View>
  );
  
  // Render a loan item
  const renderLoanItem = ({ item }) => (
    <LoanTracker
      loan={item}
      onPress={() => navigateToLoanDetails(item)}
      onRecordPayment={(payment) => handleRecordPayment(item, payment)}
    />
  );
  
  // Render separator between items
  const renderSeparator = () => <View style={styles.separator} />;
  
  return (
    <View style={styles.container}>
      {/* Scope Selector */}
      <View style={styles.scopeSelector}>
        <SegmentedButtons
          value={selectedScope}
          onValueChange={setSelectedScope}
          buttons={[
            { value: FINANCE_SCOPE.PERSONAL, label: 'Personal' },
            { value: FINANCE_SCOPE.NUCLEAR, label: 'Family' },
            { value: FINANCE_SCOPE.EXTENDED, label: 'Extended' }
          ]}
        />
      </View>
      
      {/* Loan Summary */}
      {renderLoanSummary()}

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'all' && styles.activeFilter]} 
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All ({loans.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'active' && styles.activeFilter]} 
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.activeFilterText]}>
              Active ({loans.filter(l => l.status === 'active').length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'paid' && styles.activeFilter]} 
            onPress={() => setFilter('paid')}
          >
            <Text style={[styles.filterText, filter === 'paid' && styles.activeFilterText]}>
              Paid ({loans.filter(l => l.status === 'paid').length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'defaulted' && styles.activeFilter]} 
            onPress={() => setFilter('defaulted')}
          >
            <Text style={[styles.filterText, filter === 'defaulted' && styles.activeFilterText]}>
              Defaulted ({loans.filter(l => l.status === 'defaulted').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Loans List */}
      <FlatList
        data={filteredLoans}
        renderItem={renderLoanItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {/* Add Loan Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={navigateToAddLoan}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scopeSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    color: '#555',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  separator: {
    height: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#555',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statusChip: {
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
});

export default LoansScreen;
