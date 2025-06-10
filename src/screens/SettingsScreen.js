import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError } from '../contexts/ErrorContext';
import dataExportService from '../services/dataExport';
import offlineStorageService from '../services/offlineStorage';
import { openStoreRating, recordAppRated } from '../services/appRating';
import { APP_CONFIG } from '../constants';

const SettingsScreen = ({ navigation }) => {
  const { user, userProfile, logout } = useAuth();
  const { subscription, currentPlan, plans } = useSubscription();
  const { addError, withErrorHandling } = useError();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV Format', onPress: () => exportToCSV() },
        { text: 'Complete Report', onPress: () => exportHealthReport() },
      ]
    );
  };

  const exportToCSV = async () => {
    const result = await withErrorHandling(async () => {
      // In a real app, you would fetch this data from your database
      const mockRecords = [
        {
          id: '1',
          date: new Date().toISOString(),
          type: 'prescription',
          title: 'Blood Pressure Medication',
          description: 'Lisinopril 10mg daily',
          doctor: 'Dr. Smith',
          hospital: 'City Medical Center',
          notes: 'Take with food',
          files: []
        }
      ];

      return dataExportService.exportMedicalRecordsToCSV(mockRecords);
    }, {
      errorType: 'STORAGE',
      errorSeverity: 'MEDIUM'
    });

    if (result.success && result.data.success) {
      Alert.alert(
        'Export Successful',
        `Exported ${result.data.recordCount} records`,
        [
          { text: 'Share', onPress: () => dataExportService.shareFile(result.data.fileUri) },
          { text: 'OK' }
        ]
      );
    }
  };

  const exportHealthReport = async () => {
    const result = await withErrorHandling(async () => {
      const userData = {
        userProfile: userProfile || {},
        familyMembers: [],
        medicalRecords: [],
        appointments: [],
        insuranceInfo: {}
      };

      return dataExportService.createHealthReport(userData);
    }, {
      errorType: 'STORAGE',
      errorSeverity: 'MEDIUM'
    });

    if (result.success && result.data.success) {
      Alert.alert(
        'Report Generated',
        'Your health report has been created',
        [
          { text: 'Share', onPress: () => dataExportService.shareFile(result.data.fileUri) },
          { text: 'OK' }
        ]
      );
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all offline data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const success = await offlineStorageService.clearAllCache();
            if (success) {
              Alert.alert('Success', 'Cache cleared successfully');
            } else {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleViewCacheInfo = async () => {
    const cacheInfo = await offlineStorageService.getCacheInfo();
    if (cacheInfo) {
      Alert.alert(
        'Cache Information',
        `Total size: ${cacheInfo.formattedSize}\nItems cached: ${Object.keys(cacheInfo.items).length}`
      );
    }
  };

  const handleRateApp = async () => {
    Alert.alert(
      'Rate Our App',
      'Would you like to rate Family Medical App in the app store?',
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Rate App', 
          onPress: async () => {
            const success = await openStoreRating();
            if (success) {
              Alert.alert('Thank You', 'Thank you for rating our app!');
            }
          } 
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, color = "#6366f1" }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>
            {userProfile?.firstName?.charAt(0) || 'U'}{userProfile?.lastName?.charAt(0) || 'S'}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {userProfile?.firstName || 'User'} {userProfile?.lastName || 'Name'}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.subscriptionBadge}>
          <Text style={styles.subscriptionText}>
            {plans && plans[currentPlan] ? plans[currentPlan].name : 'Basic'} Plan
          </Text>
        </View>
      </View>

      {/* Account Settings */}
      <SettingSection title="Account">
        <SettingItem
          icon="person-outline"
          title="Profile"
          subtitle="Manage your personal information"
          onPress={() => navigation.navigate('Profile')}
        />
        <SettingItem
          icon="people-outline"
          title="Family Members"
          subtitle="Manage family member profiles"
          onPress={() => navigation.navigate('FamilyMember')}
          color="#10b981"
        />
        <SettingItem
          icon="git-network-outline"
          title="Family Tree"
          subtitle="Visualize your family connections"
          onPress={() => navigation.navigate('FamilyTree')}
          color="#06b6d4"
        />
        <SettingItem
          icon="share-social-outline"
          title="Family Sharing"
          subtitle="Manage how you share medical records"
          onPress={() => navigation.navigate('FamilySharing')}
          color="#3b82f6"
        />
        <SettingItem
          icon="card-outline"
          title="Subscription"
          subtitle={`Current plan: ${plans && plans[currentPlan] ? plans[currentPlan].name : 'Basic'}`}
          onPress={() => navigation.navigate('Subscription')}
          color="#8b5cf6"
        />
      </SettingSection>

      {/* App Settings */}
      <SettingSection title="App Settings">
        <SettingItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Manage notification preferences"
          onPress={() => navigation.navigate('Notifications')}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          subtitle="Data protection and security settings"
          onPress={() => navigation.navigate('PrivacySecurity')}
          color="#f59e0b"
        />
        <SettingItem
          icon="download-outline"
          title="Data Export"
          subtitle="Download your medical records"
          onPress={() => navigation.navigate('DataExport')}
          color="#ef4444"
        />
      </SettingSection>

      {/* Support */}
      <SettingSection title="Support">
        <SettingItem
          icon="help-circle-outline"
          title="Help & FAQ"
          subtitle="Get answers to common questions"
          onPress={() => navigation.navigate('HelpFaq')}
        />
        <SettingItem
          icon="mail-outline"
          title="Contact Support"
          subtitle="Get help from our team"
          onPress={() => Alert.alert('Contact Support', 'Email: support@familymedical.com')}
        />
        <SettingItem
          icon="star-outline"
          title="Rate App"
          subtitle="Help us improve with your feedback"
          onPress={() => handleRateApp()}
        />
      </SettingSection>

      {/* About */}
      <SettingSection title="About">
        <SettingItem
          icon="information-circle-outline"
          title="App Version"
          subtitle="1.0.0"
          onPress={() => {}}
          rightComponent={<Text style={styles.versionText}>1.0.0</Text>}
        />
        <SettingItem
          icon="document-text-outline"
          title="Terms of Service"
          subtitle="Read our terms and conditions"
          onPress={() => navigation.navigate('TermsOfService')}
        />
        <SettingItem
          icon="shield-outline"
          title="Privacy Policy"
          subtitle="Learn how we protect your data"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </SettingSection>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for your family's health
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  subscriptionBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SettingsScreen;
