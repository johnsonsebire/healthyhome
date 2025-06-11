import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, Divider, ActivityIndicator, Badge } from 'react-native-paper';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';

const WelfareAccountsScreen = ({ navigation }) => {
  const { 
    welfareAccounts,
    isLoading,
    error,
    currentScope,
    changeScope
  } = useFinance();
  
  const { extendedFamilyMembers } = useFamilySharing();
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Set scope to extended when component mounts
  useEffect(() => {
    if (currentScope !== FINANCE_SCOPE.EXTENDED) {
      changeScope(FINANCE_SCOPE.EXTENDED);
    }
  }, []);
  
  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={navigateToAddWelfareAccount}
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
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    setRefreshing(false);
  };
  
  // Navigate to welfare account details
  const navigateToWelfareAccountDetails = (welfareAccount) => {
    navigation.navigate('WelfareAccountDetails', { welfareAccount });
  };
  
  // Navigate to add welfare account
  const navigateToAddWelfareAccount = () => {
    navigation.navigate('AddWelfareAccount');
  };
  
  // Navigate to contribute to welfare
  const navigateToContributeToWelfare = (welfareAccount) => {
    navigation.navigate('ContributeToWelfare', { welfareAccount });
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Calculate contribution status
  const calculateContributionStatus = (welfareAccount) => {
    const activeMembers = welfareAccount.members.filter(m => m.status === 'active').length;
    const membersWithContribution = welfareAccount.members.filter(member => {
      if (!member.contributionHistory) return false;
      
      // Check if there's a contribution for the current month
      const currentMonth = new Date().toISOString().substring(0, 7); // Format: YYYY-MM
      return member.contributionHistory.some(c => c.month === currentMonth && c.paid);
    }).length;
    
    return {
      activeMembers,
      membersWithContribution,
      contributionRate: activeMembers > 0 ? Math.round((membersWithContribution / activeMembers) * 100) : 0
    };
  };
  
  // Render welfare account card
  const renderWelfareAccountCard = ({ item: welfareAccount }) => {
    const { activeMembers, membersWithContribution, contributionRate } = calculateContributionStatus(welfareAccount);
    
    return (
      <Card 
        style={styles.card}
        onPress={() => navigateToWelfareAccountDetails(welfareAccount)}
      >
        <Card.Title 
          title={welfareAccount.name}
          left={(props) => <MaterialIcons name="group" size={24} color="#6366f1" />}
          right={(props) => (
            <Badge style={styles.statusBadge}>
              {activeMembers} members
            </Badge>
          )}
        />
        <Card.Content>
          <Text style={styles.description}>{welfareAccount.description}</Text>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Monthly Contribution</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(welfareAccount.monthlyContributionAmount)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fund Balance</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(welfareAccount.balance)}
              </Text>
            </View>
          </View>
          
          <View style={styles.contributionStatusBar}>
            <View 
              style={[
                styles.contributionProgress, 
                {width: `${contributionRate}%`}
              ]} 
            />
          </View>
          
          <Text style={styles.contributionStatusText}>
            {membersWithContribution} of {activeMembers} members contributed this month ({contributionRate}%)
          </Text>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => navigateToWelfareAccountDetails(welfareAccount)}
          >
            View Details
          </Button>
          <Button 
            mode="contained" 
            onPress={() => navigateToContributeToWelfare(welfareAccount)}
          >
            Contribute
          </Button>
        </Card.Actions>
      </Card>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="group" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Welfare Accounts</Text>
      <Text style={styles.emptyStateMessage}>
        Create a welfare account to help extended family members in times of need.
      </Text>
      <Button 
        mode="contained" 
        onPress={navigateToAddWelfareAccount}
        style={styles.emptyStateButton}
      >
        Create Welfare Account
      </Button>
    </View>
  );
  
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading welfare accounts...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Family Welfare Accounts</Text>
        <Text style={styles.headerSubtitle}>
          Extended family financial safety net
        </Text>
      </View>
      
      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>What are Welfare Accounts?</Text>
          <Text style={styles.infoDescription}>
            Welfare accounts help extended family members in times of financial hardship,
            medical emergencies, education support, and other critical needs.
            Members contribute a fixed amount monthly to build the fund.
          </Text>
        </Card.Content>
      </Card>
      
      {/* Welfare Accounts List */}
      <FlatList
        data={welfareAccounts}
        keyExtractor={(item) => item.id}
        renderItem={renderWelfareAccountCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {/* Create Welfare Account Button */}
      {welfareAccounts.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={navigateToAddWelfareAccount}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  description: {
    color: '#666',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contributionStatusBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  contributionProgress: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  contributionStatusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusBadge: {
    backgroundColor: '#6366f1',
    marginRight: 16,
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
    marginBottom: 24,
  },
  emptyStateButton: {
    marginTop: 16,
    backgroundColor: '#6366f1',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#efefff',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  fab: {
    backgroundColor: '#6366f1',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});

export default WelfareAccountsScreen;
