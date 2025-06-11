import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Button, 
  TextInput, 
  HelperText, 
  Divider, 
  Card,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';

const ContributeToWelfareScreen = ({ route, navigation }) => {
  const { welfareAccount } = route.params;
  const { user } = useAuth();
  const { contributeToWelfare } = useFinance();
  
  // Form state
  const [amount, setAmount] = useState(welfareAccount.monthlyContributionAmount.toString());
  const [isContributing, setIsContributing] = useState(false);
  
  // Validation state
  const [error, setError] = useState('');
  
  // Check if user is a member
  const userIsMember = welfareAccount.members.some(m => m.userId === user.uid);
  
  // Check if user has already contributed this month
  const currentMonth = new Date().toISOString().substring(0, 7); // Format: YYYY-MM
  const userMember = welfareAccount.members.find(m => m.userId === user.uid);
  const hasContributedThisMonth = userMember && 
    userMember.contributionHistory && 
    userMember.contributionHistory.some(c => c.month === currentMonth && c.paid);
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Update navigation title
  useEffect(() => {
    navigation.setOptions({
      title: 'Contribute to Welfare'
    });
  }, [navigation]);
  
  // Validate contribution
  const validateContribution = () => {
    // Reset error
    setError('');
    
    // Check if amount is valid
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    // Check if user is a member
    if (!userIsMember) {
      setError('You are not a member of this welfare account');
      return false;
    }
    
    // Check if user has already contributed this month
    if (hasContributedThisMonth) {
      setError('You have already contributed for this month');
      return false;
    }
    
    return true;
  };
  
  // Handle contribution
  const handleContribute = async () => {
    if (!validateContribution()) {
      return;
    }
    
    // Confirm contribution
    Alert.alert(
      'Confirm Contribution',
      `Are you sure you want to contribute ${formatCurrency(parseFloat(amount))} to the ${welfareAccount.name} welfare account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contribute',
          onPress: async () => {
            setIsContributing(true);
            
            try {
              await contributeToWelfare(
                welfareAccount.id,
                user.uid,
                parseFloat(amount),
                currentMonth
              );
              
              Alert.alert(
                'Success',
                'Your contribution has been recorded successfully!',
                [
                  { 
                    text: 'OK', 
                    onPress: () => navigation.navigate('WelfareAccountDetails', { 
                      welfareAccount: {
                        ...welfareAccount,
                        balance: welfareAccount.balance + parseFloat(amount),
                        members: welfareAccount.members.map(member => {
                          if (member.userId === user.uid) {
                            // Update the user's contribution history
                            const updatedHistory = [...(member.contributionHistory || [])];
                            const contributionIndex = updatedHistory.findIndex(c => c.month === currentMonth);
                            
                            if (contributionIndex !== -1) {
                              // Update existing contribution
                              updatedHistory[contributionIndex] = {
                                ...updatedHistory[contributionIndex],
                                paid: true,
                                amount: parseFloat(amount),
                                date: new Date()
                              };
                            } else {
                              // Add new contribution
                              updatedHistory.push({
                                month: currentMonth,
                                paid: true,
                                amount: parseFloat(amount),
                                date: new Date()
                              });
                            }
                            
                            return {
                              ...member,
                              contributionHistory: updatedHistory
                            };
                          }
                          return member;
                        })
                      }
                    }) 
                  }
                ]
              );
            } catch (error) {
              console.error('Error contributing to welfare account:', error);
              Alert.alert('Error', 'Failed to record contribution. Please try again.');
            } finally {
              setIsContributing(false);
            }
          }
        }
      ]
    );
  };
  
  // Show alert if user has already contributed
  useEffect(() => {
    if (hasContributedThisMonth) {
      const contribution = userMember.contributionHistory.find(c => c.month === currentMonth && c.paid);
      Alert.alert(
        'Already Contributed',
        `You have already contributed ${formatCurrency(contribution.amount)} for this month. Would you like to make an additional contribution?`,
        [
          { text: 'No', onPress: () => navigation.goBack() },
          { text: 'Yes', onPress: () => {} }
        ]
      );
    }
  }, [hasContributedThisMonth]);
  
  if (!userIsMember) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <MaterialIcons name="error-outline" size={48} color="#f44336" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Not a Member</Text>
            <Text style={styles.errorMessage}>
              You are not a member of this welfare account. Please contact the account administrator to join.
            </Text>
            <Button 
              mode="contained" 
              onPress={() => navigation.goBack()}
              style={styles.errorButton}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        {/* Welfare Account Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.accountName}>{welfareAccount.name}</Text>
            <Text style={styles.accountDescription}>{welfareAccount.description}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Monthly Contribution</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(welfareAccount.monthlyContributionAmount)}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Current Balance</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(welfareAccount.balance)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Active Members</Text>
                <Text style={styles.infoValue}>
                  {welfareAccount.members.filter(m => m.status === 'active').length}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Your Status</Text>
                <Chip mode="outlined" style={styles.statusChip}>
                  {hasContributedThisMonth ? 'Contributed' : 'Pending'}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Contribution Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.formTitle}>Make Your Contribution</Text>
            <Text style={styles.formSubtitle}>
              Contribution for {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </Text>
            
            <TextInput
              label="Contribution Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              error={!!error}
              disabled={isContributing}
              left={<TextInput.Affix text="$" />}
            />
            
            {!!error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}
            
            <Text style={styles.suggestedText}>
              Suggested: {formatCurrency(welfareAccount.monthlyContributionAmount)}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={isContributing}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleContribute}
          style={styles.button}
          loading={isContributing}
          disabled={isContributing}
        >
          Contribute
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  accountName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  accountDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  suggestedText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  errorCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorButton: {
    marginTop: 16,
  },
});

export default ContributeToWelfareScreen;
