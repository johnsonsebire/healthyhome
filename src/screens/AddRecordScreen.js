import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { validateForm } from '../utils/validation';

const RECORD_TYPES = [
  { id: 'prescription', name: 'Prescription', icon: 'medical', color: '#10b981' },
  { id: 'diagnosis', name: 'Diagnosis', icon: 'pulse', color: '#f59e0b' },
  { id: 'hospital_card', name: 'Hospital Card', icon: 'card', color: '#6366f1' },
  { id: 'bill', name: 'Medical Bill', icon: 'receipt', color: '#ef4444' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-checkmark', color: '#8b5cf6' },
];

const AddRecordScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { canUploadFile } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    familyMemberId: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadFamilyMembers();

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
    });

    return unsubscribe;
  }, []);

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
        const membersQuery = query(
          collection(db, 'familyMembers'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(membersQuery);
        const membersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cache the data
        await offlineStorageService.cacheFamilyMembers(membersData);
        return membersData;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.LOW,
        showLoading: false,
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
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!canUploadFile(asset.fileSize || 0)) {
        Alert.alert('Storage Limit', 'This file exceeds your storage limit. Please upgrade your plan or free up space.');
        return;
      }
      
      setAttachments(prev => [...prev, {
        id: Date.now().toString(),
        uri: asset.uri,
        type: 'image',
        name: `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0
      }]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!canUploadFile(asset.size || 0)) {
          Alert.alert('Storage Limit', 'This file exceeds your storage limit. Please upgrade your plan or free up space.');
          return;
        }

        setAttachments(prev => [...prev, {
          id: Date.now().toString(),
          uri: asset.uri,
          type: asset.mimeType?.includes('image') ? 'image' : 'document',
          name: asset.name,
          size: asset.size || 0
        }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const uploadAttachment = async (attachment) => {
    try {
      const response = await fetch(attachment.uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `medical-records/${user.uid}/${attachment.id}_${attachment.name}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return {
        url: downloadURL,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validate form
    const validation = validateForm(formData, {
      type: { required: true },
      title: { required: true, minLength: 3 },
      familyMemberId: { required: true }
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      Alert.alert('Validation Error', Object.values(validation.errors)[0]);
      return;
    }

    setValidationErrors({});

    const result = await withErrorHandling(
      async () => {
        // Check if online for real-time sync
        if (!networkService.isOnline()) {
          // Add to offline queue
          const recordData = {
            ...formData,
            userId: user.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            attachments: [], // Handle attachments differently for offline
          };

          // Get family member name
          const familyMember = familyMembers.find(m => m.id === formData.familyMemberId);
          recordData.familyMemberName = familyMember ? familyMember.name : '';

          // Add to offline sync queue
          await offlineStorageService.addToSyncQueue({
            type: 'CREATE_RECORD',
            data: recordData
          });

          // Cache locally
          const existingRecords = await offlineStorageService.getCachedMedicalRecords();
          const records = existingRecords?.data || [];
          records.unshift({ ...recordData, id: `temp_${Date.now()}`, isLocal: true });
          await offlineStorageService.cacheMedicalRecords(records);

          Alert.alert(
            'Record Saved Offline',
            'Your record has been saved locally and will sync when you\'re back online.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Upload attachments if online
        const uploadedAttachments = [];
        for (const attachment of attachments) {
          const uploaded = await uploadAttachment(attachment);
          uploadedAttachments.push(uploaded);
        }

        // Get family member name
        const familyMember = familyMembers.find(m => m.id === formData.familyMemberId);
        
        // Create record
        const recordData = {
          ...formData,
          familyMemberName: familyMember ? familyMember.name : '',
          attachments: uploadedAttachments,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await addDoc(collection(db, 'medicalRecords'), recordData);
        
        // Update cache
        const existingRecords = await offlineStorageService.getCachedMedicalRecords();
        const records = existingRecords?.data || [];
        records.unshift(recordData);
        await offlineStorageService.cacheMedicalRecords(records);

        Alert.alert('Success', 'Record added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    if (!result.success && networkService.isOnline()) {
      // If online but failed, show error
      Alert.alert('Error', 'Failed to add record. Please try again.');
    }
  };

  const TypePickerModal = () => (
    <Modal
      visible={showTypePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTypePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Record Type</Text>
          {RECORD_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={styles.typeOption}
              onPress={() => {
                updateFormData('type', type.id);
                setShowTypePicker(false);
              }}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon} size={24} color={type.color} />
              </View>
              <Text style={styles.typeOptionText}>{type.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowTypePicker(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const MemberPickerModal = () => (
    <Modal
      visible={showMemberPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMemberPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Family Member</Text>
          {familyMembers.map(member => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberOption}
              onPress={() => {
                updateFormData('familyMemberId', member.id);
                setShowMemberPicker(false);
              }}
            >
              <Text style={styles.memberOptionText}>{member.name}</Text>
              <Text style={styles.memberOptionSubtext}>{member.relationship}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowMemberPicker(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const selectedType = RECORD_TYPES.find(t => t.id === formData.type);
  const selectedMember = familyMembers.find(m => m.id === formData.familyMemberId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Record Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Record Type *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowTypePicker(true)}
          >
            {selectedType ? (
              <View style={styles.selectedOption}>
                <View style={[styles.selectedIcon, { backgroundColor: selectedType.color + '20' }]}>
                  <Ionicons name={selectedType.icon} size={20} color={selectedType.color} />
                </View>
                <Text style={styles.selectedText}>{selectedType.name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select record type</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Family Member */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Family Member *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowMemberPicker(true)}
          >
            {selectedMember ? (
              <View style={styles.selectedOption}>
                <Text style={styles.selectedText}>{selectedMember.name}</Text>
                <Text style={styles.selectedSubtext}>{selectedMember.relationship}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select family member</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter record title"
            value={formData.title}
            onChangeText={(value) => updateFormData('title', value)}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter description"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Doctor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Doctor</Text>
          <TextInput
            style={styles.input}
            placeholder="Doctor's name"
            value={formData.doctor}
            onChangeText={(value) => updateFormData('doctor', value)}
          />
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChangeText={(value) => updateFormData('date', value)}
          />
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes"
            value={formData.notes}
            onChangeText={(value) => updateFormData('notes', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Attachments */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Attachments</Text>
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachmentButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#6366f1" />
              <Text style={styles.attachmentButtonText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentButton} onPress={pickDocument}>
              <Ionicons name="document" size={20} color="#6366f1" />
              <Text style={styles.attachmentButtonText}>Add Document</Text>
            </TouchableOpacity>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {attachments.map(attachment => (
                <View key={attachment.id} style={styles.attachmentItem}>
                  {attachment.type === 'image' ? (
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentPreview} />
                  ) : (
                    <View style={styles.documentPreview}>
                      <Ionicons name="document" size={24} color="#6366f1" />
                    </View>
                  )}
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentSize}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => removeAttachment(attachment.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding Record...' : 'Add Record'}
          </Text>
        </TouchableOpacity>
      </View>

      <TypePickerModal />
      <MemberPickerModal />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectedSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 8,
  },
  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  documentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  removeAttachment: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeOptionText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  memberOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberOptionText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  memberOptionSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default AddRecordScreen;
