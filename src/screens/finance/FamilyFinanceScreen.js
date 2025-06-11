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
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';
import AccountCard from '../../components/finance/AccountCard';
import FinancialReportChart from '../../components/finance/FinancialReportChart';
import ProjectContributionTracker from '../../components/finance/ProjectContributionTracker';
import currencyService from '../../services/currencyService';

const FamilyFinanceScreen = ({ navigation }) => {
  const { 
    accounts, 
    projects,
    isLoading,
    currentScope,
    changeScope
  } = useFinance();
  
  const { user } = useAuth();
  const { nuclearFamilyMembers } = useFamilySharing();
  
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [userCurrencySettings, setUserCurrencySettings] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('GHS');
  
  // Set scope to nuclear when component mounts
  useEffect(() => {
    if (currentScope !== FINANCE_SCOPE.NUCLEAR) {
      changeScope(FINANCE_SCOPE.NUCLEAR);
    }
  }, []);

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
  
  // Generate report data for the current month
  const generateReportData = async () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // In a real implementation, this would call a function from the FinanceContext
    // For now, we'll just create some sample data
    setReportData({
      startDate: firstDayOfMonth.toLocaleDateString(),
      endDate: lastDayOfMonth.toLocaleDateString(),
      totalIncome: 2500,
      totalExpense: 1800,
      netIncome: 700,
      incomeByCategory: {
        'Salary': 2000,
        'Investments': 300,
        'Other': 200
      },
      expenseByCategory: {
        'Housing': 800,
        'Food': 400,
        'Utilities': 300,
        'Entertainment': 200,
        'Other': 100
      }
    });
  };
  
  // Load report data when component mounts
  useEffect(() => {
    generateReportData();
  }, []);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await Promise.all([
      // Reload accounts and projects
      generateReportData()
    ]);
    setRefreshing(false);
  };
  
  // Navigate to account details
  const navigateToAccountDetails = (account) => {
    navigation.navigate('AccountDetails', { account });
  };
  
  // Navigate to all accounts
  const navigateToAllAccounts = () => {
    navigation.navigate('AccountsScreen', { scope: FINANCE_SCOPE.NUCLEAR });
  };
  
  // Navigate to all transactions
  const navigateToAllTransactions = () => {
    navigation.navigate('Transactions', { scope: FINANCE_SCOPE.NUCLEAR });
  };
  
  // Navigate to reports
  const navigateToReports = () => {
    navigation.navigate('Reports', { scope: FINANCE_SCOPE.NUCLEAR });
  };
  
  // Navigate to add account
  const navigateToAddAccount = () => {
    navigation.navigate('AddAccount', { scope: FINANCE_SCOPE.NUCLEAR });
  };
  
  // Navigate to project details
  const navigateToProjectDetails = (project) => {
    // Since ProjectDetails screen doesn't exist, we should show the project details
    // in a modal or alert for now
    Alert.alert(
      project.name,
      `Target: ${project.targetAmount}\nCurrent: ${project.currentAmount}\nStatus: ${project.status}`,
      [{ text: 'OK' }]
    );
  };
  
  // Navigate to add project
  const navigateToAddProject = () => {
    navigation.navigate('AddProject', { scope: FINANCE_SCOPE.NUCLEAR });
  };
  
  // Handle project contribution
  const handleContributeToProject = (project) => {
    navigation.navigate('ContributeToProject', { project });
  };
  
  // Format currency
  const formatCurrency = (amount, currency) => {
    return currencyService.formatCurrency(amount, currency || displayCurrency);
  };
  
  // Calculate total balance across all accounts in display currency
  const calculateTotalBalance = () => {
    const familyAccounts = accounts.filter(account => account.scope === FINANCE_SCOPE.NUCLEAR);
    return currencyService.getTotalBalanceInCurrency(familyAccounts, displayCurrency, userCurrencySettings);
  };
  
  // Filter projects for the nuclear family
  const familyProjects = projects.filter(project => project.scope === FINANCE_SCOPE.NUCLEAR);
  
  // Filter accounts for the nuclear family
  const familyAccounts = accounts.filter(account => account.scope === FINANCE_SCOPE.NUCLEAR);
  
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Family Finance Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Family Finance</Text>
        <Text style={styles.headerSubtitle}>
          {nuclearFamilyMembers.length} family members
        </Text>
      </View>
      
      {/* Balance Summary */}
      <View style={styles.balanceSummary}>
        <Text style={styles.balanceLabel}>Family Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(calculateTotalBalance(), displayCurrency)}
        </Text>
        {userCurrencySettings?.autoConvert && (
          <Text style={styles.currencyNote}>in {displayCurrency}</Text>
        )}
      </View>
      
      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToAddAccount}
        >
          <MaterialIcons name="account-balance" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>Add Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToAddProject}
        >
          <MaterialIcons name="add-task" size={24} color="#2196F3" />
          <Text style={styles.quickActionText}>Add Project</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={navigateToReports}
        >
          <MaterialIcons name="insert-chart" size={24} color="#FFC107" />
          <Text style={styles.quickActionText}>Reports</Text>
        </TouchableOpacity>
      </View>
      
      {/* Family Accounts Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Accounts</Text>
          <TouchableOpacity onPress={navigateToAllAccounts}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {familyAccounts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="account-balance-wallet" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No family accounts yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddAccount}
            >
              <Text style={styles.emptyStateButtonText}>Add Family Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          familyAccounts.slice(0, 3).map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => navigateToAccountDetails(account)}
            />
          ))
        )}
      </View>
      
      {/* Family Projects Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Projects</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FamilyProjectsScreen')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {familyProjects.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="assignment" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No family projects yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddProject}
            >
              <Text style={styles.emptyStateButtonText}>Create Family Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          familyProjects.slice(0, 2).map(project => (
            <ProjectContributionTracker
              key={project.id}
              project={project}
              onPress={() => navigateToProjectDetails(project)}
              onContribute={() => handleContributeToProject(project)}
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
      
      {/* Family Members Contributions */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Member Contributions</Text>
        </View>
        
        <View style={styles.membersContainer}>
          {nuclearFamilyMembers.map((member, index) => (
            <View key={member.id || index} style={styles.memberContributionCard}>
              <View style={styles.memberInfo}>
                <MaterialIcons name="person" size={24} color="#2196F3" />
                <Text style={styles.memberName}>{member.displayName || member.email}</Text>
              </View>
              <View style={styles.memberStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatCurrency(Math.random() * 1000)}
                  </Text>
                  <Text style={styles.statLabel}>Contributed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.floor(Math.random() * 10)}
                  </Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#3F51B5',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  balanceSummary: {
    backgroundColor: '#3F51B5',
    paddingBottom: 24,
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
  currencyNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
    backgroundColor: '#3F51B5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  membersContainer: {
    paddingHorizontal: 16,
  },
  memberContributionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default FamilyFinanceScreen;
