import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  FlatList
} from 'react-native';
import { 
  Button, 
  List, 
  Divider,
  Searchbar,
  Avatar,
  Checkbox,
  ActivityIndicator,
  HelperText
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '../../contexts/FinanceContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';
import { useAuth } from '../../contexts/AuthContext';

// Custom component for avatar
const MemberAvatar = ({ displayName, isSelected }) => (
  <Avatar.Text 
    size={40} 
    label={displayName ? displayName.substring(0, 2).toUpperCase() : 'XX'} 
    backgroundColor={isSelected ? '#6366f1' : '#e0e0e0'}
    color={isSelected ? '#fff' : '#333'}
  />
);

const AddWelfareMemberScreen = ({ route, navigation }) => {
  const { welfareAccount } = route.params;
  const { user } = useAuth();
  const { extendedFamilyMembers } = useFamilySharing();
  const { updateWelfareAccount } = useFinance();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter out members who are already part of the welfare account
  const existingMemberIds = welfareAccount.members.map(m => m.userId);
  const availableMembers = extendedFamilyMembers.filter(m => !existingMemberIds.includes(m.userId));
  
  // Filter members based on search query
  const filteredMembers = searchQuery
    ? availableMembers.filter(m => 
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : availableMembers;
  
  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      title: 'Add Members',
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={handleAddMembers}
          disabled={selectedMembers.length === 0 || isLoading}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, selectedMembers, isLoading]);
  
  // Toggle member selection
  const toggleMemberSelection = (member) => {
    const isSelected = selectedMembers.some(m => m.userId === member.userId);
    
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => m.userId !== member.userId));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };
  
  // Handle adding members
  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one member to add');
      return;
    }
    
    // Confirm adding members
    Alert.alert(
      'Add Members',
      `Are you sure you want to add ${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''} to this welfare account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            setIsLoading(true);
            setError('');
            
            try {
              // Prepare the new members data
              const newMembers = selectedMembers.map(member => ({
                userId: member.userId,
                name: member.displayName,
                status: 'active',
                contributionHistory: []
              }));
              
              // Update the welfare account
              const updatedMembers = [...welfareAccount.members, ...newMembers];
              
              await updateWelfareAccount(welfareAccount.id, {
                members: updatedMembers
              });
              
              // Navigate back to welfare account details with updated data
              navigation.navigate('WelfareAccountDetails', {
                welfareAccount: {
                  ...welfareAccount,
                  members: updatedMembers
                }
              });
              
              // Show success message
              Alert.alert(
                'Success',
                `${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''} added successfully!`
              );
            } catch (error) {
              console.error('Error adding members:', error);
              setError('Failed to add members. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Render member item
  const renderMemberItem = ({ item }) => {
    const isSelected = selectedMembers.some(m => m.userId === item.userId);
    
    return (
      <List.Item
        title={item.displayName}
        description={item.email || 'Family Member'}
        left={() => (
          <MemberAvatar 
            displayName={item.displayName}
            isSelected={isSelected}
          />
        )}
        right={props => (
          <Checkbox
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => toggleMemberSelection(item)}
          />
        )}
        onPress={() => toggleMemberSelection(item)}
        style={isSelected ? styles.selectedItem : null}
      />
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="people" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Available Members</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery ? 
          'No members match your search criteria.' : 
          'All extended family members are already part of this welfare account.'}
      </Text>
    </View>
  );
  
  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Adding members...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Add Members to {welfareAccount.name}</Text>
        <Text style={styles.headerSubtitle}>
          {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
        </Text>
      </View>
      
      {/* Search bar */}
      <Searchbar
        placeholder="Search family members..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {/* Error message */}
      {error ? (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      ) : null}
      
      {/* Members list */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.userId}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <Divider />}
      />
      
      {/* Bottom action bar */}
      {selectedMembers.length > 0 && (
        <View style={styles.bottomBar}>
          <Button 
            mode="contained" 
            onPress={handleAddMembers}
            style={styles.addButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
          </Button>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  searchBar: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  listContainer: {
    flexGrow: 1,
  },
  selectedItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
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
  bottomBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#6366f1',
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
  errorText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
});

export default AddWelfareMemberScreen;
