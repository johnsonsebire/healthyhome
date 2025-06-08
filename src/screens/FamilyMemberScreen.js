import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ValidationError from '../components/ValidationError';
import { validateForm, getFieldError, hasFieldError } from '../utils/validation';

const FamilyMemberScreen = () => {
  const { user, userProfile } = useAuth();
  const { subscription, checkUsageLimit } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    dateOfBirth: '',
    bloodType: '',
    allergies: '',
    emergencyContact: '',
    photo: null,
  });

  const relationships = [
    'Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Other'
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    if (user) {
      loadFamilyMembers();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadFamilyMembers();
      }
    });

    return unsubscribe;
  }, [user]);

  const loadFamilyMembers = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
          if (cachedMembers && cachedMembers.data) {
            return cachedMembers.data;
          }
        }

        // Load from Firebase
        const q = query(
          collection(db, 'familyMembers'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const members = [];
        querySnapshot.forEach((doc) => {
          members.push({ id: doc.id, ...doc.data() });
        });

        // Cache the data
        await offlineStorageService.cacheFamilyMembers(members);
        return members;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      setFamilyMembers(result.data);
    } else {
      // Use cached data as fallback
      const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
      if (cachedMembers && cachedMembers.data) {
        setFamilyMembers(cachedMembers.data);
      }
    }
    setLoading(false);
  };

  const handleAddMember = async () => {
    // Validate form data
    const validation = validateForm(formData, {
      name: { required: true, minLength: 2, message: 'Name must be at least 2 characters' },
      relationship: { required: true, message: 'Please select a relationship' },
      emergencyContact: { 
        phone: true, 
        message: 'Please enter a valid phone number (if provided)' 
      }
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Show first validation error in alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    setValidationErrors({});

    const result = await withErrorHandling(
      async () => {
        // Check family member limit based on subscription
        const canAdd = checkUsageLimit('familyMembers', familyMembers.length);
        if (!canAdd) {
          Alert.alert(
            'Limit Reached',
            'Upgrade your subscription to add more family members'
          );
          throw new Error('Family member limit reached');
        }

        const memberData = {
          ...formData,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (!networkService.isOnline()) {
          // Add to offline sync queue
          await offlineStorageService.addToSyncQueue({
            type: editingMember ? 'UPDATE_FAMILY_MEMBER' : 'CREATE_FAMILY_MEMBER',
            data: memberData,
            memberId: editingMember?.id
          });

          // Update local cache
          const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
          const members = cachedMembers?.data || [];
          
          if (editingMember) {
            const updatedMembers = members.map(m => 
              m.id === editingMember.id ? { ...memberData, id: editingMember.id } : m
            );
            await offlineStorageService.cacheFamilyMembers(updatedMembers);
          } else {
            const newMember = { ...memberData, id: `temp_${Date.now()}`, isLocal: true };
            members.push(newMember);
            await offlineStorageService.cacheFamilyMembers(members);
          }

          Alert.alert(
            'Saved Offline', 
            'Family member saved locally and will sync when you\'re back online.'
          );
          return { offline: true };
        }

        // Save to Firebase
        if (editingMember) {
          await updateDoc(doc(db, 'familyMembers', editingMember.id), memberData);
        } else {
          await addDoc(collection(db, 'familyMembers'), memberData);
        }

        // Update cache
        await loadFamilyMembers();
        return { online: true };
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    // Handle both old result format and new detailed result format
    const isSuccess = result.success || (result.data && result.data.success);
    
    if (isSuccess) {
      setShowAddModal(false);
      setEditingMember(null);
      setFormData({
        name: '',
        relationship: '',
        dateOfBirth: '',
        bloodType: '',
        allergies: '',
        emergencyContact: '',
        photo: null,
      });
      
      // Reload family members if online or if it was an offline save that needs UI update
      if (networkService.isOnline() || (result.data && result.data.offline)) {
        loadFamilyMembers();
      }
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      relationship: member.relationship || '',
      dateOfBirth: member.dateOfBirth || '',
      bloodType: member.bloodType || '',
      allergies: member.allergies || '',
      emergencyContact: member.emergencyContact || '',
      photo: member.photo || null,
    });
    setShowAddModal(true);
  };

  const handleDeleteMember = (memberId) => {
    Alert.alert(
      'Delete Family Member',
      'Are you sure you want to delete this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMember(memberId),
        },
      ]
    );
  };

  const deleteMember = async (memberId) => {
    const result = await withErrorHandling(
      async () => {
        if (!networkService.isOnline()) {
          // Add to offline sync queue
          await offlineStorageService.addToSyncQueue({
            type: 'DELETE_FAMILY_MEMBER',
            memberId: memberId
          });

          // Remove from local cache
          const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
          if (cachedMembers && cachedMembers.data) {
            const updatedMembers = cachedMembers.data.filter(m => m.id !== memberId);
            await offlineStorageService.cacheFamilyMembers(updatedMembers);
          }

          Alert.alert(
            'Deleted Offline',
            'Family member will be permanently deleted when you\'re back online.'
          );
          return;
        }

        // Delete from Firebase
        await deleteDoc(doc(db, 'familyMembers', memberId));
        
        // Update cache
        await loadFamilyMembers();
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    if (result.success && networkService.isOnline()) {
      loadFamilyMembers();
    } else if (result.success) {
      // Refresh from cache for offline deletion
      const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
      if (cachedMembers && cachedMembers.data) {
        setFamilyMembers(cachedMembers.data);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, photo: result.assets[0].uri });
    }
  };

  const handleRelationshipSelect = (relationship) => {
    const updatedFormData = { ...formData, relationship };
    
    // Auto-populate name when "Self" is selected
    if (relationship === 'Self' && userProfile?.displayName && !formData.name) {
      updatedFormData.name = userProfile.displayName;
    }
    
    setFormData(updatedFormData);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleDateSelect = () => {
    // Parse existing date or use current date
    let initialDate = new Date();
    if (formData.dateOfBirth) {
      const parsed = new Date(formData.dateOfBirth);
      if (!isNaN(parsed)) {
        initialDate = parsed;
      }
    }
    setSelectedDate(initialDate);
    setShowDatePicker(true);
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      setFormData({ 
        ...formData, 
        dateOfBirth: formatDate(date)
      });
      
      if (Platform.OS === 'ios') {
        // iOS picker stays open, we'll close it with a "Done" button
      }
    }
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
  };

  const getFamilyMemberLimit = () => {
    const limits = { basic: 3, standard: 10, premium: 50 };
    return limits[subscription?.plan] || 3;
  };

  const onRefresh = () => {
    setLoading(true);
    loadFamilyMembers();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading === true && <LoadingSpinner />}

      <View style={styles.header}>
        <Text style={styles.title}>Family Members</Text>
        <Text style={styles.subtitle}>
          {familyMembers.length}/{getFamilyMemberLimit()} members
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {familyMembers && familyMembers.length > 0 && familyMembers.map((member) => (
          member && member.id ? (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                {member.photo ? (
                  <Image source={{ uri: member.photo }} style={styles.memberPhoto} />
                ) : (
                  <View style={styles.memberPhotoPlaceholder}>
                    <Ionicons name="person" size={30} color="#666" />
                  </View>
                )}
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
                  <Text style={styles.memberRelationship}>{member.relationship || 'Unknown'}</Text>
                  {member.dateOfBirth && (
                    <Text style={styles.memberInfo}>DOB: {member.dateOfBirth}</Text>
                  )}
                  {member.bloodType && (
                    <Text style={styles.memberInfo}>Blood Type: {member.bloodType}</Text>
                  )}
                </View>
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditMember(member)}
                >
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteMember(member.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        ))}

        {(!familyMembers || familyMembers.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#DDD" />
            <Text style={styles.emptyStateText}>No family members added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by adding yourself and your family members to manage medical records
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingMember 
                ? `Edit ${editingMember.name || 'Member'}` 
                : formData.relationship === 'Self' 
                  ? 'Add Your Profile'
                  : 'Add Family Member'
              }
            </Text>
            <TouchableOpacity onPress={handleAddMember}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                {formData.photo ? (
                  <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={30} color="#666" />
                    <Text style={styles.photoText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  hasFieldError('name', validationErrors) && styles.inputError
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={
                  formData.relationship === 'Self' 
                    ? 'Your full name' 
                    : 'Enter full name'
                }
              />
              <ValidationError error={getFieldError('name', validationErrors)} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Relationship *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.relationshipButtons}>
                  {relationships.map((relation) => (
                    <TouchableOpacity
                      key={relation}
                      style={[
                        styles.relationshipButton,
                        relation === 'Self' && styles.relationshipButtonSelf,
                        formData.relationship === relation && styles.relationshipButtonActive,
                        hasFieldError('relationship', validationErrors) && styles.relationshipButtonError,
                      ]}
                      onPress={() => handleRelationshipSelect(relation)}
                    >
                      <Text
                        style={[
                          styles.relationshipButtonText,
                          formData.relationship === relation && styles.relationshipButtonTextActive,
                        ]}
                      >
                        {relation === 'Self' ? '👤 Self' : relation}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <ValidationError error={getFieldError('relationship', validationErrors)} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={handleDateSelect}
              >
                <Text style={[
                  styles.dateInputText,
                  !formData.dateOfBirth && styles.dateInputPlaceholder
                ]}>
                  {formData.dateOfBirth || 'Select date of birth'}
                </Text>
                <Ionicons name="calendar" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Blood Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.bloodTypeButtons}>
                  {bloodTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.bloodTypeButton,
                        formData.bloodType === type && styles.bloodTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, bloodType: type })}
                    >
                      <Text
                        style={[
                          styles.bloodTypeButtonText,
                          formData.bloodType === type && styles.bloodTypeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Allergies</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.allergies}
                onChangeText={(text) => setFormData({ ...formData, allergies: text })}
                placeholder="List any allergies"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Emergency Contact</Text>
              <TextInput
                style={[
                  styles.input,
                  hasFieldError('emergencyContact', validationErrors) && styles.inputError
                ]}
                value={formData.emergencyContact}
                onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <ValidationError error={getFieldError('emergencyContact', validationErrors)} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                  <TouchableOpacity onPress={handleDatePickerDone}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  memberPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memberRelationship: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 2,
  },
  memberActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  relationshipButtonError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  dateInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dateInputPlaceholder: {
    color: '#999',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  datePickerDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  relationshipButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  relationshipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  relationshipButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  relationshipButtonSelf: {
    borderColor: '#34D399',
    backgroundColor: '#F0FDF4',
  },
  relationshipButtonText: {
    fontSize: 14,
    color: '#333',
  },
  relationshipButtonTextActive: {
    color: 'white',
  },
  bloodTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bloodTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  bloodTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  bloodTypeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  bloodTypeButtonTextActive: {
    color: 'white',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  offlineText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
});

export default FamilyMemberScreen;
