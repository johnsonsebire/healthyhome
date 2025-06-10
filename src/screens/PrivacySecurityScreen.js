import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

const PRIVACY_PREFERENCES_KEY = 'privacy_preferences';

const PrivacySecurityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [preferences, setPreferences] = useState({
    biometricLogin: false,
    screenLock: false,
    dataEncryption: true,
    anonymizeData: false,
    passwordProtectExports: false,
    autoLogout: true,
    autoLogoutTime: 15, // minutes
    rememberLoginInfo: true,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  
  useEffect(() => {
    checkBiometricAvailability();
    loadPreferences();
  }, []);
  
  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.length > 0) {
        setBiometricAvailable(true);
        
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else {
          setBiometricType('Biometric');
        }
      }
    }
  };
  
  const loadPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem(PRIVACY_PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error);
    }
  };
  
  const savePreferences = async (newPrefs) => {
    try {
      await AsyncStorage.setItem(PRIVACY_PREFERENCES_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving privacy preferences:', error);
      Alert.alert('Error', 'Failed to save your privacy preferences');
    }
  };
  
  const togglePreference = (key) => {
    // Handle special cases
    if (key === 'biometricLogin' && !biometricAvailable && !preferences[key]) {
      Alert.alert(
        'Biometric Login Unavailable',
        'Your device does not support biometric authentication.'
      );
      return;
    }
    
    if (key === 'passwordProtectExports' && !preferences[key]) {
      setShowPasswordModal(true);
      return;
    }
    
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    savePreferences(newPrefs);
  };
  
  const saveExportPassword = () => {
    if (exportPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }
    
    const newPrefs = { 
      ...preferences, 
      passwordProtectExports: true,
      exportPassword: exportPassword 
    };
    savePreferences(newPrefs);
    setShowPasswordModal(false);
  };
  
  const updateAutoLogoutTime = (time) => {
    const newPrefs = { ...preferences, autoLogoutTime: time };
    savePreferences(newPrefs);
  };

  const handleDataDeletion = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all your personal data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please type "DELETE" to confirm that you want to permanently delete all your data.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: () => {
                    // In a real app, this would delete user data
                    Alert.alert('Data Deleted', 'All your personal data has been deleted.');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };
  
  const SettingItem = ({ title, description, value, onToggle, disabled = false }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
        thumbColor={value ? '#6366f1' : '#f4f4f5'}
      />
    </View>
  );
  
  const TimeSelector = () => (
    <View style={styles.timeSelector}>
      <TouchableOpacity
        style={[
          styles.timeOption,
          preferences.autoLogoutTime === 5 && styles.timeOptionSelected
        ]}
        onPress={() => updateAutoLogoutTime(5)}
      >
        <Text style={[
          styles.timeOptionText,
          preferences.autoLogoutTime === 5 && styles.timeOptionTextSelected
        ]}>5 min</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.timeOption,
          preferences.autoLogoutTime === 15 && styles.timeOptionSelected
        ]}
        onPress={() => updateAutoLogoutTime(15)}
      >
        <Text style={[
          styles.timeOptionText,
          preferences.autoLogoutTime === 15 && styles.timeOptionTextSelected
        ]}>15 min</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.timeOption,
          preferences.autoLogoutTime === 30 && styles.timeOptionSelected
        ]}
        onPress={() => updateAutoLogoutTime(30)}
      >
        <Text style={[
          styles.timeOptionText,
          preferences.autoLogoutTime === 30 && styles.timeOptionTextSelected
        ]}>30 min</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication</Text>
          
          <SettingItem
            title={`${biometricType} Login`}
            description={`Use ${biometricType.toLowerCase()} to quickly access your account`}
            value={preferences.biometricLogin}
            onToggle={() => togglePreference('biometricLogin')}
            disabled={!biometricAvailable}
          />
          
          <SettingItem
            title="Screen Lock"
            description="Lock the app when it's in the background"
            value={preferences.screenLock}
            onToggle={() => togglePreference('screenLock')}
          />
          
          <SettingItem
            title="Auto Logout"
            description={`Automatically log out after ${preferences.autoLogoutTime} minutes of inactivity`}
            value={preferences.autoLogout}
            onToggle={() => togglePreference('autoLogout')}
          />
          
          {preferences.autoLogout && <TimeSelector />}
          
          <SettingItem
            title="Remember Login Info"
            description="Keep your email filled in for convenience"
            value={preferences.rememberLoginInfo}
            onToggle={() => togglePreference('rememberLoginInfo')}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection</Text>
          
          <SettingItem
            title="Data Encryption"
            description="Encrypt sensitive health information"
            value={preferences.dataEncryption}
            onToggle={() => togglePreference('dataEncryption')}
          />
          
          <SettingItem
            title="Anonymize Data"
            description="Remove personal identifiers when sharing with third parties"
            value={preferences.anonymizeData}
            onToggle={() => togglePreference('anonymizeData')}
          />
          
          <SettingItem
            title="Password Protect Exports"
            description="Require a password to open exported files"
            value={preferences.passwordProtectExports}
            onToggle={() => togglePreference('passwordProtectExports')}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="key-outline" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="lock-closed-outline" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Two-Factor Authentication</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="log-out-outline" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Manage Login Sessions</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.dangerSection}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleDataDeletion}
          >
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
            <Text style={styles.dangerButtonText}>Delete All My Data</Text>
          </TouchableOpacity>
          
          <Text style={styles.dangerDescription}>
            This will permanently delete all your personal data, including medical records, family members, and account information.
            This action cannot be undone.
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#6366f1" />
        <Text style={styles.backButtonText}>Back to Settings</Text>
      </TouchableOpacity>
      
      {/* Export Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Export Password</Text>
            <Text style={styles.modalDescription}>
              Create a password that will be required to open your exported files.
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password (min 6 characters)"
              secureTextEntry
              value={exportPassword}
              onChangeText={setExportPassword}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setExportPassword('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveExportPassword}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#e0e7ff',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#4f46e5',
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  dangerSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginLeft: 12,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 32,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  passwordInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalSaveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default PrivacySecurityScreen;
