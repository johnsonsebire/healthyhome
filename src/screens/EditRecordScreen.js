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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import WrappedDateTimePicker from '../components/WrappedDateTimePicker';
import { doc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ValidationError from '../components/ValidationError';
import { validateForm, getFieldError, hasFieldError } from '../utils/validation';
import { getGenderSpecificRelationship } from '../utils/genderBasedRelationships';
import { placeholderTextColor, getStandardTextInputProps } from '../utils/inputStyles';
import { 
  COUNTRIES, 
  getCitiesByCountry, 
  getRegionsByCountry, 
  INSURANCE_PROVIDERS,
  getInsuranceProvidersByCountry 
} from '../data/locationData';

const RECORD_TYPES = [
  { id: 'prescription', name: 'Prescription', icon: 'medical', color: '#10b981' },
  { id: 'diagnosis', name: 'Diagnosis', icon: 'pulse', color: '#f59e0b' },
  { id: 'hospital_card', name: 'Hospital Card', icon: 'card', color: '#6366f1' },
  { id: 'bill', name: 'Medical Bill', icon: 'receipt', color: '#ef4444' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-checkmark', color: '#8b5cf6' },
];

const EditRecordScreen = ({ route, navigation }) => {
  const { recordId, record: initialRecord } = route.params;
  const { user } = useAuth();
  const { canUploadFile } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  
  const [formData, setFormData] = useState({
    type: initialRecord?.type || '',
    title: initialRecord?.title || '',
    description: initialRecord?.description || '',
    familyMemberId: initialRecord?.familyMemberId || '',
    doctor: initialRecord?.doctor || '',
    date: initialRecord?.date || new Date().toISOString().split('T')[0],
    notes: initialRecord?.notes || '',
    // Hospital Card specific fields
    country: initialRecord?.country || '',
    city: initialRecord?.city || '',
    region: initialRecord?.region || '',
    hospital: initialRecord?.hospital || '',
    cardNumber: initialRecord?.cardNumber || '',
    // Insurance specific fields
    provider: initialRecord?.provider || '',
    membershipNo: initialRecord?.membershipNo || '',
    dateOfIssue: initialRecord?.dateOfIssue || '',
    expiryDate: initialRecord?.expiryDate || '',
    // Medical Bill specific fields
    billFor: initialRecord?.billFor || '',
    billAmount: initialRecord?.billAmount || '',
    payments: initialRecord?.payments || [], // Array of payment records
    // Payment tracking
    totalPaid: initialRecord?.totalPaid || 0,
    paymentStatus: initialRecord?.paymentStatus || 'pending', // pending, partial, paid
  });
  
  const [familyMembers, setFamilyMembers] = useState([]);
  const [attachments, setAttachments] = useState(initialRecord?.attachments || []);
  const [newAttachments, setNewAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState('date'); // 'date', 'dateOfIssue', 'expiryDate'
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableProviders, setAvailableProviders] = useState(INSURANCE_PROVIDERS);
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

        // Cache the data with photos
        await offlineStorageService.cacheFamilyMembers(membersData, user.uid);
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

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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
      
      setNewAttachments(prev => [...prev, {
        id: Date.now().toString(),
        uri: asset.uri,
        type: 'image',
        name: `camera_${Date.now()}.jpg`,
        size: asset.fileSize || 0
      }]);
    }
  };

  // Modifying pickImage to open photo selection options
  const pickImage = async () => {
    Alert.alert(
      'Select Photo Source',
      'Choose where you want to get your photo from',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Camera',
          onPress: openCamera,
        },
        {
          text: 'Gallery',
          onPress: selectFromGallery,
        },
      ]
    );
  };

  // Existing pickImage function renamed to selectFromGallery
  const selectFromGallery = async () => {
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
      
      setNewAttachments(prev => [...prev, {
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

        setNewAttachments(prev => [...prev, {
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

  const removeExistingAttachment = (index) => {
    const attachment = attachments[index];
    setRemovedAttachments(prev => [...prev, attachment]);
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewAttachment = (id) => {
    setNewAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateSelect = () => {
    // Parse existing date or use current date
    let initialDate = new Date();
    if (formData.date) {
      const parsed = new Date(formData.date);
      if (!isNaN(parsed)) {
        initialDate = parsed;
      }
    }
    setSelectedDate(initialDate);
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDate(date);
      
      // Update the appropriate date field based on the mode
      switch (datePickerMode) {
        case 'dateOfIssue':
          updateFormData('dateOfIssue', formattedDate);
          break;
        case 'expiryDate':
          updateFormData('expiryDate', formattedDate);
          break;
        default:
          updateFormData('date', formattedDate);
          break;
      }
    }
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
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

  const deleteAttachment = async (attachment) => {
    try {
      if (attachment.url) {
        const storageRef = ref(storage, attachment.url);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      // Continue even if deletion fails
    }
  };

  const handleSubmit = async () => {
    // Define base validation rules
    const baseValidationRules = {
      type: { required: true, message: 'Please select a record type' },
      familyMemberId: { required: true, message: 'Please select a family member' },
      date: { required: true, date: true, message: 'Please enter a valid date' }
    };
    
    // Add title validation only for record types that use title
    // (not for insurance or hospital_card which use card-based layouts)
    if (!['insurance', 'hospital_card'].includes(formData.type)) {
      baseValidationRules.title = { 
        required: true, 
        minLength: 3, 
        message: 'Title must be at least 3 characters' 
      };
    }
    
    // Add insurance-specific validation
    if (formData.type === 'insurance') {
      baseValidationRules.provider = { 
        required: true, 
        message: 'Please select an insurance provider' 
      };
    }

    // Validate form
    const validation = validateForm(formData, baseValidationRules);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Show first validation error in alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    setValidationErrors({});
    setLoading(true);

    try {
      // Check if online for real-time sync
      if (!networkService.isOnline()) {
        // Add to offline queue
        const recordData = {
          ...formData,
          recordId,
          userId: user.uid,
          updatedAt: new Date(),
          attachments: attachments, // Keep existing attachments for offline
        };

        // Get family member name
        const familyMember = familyMembers.find(m => m.id === formData.familyMemberId);
        recordData.familyMemberName = familyMember ? 
          (familyMember.title ? `${familyMember.title} ${familyMember.name}` : familyMember.name) : '';

        // Add to offline sync queue
        await offlineStorageService.addToSyncQueue({
          type: 'UPDATE_RECORD',
          data: recordData
        });

        // Update cache locally
        const existingRecords = await offlineStorageService.getCachedMedicalRecords();
        const records = existingRecords?.data || [];
        const recordIndex = records.findIndex(r => r.id === recordId);
        if (recordIndex >= 0) {
          records[recordIndex] = { ...records[recordIndex], ...recordData };
          await offlineStorageService.cacheMedicalRecords(records);
        }

        setLoading(false);
        Alert.alert(
          'Record Updated Offline',
          'Your changes have been saved locally and will sync when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Delete removed attachments
      for (const attachment of removedAttachments) {
        await deleteAttachment(attachment);
      }

      // Upload new attachments if online
      const uploadedAttachments = [];
      for (const attachment of newAttachments) {
        const uploaded = await uploadAttachment(attachment);
        uploadedAttachments.push(uploaded);
      }

      // Get family member name
      const familyMember = familyMembers.find(m => m.id === formData.familyMemberId);
      
      // Update record
      const recordData = {
        ...formData,
        familyMemberName: familyMember ? 
          (familyMember.title ? `${familyMember.title} ${familyMember.name}` : familyMember.name) : '',
        attachments: [...attachments, ...uploadedAttachments],
        userId: user.uid,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'medicalRecords', recordId), recordData);
      
      // Update cache
      const existingRecords = await offlineStorageService.getCachedMedicalRecords();
      const records = existingRecords?.data || [];
      const recordIndex = records.findIndex(r => r.id === recordId);
      if (recordIndex >= 0) {
        records[recordIndex] = { ...records[recordIndex], ...recordData };
        await offlineStorageService.cacheMedicalRecords(records);
      }

      setLoading(false);
      Alert.alert('Success', 'Record updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating record:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to update record. Please try again.');
    }
  };

  // Payment tracking functions
  const calculatePaymentStatus = () => {
    if (!formData.billAmount || formData.billAmount <= 0) return 'pending';
    
    const billAmount = parseFloat(formData.billAmount);
    const totalPaid = formData.totalPaid || 0;
    
    if (totalPaid >= billAmount) return 'paid';
    if (totalPaid > 0) return 'partial';
    return 'pending';
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Fully Paid';
      case 'partial': return 'Partially Paid';
      default: return 'Pending Payment';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#f59e0b';
      default: return '#ef4444';
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'partial': return 'time';
      default: return 'close-circle';
    }
  };

  // Dynamic field rendering functions
  const renderDynamicFields = () => {
    switch (formData.type) {
      case 'hospital_card':
        return renderHospitalCardFields();
      case 'insurance':
        return renderInsuranceFields();
      case 'bill':
        return renderMedicalBillFields();
      default:
        return renderDefaultFields();
    }
  };

  // Hospital Card specific fields
  const renderHospitalCardFields = () => (
    <>
      {/* Country */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter country"
          value={formData.country}
          onChangeText={(value) => updateFormData('country', value)}
        />
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter city"
          value={formData.city}
          onChangeText={(value) => updateFormData('city', value)}
        />
      </View>

      {/* Region */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Region/State</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter region or state"
          value={formData.region}
          onChangeText={(value) => updateFormData('region', value)}
        />
      </View>

      {/* Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hospital/Clinic Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter hospital or clinic name"
          value={formData.hospital}
          onChangeText={(value) => updateFormData('hospital', value)}
        />
      </View>

      {/* Card Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter card number"
          value={formData.cardNumber}
          onChangeText={(value) => updateFormData('cardNumber', value)}
        />
      </View>
    </>
  );

  // Insurance specific fields
  const renderInsuranceFields = () => {
    const selectedProvider = availableProviders.find(p => p.id === formData.provider);
    
    return (
      <>
        {/* Provider */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Insurance Provider *</Text>
          <TouchableOpacity
            style={[
              styles.selector,
              hasFieldError('provider', validationErrors) && styles.inputError
            ]}
            onPress={() => setShowProviderPicker(true)}
          >
            <Text style={[
              selectedProvider ? styles.selectedText : styles.placeholderText
            ]}>
              {selectedProvider ? selectedProvider.name : 'Select insurance provider'}
            </Text>
            <Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Text>
          </TouchableOpacity>
          {formData.provider === 'other' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Enter insurance provider name"
              value={formData.customProvider}
              onChangeText={(value) => updateFormData('customProvider', value)}
            />
          )}
          <ValidationError error={getFieldError('provider', validationErrors)} />
        </View>

        {/* Membership Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Membership Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter membership number"
          value={formData.membershipNo}
          onChangeText={(value) => updateFormData('membershipNo', value)}
        />
      </View>

      {/* Date of Issue */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Issue</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => {
            setSelectedDate(formData.dateOfIssue ? new Date(formData.dateOfIssue) : new Date());
            setShowDatePicker(true);
            setDatePickerMode('dateOfIssue');
          }}
        >
          <Text style={[
            styles.dateInputText,
            !formData.dateOfIssue && styles.dateInputPlaceholder
          ]}>
            {formData.dateOfIssue || 'Select issue date'}
          </Text>
          <Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expiry Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Expiry Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => {
            setSelectedDate(formData.expiryDate ? new Date(formData.expiryDate) : new Date());
            setShowDatePicker(true);
            setDatePickerMode('expiryDate');
          }}
        >
          <Text style={[
            styles.dateInputText,
            !formData.expiryDate && styles.dateInputPlaceholder
          ]}>
            {formData.expiryDate || 'Select expiry date'}
          </Text>
          <Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

  // Medical Bill specific fields
  const renderMedicalBillFields = () => (
    <>
      {/* Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hospital/Clinic *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter hospital or clinic name"
          value={formData.hospital}
          onChangeText={(value) => updateFormData('hospital', value)}
          {...getStandardTextInputProps()}
        />
      </View>

      {/* Bill For */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bill For *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter what the bill is for"
          value={formData.billFor}
          onChangeText={(value) => updateFormData('billFor', value)}
          {...getStandardTextInputProps()}
        />
      </View>

      {/* Bill Amount */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bill Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter bill amount"
          value={formData.billAmount}
          onChangeText={(value) => updateFormData('billAmount', value)}
          keyboardType="numeric"
          {...getStandardTextInputProps()}
        />
      </View>

      {/* Payment Status */}
      {formData.billAmount && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Status</Text>
          <View style={[
            styles.statusContainer,
            getPaymentStatusStyle(calculatePaymentStatus())
          ]}>
            <View style={styles.statusBadge}>
              <Text>
                <Ionicons 
                  name={getPaymentStatusIcon(calculatePaymentStatus())} 
                  size={16} 
                  color={getPaymentStatusColor(calculatePaymentStatus())} 
                />
              </Text>
            </View>
            <Text style={[
              styles.statusText,
              { color: getPaymentStatusColor(calculatePaymentStatus()) }
            ]}>
              {getPaymentStatusText(calculatePaymentStatus())}
            </Text>
          </View>
          {formData.billAmount && (
            <View style={styles.paymentSection}>
              <Text style={styles.paymentSectionTitle}>Payment Details</Text>
              <View style={styles.paymentAmountContainer}>
                <Text style={styles.paymentAmountText}>Total Amount:</Text>
                <Text style={styles.paymentAmountValue}>₵{formData.billAmount}</Text>
              </View>
              <View style={styles.paymentAmountContainer}>
                <Text style={styles.paymentAmountText}>Amount Paid:</Text>
                <Text style={styles.paymentAmountValue}>₵{formData.totalPaid || 0}</Text>
              </View>
              <View style={styles.paymentAmountContainer}>
                <Text style={styles.paymentAmountText}>Balance:</Text>
                <Text style={[styles.paymentAmountValue, { color: '#ef4444' }]}>
                  ₵{Math.max(0, (parseFloat(formData.billAmount) || 0) - (formData.totalPaid || 0))}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );

  // Default fields for prescription/diagnosis
  const renderDefaultFields = () => (
    <>
      {/* Doctor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Doctor</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter doctor's name"
          value={formData.doctor}
          onChangeText={(value) => updateFormData('doctor', value)}
          {...getStandardTextInputProps()}
        />
      </View>
    </>
  );

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case 'paid': return [styles.statusContainer, styles.statusPaid];
      case 'partial': return [styles.statusContainer, styles.statusPartial];
      default: return [styles.statusContainer, styles.statusPending];
    }
  };

  // Modern attachment component
  const renderModernAttachments = () => (
    <View style={styles.attachmentsSection}>
      <Text style={styles.sectionTitle}>
        <Text>
          <Ionicons name="attach" size={20} color="#6366f1" />
        </Text>
        {' Attachments'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {formData.type === 'insurance' 
          ? 'Add front and back photos of your insurance card'
          : 'Add photos or documents related to this record'
        }
      </Text>
      
      <View style={styles.modernAttachmentButtons}>
        <TouchableOpacity 
          style={styles.modernAttachmentButton} 
          onPress={pickImage}
        >
          <View style={styles.attachmentIconContainer}>
            <Text>
              <Ionicons name="camera" size={24} color="#6366f1" />
            </Text>
          </View>
          <Text style={styles.modernAttachmentTitle}>Add Photo</Text>
          <Text style={styles.modernAttachmentSubtitle}>Camera or Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.modernAttachmentButton} 
          onPress={pickDocument}
        >
          <View style={styles.attachmentIconContainer}>
            <Ionicons name="document" size={24} color="#10b981" />
          </View>
          <Text style={styles.modernAttachmentTitle}>Add Document</Text>
          <Text style={styles.modernAttachmentSubtitle}>PDF or Image</Text>
        </TouchableOpacity>
      </View>

      {/* Combined Attachments List */}
      {(attachments.length > 0 || newAttachments.length > 0) && (
        <View style={styles.modernAttachmentsList}>
          <Text style={styles.attachedFilesTitle}>
            Attached Files ({attachments.length + newAttachments.length})
          </Text>
          
          {/* Existing Attachments */}
          {attachments.map((attachment, index) => (
            <View key={`existing-${index}`} style={styles.modernAttachmentItem}>
              <View style={styles.attachmentPreviewContainer}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.url }} style={styles.modernAttachmentPreview} />
                ) : (
                  <View style={styles.modernDocumentPreview}>
                    <Ionicons name="document" size={32} color="#6366f1" />
                  </View>
                )}
              </View>
              <View style={styles.modernAttachmentInfo}>
                <Text style={styles.modernAttachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text style={styles.modernAttachmentSize}>
                  {attachment.size ? (attachment.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                </Text>
                <Text style={styles.modernAttachmentType}>Existing • {attachment.type}</Text>
              </View>
              <TouchableOpacity
                style={styles.modernRemoveButton}
                onPress={() => removeExistingAttachment(index)}
              >
                <Ionicons name="close" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          {/* New Attachments */}
          {newAttachments.map(attachment => (
            <View key={`new-${attachment.id}`} style={styles.modernAttachmentItem}>
              <View style={styles.attachmentPreviewContainer}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.modernAttachmentPreview} />
                ) : (
                  <View style={styles.modernDocumentPreview}>
                    <Ionicons name="document" size={32} color="#10b981" />
                  </View>
                )}
              </View>
              <View style={styles.modernAttachmentInfo}>
                <Text style={styles.modernAttachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text style={styles.modernAttachmentSize}>
                  {attachment.size ? (attachment.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                </Text>
                <Text style={styles.modernAttachmentType}>New • {attachment.type}</Text>
              </View>
              <TouchableOpacity
                style={styles.modernRemoveButton}
                onPress={() => removeNewAttachment(attachment.id)}
              >
                <Ionicons name="close" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

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
              <Text style={styles.memberOptionSubtext}>
                {getGenderSpecificRelationship(member.relationship, member.gender)}
              </Text>
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

  const DatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.datePickerModal}>
        <View style={styles.datePickerContainer}>
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleDatePickerDone}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          <WrappedDateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        </View>
      </View>
    </Modal>
  );

  // Provider Picker Modal
  const ProviderPickerModal = () => (
    <Modal
      visible={showProviderPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowProviderPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Insurance Provider</Text>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
            {availableProviders.map(provider => (
              <TouchableOpacity
                key={provider.id}
                style={styles.memberOption}
                onPress={() => {
                  updateFormData('provider', provider.id);
                  setShowProviderPicker(false);
                }}
              >
                <Text style={styles.memberOptionText}>{provider.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowProviderPicker(false)}
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Loading Overlay */}
        {isLoading && <LoadingSpinner />}
        
        {/* Offline Indicator */}
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="#ef4444" />
            <Text style={styles.offlineText}>Offline - Changes will sync when online</Text>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {/* Record Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Record Type *</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  hasFieldError('type', validationErrors) && styles.inputError
                ]}
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
              <ValidationError error={getFieldError('type', validationErrors)} />
            </View>

            {/* Family Member */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Family Member *</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  hasFieldError('familyMemberId', validationErrors) && styles.inputError
                ]}
                onPress={() => setShowMemberPicker(true)}
              >
                {selectedMember ? (
                  <View style={styles.selectedOption}>
                    <Text style={styles.selectedText}>{selectedMember.name}</Text>
                    <Text style={styles.selectedSubtext}>
                      {getGenderSpecificRelationship(selectedMember.relationship, selectedMember.gender)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select family member</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
              <ValidationError error={getFieldError('familyMemberId', validationErrors)} />
            </View>

            {/* Title - Only show for prescription, diagnosis, and medical bill */}
            {formData.type && !['hospital_card', 'insurance'].includes(formData.type) && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={[
                    styles.input,
                    hasFieldError('title', validationErrors) && styles.inputError
                  ]}
                  placeholder="Enter record title"
                  value={formData.title}
                  onChangeText={(value) => updateFormData('title', value)}
                />
                <ValidationError error={getFieldError('title', validationErrors)} />
              </View>
            )}

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

            {/* Dynamic Fields based on record type */}
            {renderDynamicFields()}

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  hasFieldError('date', validationErrors) && styles.inputError
                ]}
                onPress={handleDateSelect}
              >
                <Text style={[
                  styles.dateInputText,
                  !formData.date && styles.dateInputPlaceholder
                ]}>
                  {formData.date || 'Select date'}
                </Text>
                <Ionicons name="calendar" size={20} color="#666" />
              </TouchableOpacity>
              <ValidationError error={getFieldError('date', validationErrors)} />
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

            {/* Modern Attachments */}
            {renderModernAttachments()}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Updating Record...' : 'Update Record'}
              </Text>
            </TouchableOpacity>
          </View>

          <TypePickerModal />
          <MemberPickerModal />
          <DatePickerModal />
          <ProviderPickerModal />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  offlineIndicator: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  offlineText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
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
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
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
  dateInput: {
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
  dateInputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dateInputPlaceholder: {
    color: '#9ca3af',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  attachmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  attachmentsList: {
    gap: 12,
  },
  attachmentsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  documentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#6b7280',
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
  modalScrollView: {
    maxHeight: 300,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentSection: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  paymentAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentAmountText: {
    fontSize: 14,
    color: '#4b5563',
  },
  paymentAmountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  attachmentsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  modernAttachmentButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  modernAttachmentButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernAttachmentTitle: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  modernAttachmentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernAttachmentsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachedFilesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modernAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  attachmentPreviewContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  modernAttachmentPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  modernDocumentPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAttachmentInfo: {
    flex: 1,
  },
  modernAttachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  modernAttachmentSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  modernAttachmentType: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  modernRemoveButton: {
    padding: 8,
  },
  // Date picker styles
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  dateInputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dateInputPlaceholder: {
    color: '#9ca3af',
  },
  // Attachment section styles
  attachmentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  modernAttachmentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modernAttachmentButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachmentIconContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 50,
    padding: 8,
    marginBottom: 8,
  },
  modernAttachmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  modernAttachmentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernAttachmentsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachedFilesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modernAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  attachmentPreviewContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAttachmentPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modernDocumentPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status and payment styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPaid: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
  },
  statusPartial: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b',
  },
  statusPending: {
    backgroundColor: '#ef444420',
    borderColor: '#ef4444',
  },
  paymentSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  paymentAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentAmountText: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentAmountValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
});

export default EditRecordScreen;
