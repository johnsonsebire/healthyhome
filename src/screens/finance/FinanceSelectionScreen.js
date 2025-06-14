import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { useFinance } from '../../contexts/FinanceContext';

const { width } = Dimensions.get('window');

const FinanceSelectionScreen = ({ navigation }) => {
  const { recalculateAllAccountBalances } = useFinance();
  
  // Automatically recalculate balances when finance module is opened
  useEffect(() => {
    const initializeFinanceData = async () => {
      try {
        // Ensure all account balances are accurate upon entering the finance module
        await recalculateAllAccountBalances();
        console.log('Finance data initialized and account balances recalculated');
      } catch (error) {
        console.error('Error initializing finance data:', error);
      }
    };
    
    initializeFinanceData();
  }, []);
  
  const financeOptions = [
    {
      id: 'personal',
      title: 'Personal Finance',
      description: 'Manage your personal accounts, transactions, and financial goals',
      icon: 'person',
      color: '#2196F3',
      route: 'PersonalFinance',
      features: ['Personal Accounts', 'Personal Transactions', 'Personal Reports', 'Personal Loans']
    },
    {
      id: 'family',
      title: 'Family Finance',
      description: 'Manage your nuclear family\'s shared finances and projects',
      icon: 'family-restroom',
      color: '#4CAF50',
      route: 'FamilyFinance',
      features: ['Family Accounts', 'Shared Projects', 'Family Reports', 'Joint Expenses']
    },
    {
      id: 'extended',
      title: 'Extended Family Finance',
      description: 'Manage extended family projects and group financial goals',
      icon: 'groups',
      color: '#FF9800',
      route: 'ExtendedFamilyProjects',
      features: ['Group Projects', 'Extended Family Contributions', 'Collective Goals', 'Group Reports']
    }
  ];

  const handleFinanceOptionPress = (option) => {
    navigation.navigate(option.route);
  };

  const renderFinanceOption = (option) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionContainer}
      onPress={() => handleFinanceOptionPress(option)}
      activeOpacity={0.7}
    >
      <Card style={[styles.optionCard, { borderLeftColor: option.color }]}>
        <View style={styles.cardContent}>
          {/* Header Section */}
          <View style={styles.optionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
              <MaterialIcons 
                name={option.icon} 
                size={32} 
                color={option.color} 
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <MaterialIcons 
              name="arrow-forward-ios" 
              size={20} 
              color="#666" 
            />
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Key Features:</Text>
            <View style={styles.featuresGrid}>
              {option.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color={option.color} 
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finance Management</Text>
        <Text style={styles.headerSubtitle}>
          Choose the finance area you want to manage
        </Text>
      </View>

      {/* Finance Options */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {financeOptions.map(renderFinanceOption)}
        
        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('AddTransaction')}
            >
              <MaterialIcons name="add-circle" size={24} color="#2196F3" />
              <Text style={styles.quickActionText}>Add Transaction</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('AddAccount')}
            >
              <MaterialIcons name="account-balance" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Add Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Reports')}
            >
              <MaterialIcons name="insert-chart" size={24} color="#FF9800" />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Loans')}
            >
              <MaterialIcons name="monetization-on" size={24} color="#9C27B0" />
              <Text style={styles.quickActionText}>Manage Loans</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  optionContainer: {
    marginBottom: 16,
  },
  optionCard: {
    elevation: 3,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
    paddingRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  quickActionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default FinanceSelectionScreen;
