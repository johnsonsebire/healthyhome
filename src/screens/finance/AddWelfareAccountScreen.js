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
  List,
  Checkbox,
  Dialog,
  Portal,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';

// Custom component for list icon
const MemberListIcon = (props) => (
  <List.Icon {...props} />
);

const AddWelfareAccountScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { createWelfareAccount, currentScope, changeScope } = useFinance();
  const { extendedFamilyMembers = [] } = useFamilySharing();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectMembersVisible, setSelectMembersVisible] = useState(false);
  
  // Loading state
  const [isCreating, setIsCreating] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState({
    name: '',
    description: '',
    monthlyContribution: '',
    members: ''
  });
  
  // Set scope to extended when component mounts
  useEffect(() => {
    if (currentScope !== FINANCE_SCOPE.EXTENDED) {
      changeScope(FINANCE_SCOPE.EXTENDED);
    }
  }, []);
  
  // Always include current user in selected members
  useEffect(() => {
    if (user && (extendedFamilyMembers || []).length > 0) {
      // Find current user in extended family members
      const currentUserInFamily = (extendedFamilyMembers || []).find(
        member => member.userId === user.uid
      );
      
      if (currentUserInFamily && !(selectedMembers || []).some(m => m.userId === user.uid)) {
        setSelectedMembers([
          {
            userId: user.uid,
            name: currentUserInFamily.displayName || user.displayName || user.email,
            status: 'active',
            contributionHistory: []
          }
        ]);
      }
    }
  }, [user, extendedFamilyMembers]);
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Toggle member selection
  const toggleMemberSelection = (member) => {
    // Cannot remove current user
    if (!member || !user || member.userId === user.uid) {
      return;
    }
    
    const isSelected = (selectedMembers || []).some(m => m.userId === member.userId);
    
    if (isSelected) {
      setSelectedMembers((selectedMembers || []).filter(m => m.userId !== member.userId));
    } else {
      setSelectedMembers([
        ...(selectedMembers || []),
        {
          userId: member.userId,
          name: member.displayName || 'Unknown Member',
          status: 'active',
          contributionHistory: []
        }
      ]);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {
      name: '',
      description: '',
      monthlyContribution: '',
      members: ''
    };
    
    let isValid = true;
    
    if (!name.trim()) {
      newErrors.name = 'Account name is required';
      isValid = false;
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    if (!monthlyContribution || isNaN(parseFloat(monthlyContribution)) || parseFloat(monthlyContribution) <= 0) {
      newErrors.monthlyContribution = 'Valid monthly contribution amount is required';
      isValid = false;
    }
    
    if (selectedMembers.length < 2) {
      newErrors.members = 'At least two members are required';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Create welfare account
  const handleCreateWelfareAccount = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      const welfareAccountData = {
        name: name.trim(),
        description: description.trim(),
        monthlyContributionAmount: parseFloat(monthlyContribution),
        members: selectedMembers || [],
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email || 'Unknown User',
      };
      
      const newWelfareAccount = await createWelfareAccount(welfareAccountData);
      
      // Show success message
      Alert.alert(
        'Success',
        'Welfare account created successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('WelfareAccountDetails', { welfareAccount: newWelfareAccount }) 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating welfare account:', error);
      Alert.alert('Error', 'Failed to create welfare account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Create a Family Welfare Account</Text>
          <Text style={styles.infoText}>
            Welfare accounts help extended family members in times of need through regular contributions.
          </Text>
        </View>
        
        {/* Form */}
        <View style={styles.formContainer}>
          <TextInput
            label="Account Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            disabled={isCreating}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>
          
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            error={!!errors.description}
            disabled={isCreating}
          />
          <HelperText type="error" visible={!!errors.description}>
            {errors.description}
          </HelperText>
          
          <TextInput
            label="Monthly Contribution Amount"
            value={monthlyContribution}
            onChangeText={setMonthlyContribution}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            error={!!errors.monthlyContribution}
            disabled={isCreating}
            left={<TextInput.Affix text="$" />}
          />
          <HelperText type="error" visible={!!errors.monthlyContribution}>
            {errors.monthlyContribution}
          </HelperText>
          
          {/* Selected Members */}
          <View style={styles.membersSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Members</Text>
              <TouchableOpacity 
                onPress={() => setSelectMembersVisible(true)}
                disabled={isCreating}
              >
                <MaterialIcons name="person-add" size={24} color="#6366f1" />
              </TouchableOpacity>
            </View>
            
            {errors.members ? (
              <HelperText type="error" visible={!!errors.members}>
                {errors.members}
              </HelperText>
            ) : (
              <Text style={styles.memberCount}>
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </Text>
            )}
            
            <View style={styles.selectedMembersContainer}>
              {(selectedMembers || []).map((member) => (
                <Chip
                  key={member.userId || Math.random().toString()}
                  style={styles.memberChip}
                  onClose={member.userId !== user?.uid ? () => toggleMemberSelection(member) : undefined}
                  avatar={
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  }
                >
                  {member.name} {member.userId === user.uid ? '(You)' : ''}
                </Chip>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleCreateWelfareAccount}
          style={styles.button}
          loading={isCreating}
          disabled={isCreating}
        >
          Create Welfare Account
        </Button>
      </View>
      
      {/* Member Selection Dialog */}
      <Portal>
        <Dialog
          visible={selectMembersVisible}
          onDismiss={() => setSelectMembersVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Select Members</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.membersList}>
              {(extendedFamilyMembers || []).map((member) => {
                const isSelected = (selectedMembers || []).some(m => m.userId === member.userId);
                const isCurrentUser = member.userId === user?.uid;
                
                return (
                  <List.Item
                    key={member.userId || Math.random().toString()}
                    title={member.displayName + (isCurrentUser ? ' (You)' : '')}
                    description={isCurrentUser ? 'Account Creator' : 'Family Member'}
                    left={() => (
                      <MemberListIcon icon={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} />
                    )}
                    onPress={() => toggleMemberSelection(member)}
                    disabled={isCurrentUser} // Cannot deselect current user
                    style={isCurrentUser ? styles.currentUserItem : null}
                  />
                );
              })}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectMembersVisible(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  infoContainer: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  formContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  membersSection: {
    marginTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectedMembersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  memberChip: {
    margin: 4,
    backgroundColor: '#f0f0ff',
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  membersList: {
    maxHeight: 300,
  },
  currentUserItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
});

export default AddWelfareAccountScreen;
