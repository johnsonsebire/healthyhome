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
    accounts = [], 
    projects = [],
    transactions = [],
    isLoading,
    currentScope,
    changeScope,
    recalculateAllAccountBalances
  } = useFinance();
  
  const { user } = useAuth();
  const { nuclearFamilyMembers = [] } = useFamilySharing();
  
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

  // Automatically load transactions and recalculate balances when screen loads or scope changes
  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        // Make sure we have the latest transactions
        if (accounts.length > 0) {
          // Recalculate all account balances to ensure accuracy
          await recalculateAllAccountBalances();
        }
      } catch (error) {
        console.error('Error loading finance data:', error);
      }
    };
    
    loadFinanceData();
  }, [currentScope, accounts.length]);

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
    if (!accounts || accounts.length === 0) {
      setReportData(null);
      return;
    }
    
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get family accounts
      const familyAccounts = accounts.filter(account => account.scope === FINANCE_SCOPE.NUCLEAR);
      
      if (familyAccounts.length === 0) {
        setReportData(null);
        return;
      }
      
      // Calculate total balance
      const totalBalance = currencyService.getTotalBalanceInCurrency(
        familyAccounts, 
        displayCurrency, 
        userCurrencySettings
      );
      
      // Get transactions from family accounts
      const familyTransactions = transactions.filter(
        transaction => familyAccounts.some(account => account.id === transaction.accountId)
      );
      
      // Filter transactions for the current month
      const monthTransactions = familyTransactions.filter(transaction => {
        try {
          if (!transaction || !transaction.date) return false;
          
          const transactionDate = transaction.date.toDate 
            ? transaction.date.toDate() 
            : new Date(transaction.date);
            
          return transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
        } catch (err) {
          console.error('Error filtering transaction by date:', err);
          return false;
        }
      });
      
      // Calculate income and expenses
      const totalIncome = monthTransactions
        .filter(t => t && t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
      const totalExpense = monthTransactions
        .filter(t => t && t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
      // Group by category
      const incomeByCategory = {};
      const expenseByCategory = {};
      
      monthTransactions.forEach(transaction => {
        if (!transaction) return;
        
        if (transaction.type === 'income') {
          const category = transaction.category || 'Other';
          incomeByCategory[category] = (incomeByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
        } else if (transaction.type === 'expense') {
          const category = transaction.category || 'Other';
          expenseByCategory[category] = (expenseByCategory[category] || 0) + (parseFloat(transaction.amount) || 0);
        }
      });
      
      setReportData({
        startDate: firstDayOfMonth.toLocaleDateString(),
        endDate: lastDayOfMonth.toLocaleDateString(),
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory,
        totalBalance
      });
    } catch (err) {
      console.error('Error generating report data:', err);
      setReportData(null);
    }
  };
  
  // Load report data when component mounts
  useEffect(() => {
    generateReportData();
  }, []);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Recalculate all account balances for accuracy
      await recalculateAllAccountBalances();
      
      // Reload data and reports
      await generateReportData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Navigate to account details
  const navigateToAccountDetails = (account) => {
    navigation.navigate('AccountDetails', { account });
  };
  
  // Navigate to all accounts
  const navigateToAllAccounts = () => {
    navigation.navigate('Accounts', { scope: FINANCE_SCOPE.NUCLEAR });
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
    try {
      return currencyService.formatCurrency(amount, currency || displayCurrency);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currency || displayCurrency} ${amount}`;
    }
  };
  
  // Calculate total balance across all accounts in display currency
  const calculateTotalBalance = () => {
    try {
      const familyAccounts = (accounts || []).filter(account => account.scope === FINANCE_SCOPE.NUCLEAR);
      return currencyService.getTotalBalanceInCurrency(familyAccounts, displayCurrency, userCurrencySettings) || 0;
    } catch (error) {
      console.error('Error calculating total balance:', error);
      return 0;
    }
  };
  
  // Filter projects for the nuclear family
  const familyProjects = (projects || []).filter(project => project.scope === FINANCE_SCOPE.NUCLEAR);
  
  // Filter accounts for the nuclear family
  const familyAccounts = (accounts || []).filter(account => account.scope === FINANCE_SCOPE.NUCLEAR);
  
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
          {(nuclearFamilyMembers || []).length} family members
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
        
        {(familyAccounts || []).length === 0 ? (
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
          (familyAccounts || []).slice(0, 3).map(account => (
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
        
        {(familyProjects || []).length === 0 ? (
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
          (familyProjects || []).slice(0, 2).map(project => (
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
      {familyProjects.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Member Contributions</Text>
          </View>
          
          <View style={styles.membersContainer}>
            {(nuclearFamilyMembers || []).map((member, index) => {
              // Find contributions from this member across all projects
              const memberContributions = familyProjects.reduce((total, project) => {
                const contributor = project.contributors?.find(c => c.userId === member.id);
                return total + (contributor?.contributionAmount || 0);
              }, 0);
              
              // Count transactions
              const transactionCount = familyProjects.reduce((count, project) => {
                const contributor = project.contributors?.find(c => c.userId === member.id);
                return contributor?.lastContribution ? count + 1 : count;
              }, 0);
              
              // Only show members who have made contributions or if there are no contributions yet
              if (memberContributions > 0 || transactionCount > 0 || familyProjects.some(p => p.contributors?.some(c => c.userId === member.id))) {
                return (
                  <View key={member.id || index} style={styles.memberContributionCard}>
                    <View style={styles.memberInfo}>
                      <MaterialIcons name="person" size={24} color="#2196F3" />
                      <Text style={styles.memberName}>{member.name || member.displayName || member.email}</Text>
                    </View>
                    <View style={styles.memberStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatCurrency(memberContributions)}
                        </Text>
                        <Text style={styles.statLabel}>Contributed</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {transactionCount}
                        </Text>
                        <Text style={styles.statLabel}>Transactions</Text>
                      </View>
                    </View>
                  </View>
                );
              }
              return null;
            }).filter(Boolean)}
            
            {/* If no members have contributed yet, show a message */}
            {(nuclearFamilyMembers || []).length > 0 && 
             !nuclearFamilyMembers.some(member => 
               familyProjects.some(p => p.contributors?.some(c => c.userId === member.id))
             ) && (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="people" size={36} color="#ccc" />
                <Text style={styles.emptyStateText}>No contributions yet</Text>
              </View>
            )}
          </View>
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
