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
import { Button, Divider, Chip, SegmentedButtons } from 'react-native-paper';
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
      
      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
      >
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'all' && styles.activeFilter]} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'active' && styles.activeFilter]} 
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.activeFilterText]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'paid' && styles.activeFilter]} 
          onPress={() => setFilter('paid')}
        >
          <Text style={[styles.filterText, filter === 'paid' && styles.activeFilterText]}>
            Paid
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'defaulted' && styles.activeFilter]} 
          onPress={() => setFilter('defaulted')}
        >
          <Text style={[styles.filterText, filter === 'defaulted' && styles.activeFilterText]}>
            Defaulted
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    height: 32,
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
});

export default LoansScreen;
