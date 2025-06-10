import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { requestNotificationPermissions } from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';

const NotificationsScreen = ({ navigation }) => {
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [preferences, setPreferences] = useState({
    appointmentReminders: true,
    medicationReminders: true,
    recordUpdates: true,
    familyUpdates: true,
    insuranceReminders: true,
    appUpdates: true,
  });
  
  useEffect(() => {
    checkPermissions();
    loadPreferences();
  }, []);
  
  const checkPermissions = async () => {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } else {
      setPermissionStatus('unavailable');
    }
  };
  
  const requestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionStatus(granted ? 'granted' : 'denied');
    
    if (granted) {
      Alert.alert(
        'Notifications Enabled',
        'You will now receive important notifications about your health records and appointments.'
      );
    }
  };
  
  const loadPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };
  
  const savePreferences = async (newPrefs) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save your notification preferences');
    }
  };
  
  const togglePreference = (key) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    savePreferences(newPrefs);
  };
  
  const NotificationTypeItem = ({ title, description, icon, prefKey }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationItemLeft}>
        <View style={[styles.iconContainer, permissionStatus !== 'granted' && styles.iconDisabled]}>
          <Ionicons name={icon} size={24} color={permissionStatus === 'granted' ? '#6366f1' : '#9ca3af'} />
        </View>
        <View style={styles.notificationItemContent}>
          <Text style={styles.notificationItemTitle}>{title}</Text>
          <Text style={styles.notificationItemDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={permissionStatus === 'granted' && preferences[prefKey]}
        onValueChange={() => togglePreference(prefKey)}
        disabled={permissionStatus !== 'granted'}
        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
        thumbColor={preferences[prefKey] && permissionStatus === 'granted' ? '#6366f1' : '#f4f4f5'}
      />
    </View>
  );
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      
      <View style={styles.permissionSection}>
        <View style={styles.permissionContent}>
          <Ionicons 
            name={permissionStatus === 'granted' ? 'notifications' : 'notifications-off'} 
            size={32} 
            color={permissionStatus === 'granted' ? '#10b981' : '#f59e0b'} 
            style={styles.permissionIcon}
          />
          <View>
            <Text style={styles.permissionTitle}>
              {permissionStatus === 'granted' 
                ? 'Notifications Enabled' 
                : permissionStatus === 'denied'
                  ? 'Notifications Disabled'
                  : permissionStatus === 'unavailable'
                    ? 'Notifications Unavailable'
                    : 'Notification Permission Required'}
            </Text>
            <Text style={styles.permissionDescription}>
              {permissionStatus === 'granted' 
                ? 'You will receive notifications about appointments, medication reminders, and important updates.'
                : permissionStatus === 'denied'
                  ? 'You will not receive important health reminders. Please enable notifications in your device settings.'
                  : permissionStatus === 'unavailable'
                    ? 'Notifications are not available on this device.'
                    : 'Please allow notifications to receive important reminders and updates.'}
            </Text>
          </View>
        </View>
        
        {permissionStatus !== 'granted' && permissionStatus !== 'unavailable' && (
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        
        <NotificationTypeItem
          title="Appointment Reminders"
          description="Get reminded about upcoming medical appointments"
          icon="calendar"
          prefKey="appointmentReminders"
        />
        
        <NotificationTypeItem
          title="Medication Reminders"
          description="Receive alerts when it's time to take your medication"
          icon="medical"
          prefKey="medicationReminders"
        />
        
        <NotificationTypeItem
          title="Medical Record Updates"
          description="Be notified when your medical records are updated"
          icon="document-text"
          prefKey="recordUpdates"
        />
        
        <NotificationTypeItem
          title="Family Updates"
          description="Get notifications about your family members' health"
          icon="people"
          prefKey="familyUpdates"
        />
        
        <NotificationTypeItem
          title="Insurance Reminders"
          description="Receive alerts about insurance renewals and changes"
          icon="shield-checkmark"
          prefKey="insuranceReminders"
        />
        
        <NotificationTypeItem
          title="App Updates"
          description="Be notified about new features and improvements"
          icon="megaphone"
          prefKey="appUpdates"
        />
        
        <View style={styles.tipSection}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <Text style={styles.tipText}>
            You can also customize notification times for medication reminders in the Medications section.
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
  permissionSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    marginRight: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconDisabled: {
    backgroundColor: '#f3f4f6',
  },
  notificationItemContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationItemDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  tipSection: {
    flexDirection: 'row',
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#4f46e5',
    marginLeft: 8,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
});

export default NotificationsScreen;
