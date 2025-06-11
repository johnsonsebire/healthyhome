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
import { 
  Button, 
  Card, 
  Divider, 
  Avatar, 
  DataTable, 
  ProgressBar,
  Dialog, 
  Portal,
  TextInput,
  Chip,
  FAB
} from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';

const WelfareAccountDetailsScreen = ({ route, navigation }) => {
  const { welfareAccount } = route.params;
  const { user } = useAuth();
  const { contributeToWelfare } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  
  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      title: welfareAccount.name,
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={showMenu}
        >
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      )
    });
  }, [navigation, welfareAccount]);
  
  // Show context menu
  const showMenu = () => {
    Alert.alert(
      'Welfare Account Options',
      null,
      [
        { 
          text: 'Edit Account', 
          onPress: () => navigation.navigate('EditWelfareAccount', { welfareAccount }) 
        },
        { 
          text: 'Add Member', 
          onPress: () => navigation.navigate('AddWelfareMember', { welfareAccount }) 
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    setRefreshing(false);
  };
  
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
  
  // Calculate contribution status
  const calculateContributionStatus = () => {
    const activeMembers = welfareAccount.members.filter(m => m.status === 'active').length;
    
    // Get current month in YYYY-MM format
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const membersWithContribution = welfareAccount.members.filter(member => {
      if (!member.contributionHistory) return false;
      return member.contributionHistory.some(c => c.month === currentMonth && c.paid);
    }).length;
    
    // Get user's contribution status
    const currentUser = welfareAccount.members.find(m => m.userId === user.uid);
    const userContributedThisMonth = currentUser && currentUser.contributionHistory && 
      currentUser.contributionHistory.some(c => c.month === currentMonth && c.paid);
    
    return {
      activeMembers,
      membersWithContribution,
      contributionRate: activeMembers > 0 ? Math.round((membersWithContribution / activeMembers) * 100) : 0,
      userContributedThisMonth
    };
  };
  
  // Check if user is a member
  const userIsMember = welfareAccount.members.some(m => m.userId === user.uid);
  
  // Calculate welfare statistics
  const { activeMembers, membersWithContribution, contributionRate, userContributedThisMonth } = calculateContributionStatus();
  
  // Calculate expected monthly total
  const expectedMonthlyTotal = activeMembers * welfareAccount.monthlyContributionAmount;
  
  // Contribute to welfare
  const handleContribute = async () => {
    // Get current month in YYYY-MM format
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid contribution amount.');
      return;
    }
    
    const amount = parseFloat(contributionAmount);
    
    // Confirm contribution
    Alert.alert(
      'Confirm Contribution',
      `Are you sure you want to contribute ${formatCurrency(amount)} to the ${welfareAccount.name} welfare account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contribute',
          onPress: async () => {
            setIsContributing(true);
            try {
              await contributeToWelfare(welfareAccount.id, user.uid, amount, currentMonth);
              setContributionModalVisible(false);
              setContributionAmount('');
              Alert.alert('Success', 'Your contribution has been recorded.');
              // Refresh data
              onRefresh();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to record contribution.');
            } finally {
              setIsContributing(false);
            }
          }
        }
      ]
    );
  };
  
  // Navigate to welfare contribution history
  const navigateToContributionHistory = () => {
    navigation.navigate('WelfareContributionHistory', { welfareAccount });
  };
  
  // Navigate to contribute to welfare
  const navigateToContributeToWelfare = () => {
    navigation.navigate('ContributeToWelfare', { welfareAccount });
  };
  
  // Render member list item
  const renderMemberItem = ({ item: member, index }) => {
    // Current month in YYYY-MM format
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Check if member has contributed this month
    const hasContributed = member.contributionHistory && 
      member.contributionHistory.some(c => c.month === currentMonth && c.paid);
    
    // Get contribution amount for this month
    const contribution = member.contributionHistory && 
      member.contributionHistory.find(c => c.month === currentMonth && c.paid);
    
    return (
      <DataTable.Row>
        <DataTable.Cell>
          <View style={styles.memberNameContainer}>
            <Avatar.Text 
              size={24} 
              label={member.name ? member.name.substring(0, 2).toUpperCase() : 'XX'} 
              backgroundColor={hasContributed ? '#4caf50' : '#e0e0e0'}
              color={hasContributed ? '#fff' : '#333'}
            />
            <Text style={styles.memberName}>{member.name || `Member ${index + 1}`}</Text>
          </View>
        </DataTable.Cell>
        <DataTable.Cell numeric>
          {hasContributed ? (
            <Chip mode="outlined" textStyle={{ color: '#4caf50' }} style={styles.contributedChip}>
              {formatCurrency(contribution.amount)}
            </Chip>
          ) : (
            <Chip mode="outlined" textStyle={{ color: '#f44336' }} style={styles.pendingChip}>
              Pending
            </Chip>
          )}
        </DataTable.Cell>
        <DataTable.Cell numeric>
          {member.status === 'active' ? (
            <Chip mode="flat" style={styles.activeChip}>Active</Chip>
          ) : (
            <Chip mode="flat" style={styles.inactiveChip}>Inactive</Chip>
          )}
        </DataTable.Cell>
      </DataTable.Row>
    );
  };
  
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welfare Account Summary Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Account Summary</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={styles.summaryValue}>{formatCurrency(welfareAccount.balance)}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Monthly Contribution</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(welfareAccount.monthlyContributionAmount)}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Active Members</Text>
                <Text style={styles.summaryValue}>{activeMembers}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expected Monthly</Text>
                <Text style={styles.summaryValue}>{formatCurrency(expectedMonthlyTotal)}</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.contributionStatusTitle}>
              Monthly Contribution Status ({membersWithContribution} of {activeMembers} members)
            </Text>
            
            <ProgressBar 
              progress={contributionRate / 100} 
              color="#6366f1" 
              style={styles.progressBar}
            />
            
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>
                {contributionRate}% complete for this month
              </Text>
              
              {userIsMember && (
                <Chip 
                  mode="outlined" 
                  style={userContributedThisMonth ? styles.contributedChip : styles.pendingChip}
                  textStyle={{ color: userContributedThisMonth ? '#4caf50' : '#f44336' }}
                >
                  {userContributedThisMonth ? 'You contributed' : 'Your contribution pending'}
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>
        
        {/* Welfare Account Description Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>About This Welfare Account</Text>
            <Text style={styles.description}>{welfareAccount.description}</Text>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Created By</Text>
                <Text style={styles.detailValue}>
                  {welfareAccount.createdByName || 'Family Member'}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Created On</Text>
                <Text style={styles.detailValue}>
                  {formatDate(welfareAccount.createdAt)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Members List Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Members</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddWelfareMember', { welfareAccount })}>
                <MaterialIcons name="person-add" size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>
            
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Name</DataTable.Title>
                <DataTable.Title numeric>Contribution</DataTable.Title>
                <DataTable.Title numeric>Status</DataTable.Title>
              </DataTable.Header>
              
              {welfareAccount.members.map((member, index) => (
                renderMemberItem({ item: member, index })
              ))}
            </DataTable>
            
            <Button 
              mode="outlined" 
              onPress={navigateToContributionHistory}
              style={styles.viewHistoryButton}
            >
              View Contribution History
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Contribute FAB */}
      {userIsMember && !userContributedThisMonth && (
        <FAB
          style={styles.fab}
          icon="cash-plus"
          label="Contribute"
          onPress={() => setContributionModalVisible(true)}
        />
      )}
      
      {/* Contribution Modal */}
      <Portal>
        <Dialog
          visible={contributionModalVisible}
          onDismiss={() => setContributionModalVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Make Contribution</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Monthly contribution amount: {formatCurrency(welfareAccount.monthlyContributionAmount)}
            </Text>
            <TextInput
              label="Contribution Amount"
              value={contributionAmount}
              onChangeText={setContributionAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.textInput}
              disabled={isContributing}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setContributionModalVisible(false)}>Cancel</Button>
            <Button onPress={handleContribute} loading={isContributing}>Contribute</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  divider: {
    marginVertical: 16,
  },
  contributionStatusTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  contributedChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4caf50',
  },
  pendingChip: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#f44336',
  },
  activeChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  inactiveChip: {
    backgroundColor: 'rgba(158, 158, 158, 0.1)',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  viewHistoryButton: {
    marginTop: 16,
    borderColor: '#6366f1',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  dialogText: {
    marginBottom: 16,
    fontSize: 14,
    color: '#666',
  },
  textInput: {
    marginBottom: 8,
  },
});

export default WelfareAccountDetailsScreen;
