import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { validateForm, getFieldError, hasFieldError } from '../utils/validation';
import ValidationError from '../components/ValidationError';
import CurrencySettings from '../components/finance/CurrencySettings';

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { withErrorHandling } = useError();
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showCurrencySettings, setShowCurrencySettings] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    profilePhoto: null,
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: user?.email || '',
        phone: userProfile.phone || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        address: userProfile.address || '',
        profilePhoto: userProfile.profilePhoto || null,
      });
    }
  }, [userProfile, user]);

  // Function to take photo with camera
  const takePhoto = async () => {
    if (!isEditing) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, profilePhoto: result.assets[0].uri });
    }
  };

  // Function to choose from gallery
  const chooseFromGallery = async () => {
    if (!isEditing) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery permissions to select images.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, profilePhoto: result.assets[0].uri });
    }
  };

  // Modified pickImage to show options
  const pickImage = async () => {
    if (!isEditing) return;

    Alert.alert(
      'Choose Photo Source',
      'Where would you like to get your profile photo from?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Camera',
          onPress: takePhoto
        },
        {
          text: 'Photo Gallery',
          onPress: chooseFromGallery
        }
      ]
    );
  };

  const handleSave = async () => {
    // Validate form
    const validationRules = {
      firstName: { required: true, message: 'First name is required' },
      lastName: { required: true, message: 'Last name is required' },
    };

    const validationResult = validateForm(formData, validationRules);
    setValidationErrors(validationResult.errors);
    
    if (!validationResult.isValid) {
      return;
    }

    const result = await withErrorHandling(
      async () => {
        setLoading(true);
        
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          dateOfBirth: formData.dateOfBirth || null,
          address: formData.address || null,
          profilePhoto: formData.profilePhoto || null,
          updatedAt: new Date()
        });

        // Refresh user profile after update
        await refreshUserProfile();
        
        return { success: true };
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );

    setLoading(false);
    
    if (result.success) {
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: user?.email || '',
        phone: userProfile.phone || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        address: userProfile.address || '',
        profilePhoto: userProfile.profilePhoto || null,
      });
    }
    setValidationErrors({});
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={pickImage}
          disabled={!isEditing}
        >
          {formData.profilePhoto ? (
            <Image source={{ uri: formData.profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitials}>
                {formData.firstName?.charAt(0) || ''}{formData.lastName?.charAt(0) || ''}
              </Text>
              {isEditing && (
                <View style={styles.editPhotoOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              )}
            </View>
          )}
          {isEditing && formData.profilePhoto && (
            <View style={styles.editPhotoOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Profile' : 'My Profile'}
        </Text>
        
        <View style={styles.actionButtons}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
                {loading ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[
              styles.input,
              isEditing ? styles.inputEditable : styles.inputDisabled,
              hasFieldError('firstName', validationErrors) && styles.inputError
            ]}
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            placeholder="Enter first name"
            editable={isEditing}
          />
          {isEditing && <ValidationError error={getFieldError('firstName', validationErrors)} />}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={[
              styles.input,
              isEditing ? styles.inputEditable : styles.inputDisabled,
              hasFieldError('lastName', validationErrors) && styles.inputError
            ]}
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            placeholder="Enter last name"
            editable={isEditing}
          />
          {isEditing && <ValidationError error={getFieldError('lastName', validationErrors)} />}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={formData.email}
            placeholder="Email address"
            editable={false}
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[
              styles.input,
              isEditing ? styles.inputEditable : styles.inputDisabled
            ]}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={[
              styles.input,
              isEditing ? styles.inputEditable : styles.inputDisabled
            ]}
            value={formData.dateOfBirth}
            onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
            placeholder="MM/DD/YYYY"
            editable={isEditing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              isEditing ? styles.inputEditable : styles.inputDisabled
            ]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
            editable={isEditing}
          />
        </View>

        {/* User Preferences Section */}
        <View style={styles.preferencesContainer}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity 
            style={styles.preferenceItem}
            onPress={() => setShowCurrencySettings(true)}
          >
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceTitle}>Currency Settings</Text>
              <Text style={styles.preferenceDescription}>
                Manage your currency preferences and conversion settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Currency Settings Modal */}
      <CurrencySettings
        visible={showCurrencySettings}
        onClose={() => setShowCurrencySettings(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#ffffff',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputEditable: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    color: '#6b7280',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  preferencesContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ProfileScreen;
