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
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

const AddRecordScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { canUploadFile } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  
  // Get preselected type from route params if any
  const preselectedType = route?.params?.type || '';
  
  const [formData, setFormData] = useState({
    type: preselectedType,
    title: '',
    description: '',
    familyMemberId: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    // Hospital Card specific fields
    country: '',
    city: '',
    region: '',
    hospital: '',
    cardNumber: '',
    customCity: '',
    customRegion: '',
    // Insurance specific fields
    provider: '',
    membershipNo: '',
    dateOfIssue: '',
    expiryDate: '',
    customProvider: '',
    // Medical Bill specific fields
    billFor: '',
    billAmount: '',
    payments: [], // Array of payment records
    // Payment tracking
    totalPaid: 0,
    paymentStatus: 'pending', // pending, partial, paid
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [attachments, setAttachments] = useState([]);
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
  const [customProvider, setCustomProvider] = useState('');
  const [showCustomProviderInput, setShowCustomProviderInput] = useState(false);
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
    setFormData(prev => {
      const newData = { ...prev, [key]: value };
      
      // Handle cascading dropdowns
      if (key === 'country') {
        // Reset city and region when country changes
        newData.city = '';
        newData.region = '';
        // Update available cities and regions
        setAvailableCities(getCitiesByCountry(value));
        setAvailableRegions(getRegionsByCountry(value));
        setAvailableProviders(getInsuranceProvidersByCountry(value));
      }
      
      return newData;
    });
  };

  // Adding a new function to open camera
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
      
      setAttachments(prev => [...prev, {
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

  const handleSubmit = async () => {
    // Build validation rules based on record type
    const validationRules = {
      type: { required: true, message: 'Please select a record type' },
      familyMemberId: { required: true, message: 'Please select a family member' },
      date: { required: true, date: true, message: 'Please enter a valid date' }
    };

    // Only require title for prescription, diagnosis, and medical bill
    if (formData.type && !['hospital_card', 'insurance'].includes(formData.type)) {
      validationRules.title = { required: true, minLength: 3, message: 'Title must be at least 3 characters' };
    }

    // Add specific validation rules based on record type
    if (formData.type === 'hospital_card') {
      validationRules.country = { required: true, message: 'Please select a country' };
      validationRules.city = { required: true, message: 'Please select a city' };
      validationRules.hospital = { required: true, message: 'Please enter hospital name' };
    } else if (formData.type === 'insurance') {
      validationRules.provider = { required: true, message: 'Please select an insurance provider' };
      validationRules.membershipNo = { required: true, message: 'Please enter membership number' };
    } else if (formData.type === 'bill') {
      validationRules.hospital = { required: true, message: 'Please enter hospital name' };
      validationRules.billFor = { required: true, message: 'Please specify what the bill is for' };
      validationRules.billAmount = { required: true, message: 'Please enter bill amount' };
    }

    // Validate form
    const validation = validateForm(formData, validationRules);

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

        setLoading(false);
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

      const docRef = await addDoc(collection(db, 'medicalRecords'), recordData);
      
      // Update cache
      const existingRecords = await offlineStorageService.getCachedMedicalRecords();
      const records = existingRecords?.data || [];
      records.unshift({...recordData, id: docRef.id});
      await offlineStorageService.cacheMedicalRecords(records);

      setLoading(false);
      Alert.alert('Success', 'Record added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding record:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to add record. Please try again.');
    }
  };

  // Helper function to render dynamic form fields based on record type
  const renderDynamicFields = () => {
    switch (formData.type) {
      case 'hospital_card':
        return renderHospitalCardFields();
      case 'insurance':
        return renderInsuranceFields();
      case 'bill':
        return renderMedicalBillFields();
      case 'prescription':
      case 'diagnosis':
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
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={[
            formData.country ? styles.selectedText : styles.placeholderText
          ]}>
            {COUNTRIES.find(c => c.id === formData.country)?.name || 'Select country'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City *</Text>
        <TouchableOpacity
          style={[styles.selector, !formData.country && styles.selectorDisabled]}
          onPress={() => formData.country && setShowCityPicker(true)}
          disabled={!formData.country}
        >
          <Text style={[
            formData.city ? styles.selectedText : styles.placeholderText
          ]}>
            {availableCities.find(c => c.id === formData.city)?.name || 
             (formData.country ? 'Select city' : 'Select country first')}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {formData.city === 'other' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Enter city name"
            value={formData.customCity || ''}
            onChangeText={(value) => updateFormData('customCity', value)}
            {...getStandardTextInputProps()}
          />
        )}
      </View>

      {/* Region */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Region/State</Text>
        <TouchableOpacity
          style={[styles.selector, !formData.country && styles.selectorDisabled]}
          onPress={() => formData.country && setShowRegionPicker(true)}
          disabled={!formData.country}
        >
          <Text style={[
            formData.region ? styles.selectedText : styles.placeholderText
          ]}>
            {availableRegions.find(r => r.id === formData.region)?.name || 
             (formData.country ? 'Select region' : 'Select country first')}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {formData.region === 'other' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Enter region/state name"
            value={formData.customRegion || ''}
            onChangeText={(value) => updateFormData('customRegion', value)}
            {...getStandardTextInputProps()}
          />
        )}
      </View>

      {/* Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hospital/Clinic Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter hospital or clinic name"
          value={formData.hospital}
          onChangeText={(value) => updateFormData('hospital', value)}
          {...getStandardTextInputProps()}
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
          {...getStandardTextInputProps()}
        />
      </View>
    </>
  );

  // Insurance specific fields
  const renderInsuranceFields = () => (
    <>
      {/* Provider */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Insurance Provider *</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowProviderPicker(true)}
        >
          <Text style={[
            formData.provider ? styles.selectedText : styles.placeholderText
          ]}>
            {availableProviders.find(p => p.id === formData.provider)?.name || 'Select insurance provider'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {formData.provider === 'other' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Enter insurance provider name"
            value={formData.customProvider}
            onChangeText={(value) => updateFormData('customProvider', value)}
            {...getStandardTextInputProps()}
          />
        )}
      </View>

      {/* Membership Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Membership Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter membership number"
          value={formData.membershipNo}
          onChangeText={(value) => updateFormData('membershipNo', value)}
          {...getStandardTextInputProps()}
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
          <Ionicons name="calendar" size={20} color="#666" />
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
          <Ionicons name="calendar" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </>
  );

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
          placeholder="What is this bill for?"
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
          placeholder="Enter amount (e.g., 150.00)"
          value={formData.billAmount}
          onChangeText={(value) => {
            updateFormData('billAmount', value);
            calculatePaymentStatus(value, formData.totalPaid);
          }}
          keyboardType="decimal-pad"
          {...getStandardTextInputProps()}
        />
      </View>

      {/* Payment Status */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Status</Text>
        <View style={[styles.statusContainer, getPaymentStatusStyle(formData.paymentStatus)]}>
          <Ionicons 
            name={getPaymentStatusIcon(formData.paymentStatus)} 
            size={20} 
            color={getPaymentStatusColor(formData.paymentStatus)} 
          />
          <Text style={[styles.statusText, { color: getPaymentStatusColor(formData.paymentStatus) }]}>
            {getPaymentStatusText(formData.paymentStatus)}
          </Text>
        </View>
      </View>

      {/* Total Paid */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount Paid</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount paid (e.g., 75.00)"
          value={formData.totalPaid.toString()}
          onChangeText={(value) => {
            const paidAmount = parseFloat(value) || 0;
            updateFormData('totalPaid', paidAmount);
            calculatePaymentStatus(formData.billAmount, value);
          }}
          keyboardType="decimal-pad"
          {...getStandardTextInputProps()}
        />
      </View>
    </>
  );

  // Default fields for Prescription and Diagnosis
  const renderDefaultFields = () => (
    <>
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
          {...getStandardTextInputProps()}
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
          {...getStandardTextInputProps()}
        />
      </View>
    </>
  );

  // Payment status helper functions
  const calculatePaymentStatus = (billAmount, paidAmount) => {
    const bill = parseFloat(billAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    
    let status = 'pending';
    if (paid === 0) {
      status = 'pending';
    } else if (paid >= bill) {
      status = 'paid';
    } else {
      status = 'partial';
    }
    
    updateFormData('paymentStatus', status);
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Fully Paid';
      case 'partial': return 'Partially Paid';
      case 'pending': 
      default: return 'Pending Payment';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'pending': 
      default: return '#ef4444';
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'partial': return 'time';
      case 'pending': 
      default: return 'alert-circle';
    }
  };

  const getPaymentStatusStyle = (status) => {
    const baseStyle = styles.statusBadge;
    switch (status) {
      case 'paid': return [baseStyle, styles.statusPaid];
      case 'partial': return [baseStyle, styles.statusPartial];
      case 'pending': 
      default: return [baseStyle, styles.statusPending];
    }
  };

  // Modern attachment component
  const renderModernAttachments = () => (
    <View style={styles.attachmentsSection}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="attach" size={20} color="#6366f1" /> Attachments
      </Text>
      <Text style={styles.sectionSubtitle}>
        {formData.type === 'insurance' 
          ? 'Add front and back photos of your insurance card'
          : 'Add photos or documents related to this record'
        }
      </Text>
      
      <View style={styles.modernAttachmentButtons}>
        <TouchableOpacity style={styles.modernAttachmentButton} onPress={pickImage}>
          <View style={styles.attachmentIconContainer}>
            <Ionicons name="camera" size={28} color="#6366f1" />
          </View>
          <Text style={styles.modernAttachmentTitle}>Add Photo</Text>
          <Text style={styles.modernAttachmentSubtitle}>Camera or Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modernAttachmentButton} onPress={pickDocument}>
          <View style={styles.attachmentIconContainer}>
            <Ionicons name="document-text" size={28} color="#6366f1" />
          </View>
          <Text style={styles.modernAttachmentTitle}>Add Document</Text>
          <Text style={styles.modernAttachmentSubtitle}>PDF, Images</Text>
        </TouchableOpacity>
      </View>

      {attachments.length > 0 && (
        <View style={styles.modernAttachmentsList}>
          <Text style={styles.attachedFilesTitle}>Attached Files ({attachments.length})</Text>
          {attachments.map(attachment => (
            <View key={attachment.id} style={styles.modernAttachmentItem}>
              <View style={styles.attachmentPreviewContainer}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.modernAttachmentPreview} />
                ) : (
                  <View style={styles.modernDocumentPreview}>
                    <Ionicons name="document-text" size={32} color="#6366f1" />
                  </View>
                )}
              </View>
              <View style={styles.modernAttachmentInfo}>
                <Text style={styles.modernAttachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text style={styles.modernAttachmentSize}>
                  {(attachment.size / 1024).toFixed(1)} KB
                </Text>
                <Text style={styles.modernAttachmentType}>
                  {attachment.type === 'image' ? 'Image' : 'Document'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modernRemoveButton}
                onPress={() => removeAttachment(attachment.id)}
              >
                <Ionicons name="trash" size={20} color="#ef4444" />
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

  // Country Picker Modal
  const CountryPickerModal = () => (
    <Modal
      visible={showCountryPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCountryPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Country</Text>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
            {COUNTRIES.map(country => (
              <TouchableOpacity
                key={country.id}
                style={styles.memberOption}
                onPress={() => {
                  updateFormData('country', country.id);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={styles.memberOptionText}>{country.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowCountryPicker(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // City Picker Modal
  const CityPickerModal = () => (
    <Modal
      visible={showCityPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCityPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select City</Text>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
            {availableCities.map(city => (
              <TouchableOpacity
                key={city.id}
                style={styles.memberOption}
                onPress={() => {
                  updateFormData('city', city.id);
                  setShowCityPicker(false);
                }}
              >
                <Text style={styles.memberOptionText}>{city.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowCityPicker(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Region Picker Modal
  const RegionPickerModal = () => (
    <Modal
      visible={showRegionPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRegionPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Region</Text>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
            {availableRegions.map(region => (
              <TouchableOpacity
                key={region.id}
                style={styles.memberOption}
                onPress={() => {
                  updateFormData('region', region.id);
                  setShowRegionPicker(false);
                }}
              >
                <Text style={styles.memberOptionText}>{region.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowRegionPicker(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
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
                  if (provider.id === 'other') {
                    setShowCustomProviderInput(true);
                  }
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

        {/* Show rest of form only when type is selected */}
        {formData.type ? (
          <>
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

        {/* Dynamic fields based on record type */}
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
            {...getStandardTextInputProps()}
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
            {loading ? 'Adding Record...' : 'Add Record'}
          </Text>
        </TouchableOpacity>
          </>
        ) : (
          /* Show message when no type is selected */
          <View style={styles.noTypeSelected}>
            <Ionicons name="information-circle-outline" size={48} color="#9ca3af" />
            <Text style={styles.noTypeTitle}>Select a Record Type</Text>
            <Text style={styles.noTypeSubtitle}>
              Choose the type of medical record you want to add to continue
            </Text>
          </View>
        )}
          </View>

          <TypePickerModal />
          <MemberPickerModal />
          <DatePickerModal />
          <CountryPickerModal />
          <CityPickerModal />
          <RegionPickerModal />
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
  selectorDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    opacity: 0.6,
  },
  selectedOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dateIcon: {
    marginLeft: 8,
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
  noTypeSelected: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noTypeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noTypeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  attachmentsSection: {
    marginTop: 24,
    marginBottom: 32,
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
  modernAttachmentInfo: {
    flex: 1,
  },
  modernAttachmentName: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  modernAttachmentSize: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  modernAttachmentType: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modernRemoveButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Dynamic field container styles
  dynamicFieldsContainer: {
    marginTop: 16,
  },
  fieldGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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

export default AddRecordScreen;
