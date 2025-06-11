import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  FlatList
} from 'react-native';
import { 
  Button, 
  Card, 
  Divider, 
  DataTable, 
  Chip,
  List,
  Searchbar
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';

const WelfareContributionHistoryScreen = ({ route, navigation }) => {
  const { welfareAccount } = route.params;
  const { user } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContributions, setFilteredContributions] = useState([]);
  
  // Prepare the data for display
  const prepareContributionData = () => {
    // Flatten the contribution history for all members
    const allContributions = [];
    
    welfareAccount.members.forEach(member => {
      if (!member.contributionHistory) return;
      
      member.contributionHistory.forEach(contribution => {
        if (contribution.paid) {
          allContributions.push({
            userId: member.userId,
            memberName: member.name || 'Unknown Member',
            ...contribution
          });
        }
      });
    });
    
    // Sort by date (newest first)
    allContributions.sort((a, b) => {
      const dateA = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : new Date();
      const dateB = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : new Date();
      return dateB - dateA;
    });
    
    return allContributions;
  };
  
  // Get all contributions
  const allContributions = prepareContributionData();
  
  // Get unique months
  const getUniqueMonths = () => {
    const months = new Set();
    allContributions.forEach(contribution => {
      months.add(contribution.month);
    });
    
    // Convert to array and sort in descending order
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };
  
  const uniqueMonths = getUniqueMonths();
  
  // Update filtered contributions
  useEffect(() => {
    let filtered = [...allContributions];
    
    // Filter by month if selected
    if (selectedMonth) {
      filtered = filtered.filter(c => c.month === selectedMonth);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.memberName.toLowerCase().includes(query) ||
        formatMonth(c.month).toLowerCase().includes(query)
      );
    }
    
    setFilteredContributions(filtered);
  }, [selectedMonth, searchQuery, allContributions]);
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format month
  const formatMonth = (month) => {
    if (!month) return 'N/A';
    
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    setRefreshing(false);
  };
  
  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      title: 'Contribution History'
    });
  }, [navigation]);
  
  // Render month filter
  const renderMonthFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.monthFilterContainer}
    >
      <Chip
        mode={selectedMonth === '' ? 'flat' : 'outlined'}
        style={selectedMonth === '' ? styles.selectedMonthChip : styles.monthChip}
        onPress={() => setSelectedMonth('')}
      >
        All Months
      </Chip>
      
      {uniqueMonths.map((month) => (
        <Chip
          key={month}
          mode={selectedMonth === month ? 'flat' : 'outlined'}
          style={selectedMonth === month ? styles.selectedMonthChip : styles.monthChip}
          onPress={() => setSelectedMonth(month)}
        >
          {formatMonth(month)}
        </Chip>
      ))}
    </ScrollView>
  );
  
  // Render contribution item
  const renderContributionItem = ({ item }) => {
    const isCurrentUser = item.userId === user.uid;
    
    return (
      <Card 
        style={[styles.contributionCard, isCurrentUser && styles.currentUserCard]}
        mode="outlined"
      >
        <Card.Content>
          <View style={styles.contributionHeader}>
            <View>
              <Text style={styles.memberName}>
                {item.memberName} {isCurrentUser ? '(You)' : ''}
              </Text>
              <Text style={styles.contributionMonth}>{formatMonth(item.month)}</Text>
            </View>
            <Text style={styles.contributionAmount}>{formatCurrency(item.amount)}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.contributionDate}>
            Contributed on {formatDate(item.date)}
          </Text>
        </Card.Content>
      </Card>
    );
  };
  
  // Calculate total contributions
  const calculateTotals = () => {
    const totalAmount = filteredContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    const totalContributions = filteredContributions.length;
    
    return { totalAmount, totalContributions };
  };
  
  const { totalAmount, totalContributions } = calculateTotals();
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="history" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Contributions Found</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery || selectedMonth ? 
          'Try adjusting your filters to see more results.' : 
          'No contributions have been made to this welfare account yet.'}
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <Searchbar
        placeholder="Search contributions..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {/* Month filter */}
      {renderMonthFilter()}
      
      {/* Summary card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Contributions</Text>
              <Text style={styles.summaryValue}>{totalContributions}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Contributions list */}
      <FlatList
        data={filteredContributions}
        keyExtractor={(item, index) => `${item.userId}-${item.month}-${index}`}
        renderItem={renderContributionItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  monthFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  monthChip: {
    marginRight: 8,
    backgroundColor: '#fff',
  },
  selectedMonthChip: {
    marginRight: 8,
    backgroundColor: '#6366f1',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  contributionCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  currentUserCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contributionMonth: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contributionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  divider: {
    marginVertical: 8,
  },
  contributionDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default WelfareContributionHistoryScreen;
