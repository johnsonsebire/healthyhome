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
import { useFamilySharing } from '../../contexts/FamilySharingContext';
import { useAuth } from '../../contexts/AuthContext';
import ProjectContributionTracker from '../../components/finance/ProjectContributionTracker';
import currencyService from '../../services/currencyService';

const ExtendedFamilyProjectsScreen = ({ navigation }) => {
  const { 
    projects = [],
    welfareAccounts = [],
    accounts = [],
    transactions = [],
    isLoading,
    currentScope,
    changeScope
  } = useFinance();
  
  const { user } = useAuth();
  const { extendedFamilyMembers = [] } = useFamilySharing();
  
  const [refreshing, setRefreshing] = useState(false);
  const [userCurrencySettings, setUserCurrencySettings] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('GHS');
  
  // Load user currency settings
  useEffect(() => {
    const loadCurrencySettings = async () => {
      if (user) {
        try {
          const settings = await currencyService.loadUserCurrencySettings(user.uid);
          setUserCurrencySettings(settings);
          setDisplayCurrency(settings?.displayCurrency || 'GHS');
        } catch (error) {
          console.error('Error loading currency settings:', error);
        }
      }
    };

    loadCurrencySettings();
  }, [user]);
  
  // Set scope to extended when component mounts
  useEffect(() => {
    if (currentScope !== FINANCE_SCOPE.EXTENDED) {
      changeScope(FINANCE_SCOPE.EXTENDED);
    }
  }, []);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Reload data
    await Promise.all([
      // Fetch updated data
    ]);
    setRefreshing(false);
  };
  
  // Calculate financial summary
  const calculateFinancialSummary = () => {
    // Filter accounts for extended family
    const extendedFamilyAccounts = accounts.filter(account => account.scope === FINANCE_SCOPE.EXTENDED);
    
    // Calculate total balance
    const totalBalance = currencyService.getTotalBalanceInCurrency(
      extendedFamilyAccounts, 
      displayCurrency, 
      userCurrencySettings
    );
    
    // Calculate total contributions
    const totalContributions = projects.reduce((sum, project) => {
      return sum + (project.currentAmount || 0);
    }, 0);
    
    // Calculate total welfare
    const totalWelfare = welfareAccounts.reduce((sum, account) => {
      return sum + (account.balance || 0);
    }, 0);
    
    return {
      totalBalance,
      totalContributions,
      totalWelfare,
      memberCount: (extendedFamilyMembers || []).length
    };
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
    navigation.navigate('AddProject', { scope: FINANCE_SCOPE.EXTENDED });
  };
  
  // Navigate to welfare account details
  const navigateToWelfareAccountDetails = (welfareAccount) => {
    navigation.navigate('WelfareAccountDetails', { welfareAccount });
  };
  
  // Navigate to add welfare account
  const navigateToAddWelfareAccount = () => {
    navigation.navigate('AddWelfareAccount');
  };
  
  // Handle project contribution
  const handleContributeToProject = (project) => {
    // Since ContributeToProject screen doesn't exist yet, we'll show an alert
    Alert.alert(
      `Contribute to ${project.name}`,
      'This feature is coming soon.',
      [{ text: 'OK' }]
    );
  };
  
  // Filter projects for the extended family
  const extendedProjects = (projects || []).filter(project => project.scope === FINANCE_SCOPE.EXTENDED);
  
  // Format currency
  const formatCurrency = (amount, currency = 'GHS') => {
    try {
      if (typeof currencyService !== 'undefined' && currencyService.formatCurrency) {
        return currencyService.formatCurrency(amount, currency);
      }
      // Fallback if currency service is not available
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency,
        minimumFractionDigits: 2 
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currency} ${amount}`;
    }
  };
  
  // Display alert for join requirements
  const showJoinRequirements = () => {
    Alert.alert(
      'Extended Family Projects',
      'To join extended family projects, you need to:\n\n1. Be a member of the extended family\n2. Be invited by the project creator\n3. Accept the terms of contribution',
      [{ text: 'OK', onPress: () => {} }]
    );
  };
  
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Extended Family Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Extended Family</Text>
        <Text style={styles.headerSubtitle}>
          {(extendedFamilyMembers || []).length} family members
        </Text>
        
        {/* Financial Summary Card */}
        <View style={styles.financialSummaryCard}>
          <Text style={styles.financialSummaryTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateFinancialSummary().totalBalance)}
              </Text>
              <Text style={styles.summaryLabel}>Total Balance</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateFinancialSummary().totalContributions)}
              </Text>
              <Text style={styles.summaryLabel}>Contributions</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateFinancialSummary().totalWelfare)}
              </Text>
              <Text style={styles.summaryLabel}>Welfare Funds</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={navigateToAddProject}
          >
            <MaterialIcons name="add-circle" size={16} color="white" />
            <Text style={styles.headerButtonText}>New Project</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={navigateToAddWelfareAccount}
          >
            <MaterialIcons name="favorite" size={16} color="white" />
            <Text style={styles.headerButtonText}>New Welfare</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Extended Family Projects Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Group Funding Projects</Text>
          <TouchableOpacity onPress={showJoinRequirements}>
            <MaterialIcons name="info-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {(extendedProjects || []).length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="groups" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No extended family projects yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddProject}
            >
              <Text style={styles.emptyStateButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          (extendedProjects || []).map(project => (
            <ProjectContributionTracker
              key={project.id}
              project={project}
              onPress={() => navigateToProjectDetails(project)}
              onContribute={() => handleContributeToProject(project)}
            />
          ))
        )}
      </View>
      
      {/* Welfare Accounts Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Welfare Accounts</Text>
        </View>
        
        {(welfareAccounts || []).length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="favorite" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No welfare accounts yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddWelfareAccount}
            >
              <Text style={styles.emptyStateButtonText}>Create Welfare Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          (welfareAccounts || []).map(welfareAccount => (
            <TouchableOpacity
              key={welfareAccount.id}
              style={styles.welfareCard}
              onPress={() => navigateToWelfareAccountDetails(welfareAccount)}
            >
              <View style={styles.welfareHeader}>
                <MaterialIcons name="favorite" size={24} color="#E91E63" />
                <Text style={styles.welfareName}>{welfareAccount.name}</Text>
              </View>
              
              <Text style={styles.welfareDescription}>
                {welfareAccount.description}
              </Text>
              
              <View style={styles.welfareStats}>
                <View style={styles.welfareStat}>
                  <Text style={styles.welfareStatValue}>
                    {welfareAccount.members?.length || 0}
                  </Text>
                  <Text style={styles.welfareStatLabel}>Members</Text>
                </View>
                
                <View style={styles.welfareStat}>
                  <Text style={styles.welfareStatValue}>
                    {formatCurrency(welfareAccount.monthlyContributionAmount || 0)}
                  </Text>
                  <Text style={styles.welfareStatLabel}>Monthly</Text>
                </View>
                
                <View style={styles.welfareStat}>
                  <Text style={styles.welfareStatValue}>
                    {formatCurrency(welfareAccount.balance || 0)}
                  </Text>
                  <Text style={styles.welfareStatLabel}>Balance</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.contributeButton}
                onPress={() => navigation.navigate('ContributeToWelfare', { welfareAccount })}
              >
                <MaterialIcons name="add-circle" size={16} color="white" />
                <Text style={styles.contributeButtonText}>Contribute</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      {/* Available Projects Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available to Join</Text>
        </View>
        
        {/* This would be populated with projects the user hasn't joined yet */}
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="search" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No available projects to join</Text>
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
    backgroundColor: '#673AB7',
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
  financialSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    elevation: 1,
  },
  financialSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  sectionContainer: {
    marginTop: 16,
    marginBottom: 8,
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
  emptyStateContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
    margin: 16,
    borderRadius: 8,
    elevation: 1,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#673AB7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  welfareCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1,
  },
  welfareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  welfareName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  welfareDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  welfareStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  welfareStat: {
    alignItems: 'center',
  },
  welfareStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  welfareStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  contributeButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ExtendedFamilyProjectsScreen;
