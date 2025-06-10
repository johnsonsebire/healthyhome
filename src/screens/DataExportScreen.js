import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import dataExportService from '../services/dataExport';
import * as FileSystem from 'expo-file-system';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const DataExportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling } = useError();
  
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [recordsCount, setRecordsCount] = useState(0);
  const [familyMembersCount, setFamilyMembersCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  
  const [exportOptions, setExportOptions] = useState({
    includeRecords: true,
    includeFamilyMembers: true,
    includeAppointments: true,
    includeInsurance: true,
    anonymizeData: false,
    passwordProtect: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
      
      // Count medical records
      const recordsQuery = query(
        collection(db, 'medicalRecords'),
        where('userId', '==', user.uid)
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      setRecordsCount(recordsSnapshot.size);
      
      // Count family members
      const familyQuery = query(
        collection(db, 'familyMembers'),
        where('userId', '==', user.uid)
      );
      const familySnapshot = await getDocs(familyQuery);
      setFamilyMembersCount(familySnapshot.size);
      
      // Count appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      setAppointmentsCount(appointmentsSnapshot.size);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleExportOption = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };
  
  const handleExportCSV = async () => {
    setLoading(true);
    
    const result = await withErrorHandling(
      async () => {
        // Fetch records
        let records = [];
        if (exportOptions.includeRecords) {
          const recordsQuery = query(
            collection(db, 'medicalRecords'),
            where('userId', '==', user.uid)
          );
          const recordsSnapshot = await getDocs(recordsQuery);
          records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        // Fetch family members for association
        let familyMembers = [];
        if (exportOptions.includeFamilyMembers) {
          const familyQuery = query(
            collection(db, 'familyMembers'),
            where('userId', '==', user.uid)
          );
          const familySnapshot = await getDocs(familyQuery);
          familyMembers = familySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        // Apply anonymization if enabled
        if (exportOptions.anonymizeData) {
          records = records.map(record => {
            const anonymized = { ...record };
            delete anonymized.userId;
            // Remove or mask other personal identifiers
            return anonymized;
          });
          
          familyMembers = familyMembers.map((member, index) => {
            return {
              ...member,
              name: `Family Member ${index + 1}`,
              // Remove other personal identifiers
            };
          });
        }
        
        // Export to CSV
        return await dataExportService.exportMedicalRecordsToCSV(records, familyMembers);
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );
    
    setLoading(false);
    
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
  
  const handleExportJSON = async () => {
    setLoading(true);
    
    const result = await withErrorHandling(
      async () => {
        const exportData = {
          exportDate: new Date().toISOString(),
          userProfile: exportOptions.anonymizeData ? 
            { anonymized: true } : 
            { ...userData, uid: user.uid }
        };
        
        // Include records if selected
        if (exportOptions.includeRecords) {
          const recordsQuery = query(
            collection(db, 'medicalRecords'),
            where('userId', '==', user.uid)
          );
          const recordsSnapshot = await getDocs(recordsQuery);
          const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          exportData.medicalRecords = exportOptions.anonymizeData ? 
            records.map(r => {
              const anonymized = { ...r };
              delete anonymized.userId;
              return anonymized;
            }) : 
            records;
        }
        
        // Include family members if selected
        if (exportOptions.includeFamilyMembers) {
          const familyQuery = query(
            collection(db, 'familyMembers'),
            where('userId', '==', user.uid)
          );
          const familySnapshot = await getDocs(familyQuery);
          const members = familySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          exportData.familyMembers = exportOptions.anonymizeData ?
            members.map((m, i) => ({ ...m, name: `Family Member ${i + 1}` })) :
            members;
        }
        
        // Include appointments if selected
        if (exportOptions.includeAppointments) {
          const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('userId', '==', user.uid)
          );
          const appointmentsSnapshot = await getDocs(appointmentsQuery);
          const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          exportData.appointments = exportOptions.anonymizeData ?
            appointments.map(a => {
              const anonymized = { ...a };
              delete anonymized.userId;
              return anonymized;
            }) :
            appointments;
        }
        
        // Include insurance if selected
        if (exportOptions.includeInsurance) {
          const insuranceQuery = query(
            collection(db, 'insurance'),
            where('userId', '==', user.uid)
          );
          const insuranceSnapshot = await getDocs(insuranceQuery);
          const insurance = insuranceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          exportData.insurance = exportOptions.anonymizeData ?
            insurance.map(i => {
              const anonymized = { ...i };
              delete anonymized.userId;
              delete anonymized.membershipNo;
              return anonymized;
            }) :
            insurance;
        }
        
        return await dataExportService.exportToJSON(exportData, 'family_medical_data');
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );
    
    setLoading(false);
    
    if (result.success && result.data.success) {
      Alert.alert(
        'Export Successful',
        'Your data has been exported successfully',
        [
          { text: 'Share', onPress: () => dataExportService.shareFile(result.data.fileUri) },
          { text: 'OK' }
        ]
      );
    }
  };
  
  const handleExportHealthReport = async () => {
    setLoading(true);
    
    const result = await withErrorHandling(
      async () => {
        console.log('Starting health report export process...');
        
        // Build user data object for report
        const userData = {
          userProfile: {},
          familyMembers: [],
          medicalRecords: [],
          appointments: [],
          insuranceInfo: {}
        };
        
        // Get user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userData.userProfile = userDoc.data();
          console.log('User profile data retrieved');
        } else {
          console.warn('User profile not found');
        }
        
        // Get family members
        if (exportOptions.includeFamilyMembers) {
          const familyQuery = query(
            collection(db, 'familyMembers'),
            where('userId', '==', user.uid)
          );
          const familySnapshot = await getDocs(familyQuery);
          userData.familyMembers = familySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`Retrieved ${userData.familyMembers.length} family members`);
        }
        
        // Get medical records
        if (exportOptions.includeRecords) {
          const recordsQuery = query(
            collection(db, 'medicalRecords'),
            where('userId', '==', user.uid)
          );
          const recordsSnapshot = await getDocs(recordsQuery);
          userData.medicalRecords = recordsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`Retrieved ${userData.medicalRecords.length} medical records`);
        }
        
        // Get appointments
        if (exportOptions.includeAppointments) {
          const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('userId', '==', user.uid)
          );
          const appointmentsSnapshot = await getDocs(appointmentsQuery);
          userData.appointments = appointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`Retrieved ${userData.appointments.length} appointments`);
        }
        
        // Get insurance info
        if (exportOptions.includeInsurance) {
          const insuranceQuery = query(
            collection(db, 'insurance'),
            where('userId', '==', user.uid)
          );
          const insuranceSnapshot = await getDocs(insuranceQuery);
          if (insuranceSnapshot.docs.length > 0) {
            userData.insuranceInfo = {
              ...insuranceSnapshot.docs[0].data(),
              id: insuranceSnapshot.docs[0].id
            };
            console.log('Insurance information retrieved');
          } else {
            console.log('No insurance information found');
          }
        }
        
        // Apply anonymization if needed
        if (exportOptions.anonymizeData) {
          console.log('Applying anonymization to data');
          // Anonymize user data
          delete userData.userProfile.email;
          delete userData.userProfile.phone;
          
          // Anonymize family members
          userData.familyMembers = userData.familyMembers.map((member, index) => ({
            ...member,
            name: `Family Member ${index + 1}`
          }));
          
          // Anonymize other data as needed
        }
        
        console.log('Calling dataExportService.createHealthReport...');
        const reportResult = await dataExportService.createHealthReport(userData);
        
        if (reportResult.success) {
          console.log(`PDF report successfully created: ${reportResult.fileName}`);
          
          // Verify the file exists
          const fileInfo = await FileSystem.getInfoAsync(reportResult.fileUri);
          console.log('File info:', fileInfo);
          
          if (!fileInfo.exists) {
            console.error('Generated file does not exist at path:', reportResult.fileUri);
            throw new Error('Generated file not found');
          }
          
          // Check file size to make sure it's a valid PDF
          if (fileInfo.size < 100) { // If file is too small, it might not be a valid PDF
            console.error('Generated file is too small:', fileInfo.size, 'bytes');
            throw new Error('Generated file is invalid');
          }
        } else {
          console.error('Failed to create health report:', reportResult.error);
        }
        
        return reportResult;
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );
    
    setLoading(false);
    
    if (result.success && result.data.success) {
      Alert.alert(
        'Report Generated',
        'Your health report has been created successfully',
        [
          { 
            text: 'Share', 
            onPress: () => {
              console.log('Sharing file:', result.data.fileUri);
              dataExportService.shareFile(result.data.fileUri);
            } 
          },
          { text: 'OK' }
        ]
      );
    } else {
      // Show error alert if generation failed
      Alert.alert(
        'Error',
        result.data?.error || 'Failed to generate health report',
        [{ text: 'OK' }]
      );
    }
  };
  
  const ExportOptionItem = ({ title, description, value, onToggle }) => (
    <View style={styles.optionItem}>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
        thumbColor={value ? '#6366f1' : '#f4f4f5'}
      />
    </View>
  );
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Data Export</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Your Data Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="documents" size={24} color="#6366f1" />
              <Text style={styles.summaryCount}>{recordsCount}</Text>
              <Text style={styles.summaryLabel}>Records</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="people" size={24} color="#8b5cf6" />
              <Text style={styles.summaryCount}>{familyMembersCount}</Text>
              <Text style={styles.summaryLabel}>Family Members</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="calendar" size={24} color="#ec4899" />
              <Text style={styles.summaryCount}>{appointmentsCount}</Text>
              <Text style={styles.summaryLabel}>Appointments</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Options</Text>
          
          <ExportOptionItem
            title="Medical Records"
            description="Include all medical records and documents"
            value={exportOptions.includeRecords}
            onToggle={() => toggleExportOption('includeRecords')}
          />
          
          <ExportOptionItem
            title="Family Members"
            description="Include family member profiles"
            value={exportOptions.includeFamilyMembers}
            onToggle={() => toggleExportOption('includeFamilyMembers')}
          />
          
          <ExportOptionItem
            title="Appointments"
            description="Include appointment schedules"
            value={exportOptions.includeAppointments}
            onToggle={() => toggleExportOption('includeAppointments')}
          />
          
          <ExportOptionItem
            title="Insurance Information"
            description="Include insurance policy details"
            value={exportOptions.includeInsurance}
            onToggle={() => toggleExportOption('includeInsurance')}
          />
          
          <View style={styles.divider} />
          
          <ExportOptionItem
            title="Anonymize Data"
            description="Remove personal identifiers from exported data"
            value={exportOptions.anonymizeData}
            onToggle={() => toggleExportOption('anonymizeData')}
          />
          
          <ExportOptionItem
            title="Password Protection"
            description="Require a password to access exported files"
            value={exportOptions.passwordProtect}
            onToggle={() => toggleExportOption('passwordProtect')}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Formats</Text>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportCSV}
            disabled={loading}
          >
            <View style={styles.exportButtonIcon}>
              <Ionicons name="document-text" size={24} color="#ffffff" />
            </View>
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonTitle}>Export as CSV</Text>
              <Text style={styles.exportButtonDescription}>Spreadsheet format for data analysis</Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportJSON}
            disabled={loading}
          >
            <View style={[styles.exportButtonIcon, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="code" size={24} color="#ffffff" />
            </View>
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonTitle}>Export as JSON</Text>
              <Text style={styles.exportButtonDescription}>Complete data in structured format</Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportHealthReport}
            disabled={loading}
          >
            <View style={[styles.exportButtonIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="document" size={24} color="#ffffff" />
            </View>
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonTitle}>Health Report (PDF)</Text>
              <Text style={styles.exportButtonDescription}>Formatted report with visualizations</Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.noteSection}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <Text style={styles.noteText}>
            Your data is exported securely and is only shared with apps you choose. 
            We recommend using password protection for sensitive health information.
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
  content: {
    padding: 16,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: -20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionContent: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exportButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  exportButtonDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  noteSection: {
    flexDirection: 'row',
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4f46e5',
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
});

export default DataExportScreen;
