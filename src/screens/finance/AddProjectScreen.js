import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert 
} from 'react-native';
import { Button, Divider, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { useFamilySharing } from '../../contexts/FamilySharingContext';

// Custom component for member menu items
const MemberMenuItem = ({ isSelected, color = '#2196F3' }) => (
  <MaterialIcons 
    name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
    size={24} 
    color={isSelected ? color : '#666'} 
  />
);

const AddProjectScreen = ({ navigation, route }) => {
  const { createProject } = useFinance();
  const { nuclearFamilyMembers, extendedFamilyMembers } = useFamilySharing();
  
  // Get scope if passed from route params
  const scope = route.params?.scope || FINANCE_SCOPE.NUCLEAR;
  
  // State for the form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default 3 months ahead
    status: 'active',
    scope: scope,
    contributors: [],
  });
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState([]);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Handle start date change
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        startDate: selectedDate
      });
    }
  };
  
  // Handle end date change
  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        endDate: selectedDate
      });
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Toggle family member selection
  const toggleFamilyMember = (member) => {
    if (selectedFamilyMembers.some(m => m.id === member.id)) {
      setSelectedFamilyMembers(selectedFamilyMembers.filter(m => m.id !== member.id));
    } else {
      setSelectedFamilyMembers([...selectedFamilyMembers, member]);
    }
  };
  
  // Get available family members based on scope
  const getAvailableFamilyMembers = () => {
    return scope === FINANCE_SCOPE.NUCLEAR ? nuclearFamilyMembers : extendedFamilyMembers;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a project description');
      return;
    }
    
    if (!formData.targetAmount || isNaN(formData.targetAmount) || parseFloat(formData.targetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }
    
    if (formData.endDate <= formData.startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare contributors array
      const contributors = selectedFamilyMembers.map(member => ({
        userId: member.id,
        contributionAmount: 0,
        lastContribution: null
      }));
      
      await createProject({
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        contributors: contributors
      });
      
      Alert.alert(
        'Success', 
        'Project created successfully', 
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get scope label
  const getScopeLabel = () => {
    switch (scope) {
      case FINANCE_SCOPE.NUCLEAR:
        return 'Family Project';
      case FINANCE_SCOPE.EXTENDED:
        return 'Extended Family Project';
      default:
        return 'Project';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.scopeLabel}>{getScopeLabel()}</Text>
        
        {/* Project Name */}
        <Text style={styles.inputLabel}>Project Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter project name"
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholderTextColor="#999"
        />
        
        {/* Project Description */}
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Enter project description"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          placeholderTextColor="#999"
        />
        
        {/* Target Amount */}
        <Text style={styles.inputLabel}>Target Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={formData.targetAmount}
            onChangeText={(value) => handleInputChange('targetAmount', value)}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Date Range */}
        <View style={styles.dateRangeContainer}>
          <View style={styles.dateContainer}>
            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowStartDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#333" />
              <Text style={styles.dateText}>{formatDate(formData.startDate)}</Text>
            </TouchableOpacity>
            
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
              />
            )}
          </View>
          
          <View style={styles.dateContainer}>
            <Text style={styles.inputLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowEndDatePicker(true)}
            >
              <MaterialIcons name="event" size={20} color="#333" />
              <Text style={styles.dateText}>{formatDate(formData.endDate)}</Text>
            </TouchableOpacity>
            
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.endDate}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
              />
            )}
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Contributors */}
        <Text style={styles.sectionTitle}>Contributors</Text>
        <Text style={styles.helperText}>
          Select family members who will contribute to this project
        </Text>
        
        <Menu
          visible={showMembersMenu}
          onDismiss={() => setShowMembersMenu(false)}
          anchor={
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowMembersMenu(true)}
            >
              <MaterialIcons name="people" size={24} color="#333" />
              <Text style={styles.dropdownText}>
                {selectedFamilyMembers.length === 0 
                  ? 'Select Contributors'
                  : `${selectedFamilyMembers.length} Selected`}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>
          }
        >
          {getAvailableFamilyMembers().map(member => (
            <Menu.Item
              key={member.id}
              onPress={() => toggleFamilyMember(member)}
              title={member.displayName || member.email}
              leadingIcon={() => (
                <MemberMenuItem isSelected={selectedFamilyMembers.some(m => m.id === member.id)} />
              )}
            />
          ))}
        </Menu>
        
        {selectedFamilyMembers.length > 0 && (
          <View style={styles.selectedMembersContainer}>
            <Text style={styles.selectedMembersLabel}>Selected Contributors:</Text>
            {selectedFamilyMembers.map(member => (
              <View key={member.id} style={styles.selectedMemberItem}>
                <MaterialIcons name="person" size={16} color="#2196F3" />
                <Text style={styles.selectedMemberName}>{member.displayName || member.email}</Text>
                <TouchableOpacity onPress={() => toggleFamilyMember(member)}>
                  <MaterialIcons name="cancel" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {/* Submit Button */}
        <Button
          mode="contained"
          style={styles.submitButton}
          labelStyle={styles.submitButtonText}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Create Project
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  scopeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 20,
    paddingHorizontal: 12,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    paddingVertical: 10,
    paddingRight: 12,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
  },
  divider: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 8,
  },
  selectedMembersContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectedMembersLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  selectedMemberName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProjectScreen;
