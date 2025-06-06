import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';

const RecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadRecord();

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadRecord();
      }
    });

    return unsubscribe;
  }, [recordId]);

  const loadRecord = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            const cachedRecord = cachedRecords.data.find(r => r.id === recordId);
            if (cachedRecord) {
              return cachedRecord;
            }
          }
        }

        // Load from Firebase
        const recordDoc = await getDoc(doc(db, 'medicalRecords', recordId));
        if (recordDoc.exists()) {
          const recordData = { id: recordDoc.id, ...recordDoc.data() };
          
          // Cache the data
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          const records = cachedRecords?.data || [];
          const updatedRecords = records.filter(r => r.id !== recordId);
          updatedRecords.push(recordData);
          await offlineStorageService.cacheMedicalRecords(updatedRecords);
          
          return recordData;
        } else {
          throw new Error('Record not found');
        }
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    if (result.success) {
      setRecord(result.data);
    } else {
      // Try to use cached data as fallback
      const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
      if (cachedRecords && cachedRecords.data) {
        const cachedRecord = cachedRecords.data.find(r => r.id === recordId);
        if (cachedRecord) {
          setRecord(cachedRecord);
        } else {
          Alert.alert('Error', 'Record not found', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      } else {
        Alert.alert('Error', 'Record not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }
    setLoading(false);
  };

  const handleDeleteRecord = async () => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRecord()
        }
      ]
    );
  };

  const deleteRecord = async () => {
    const result = await withErrorHandling(
      async () => {
        if (!networkService.isOnline()) {
          // Add to offline sync queue
          await offlineStorageService.addToSyncQueue({
            type: 'DELETE_RECORD',
            recordId: recordId
          });

          // Remove from local cache
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            const updatedRecords = cachedRecords.data.filter(r => r.id !== recordId);
            await offlineStorageService.cacheMedicalRecords(updatedRecords);
          }

          Alert.alert(
            'Record Deleted Offline',
            'The record will be permanently deleted when you\'re back online.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Delete from Firebase
        await deleteDoc(doc(db, 'medicalRecords', recordId));
        
        // Remove from cache
        const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
        if (cachedRecords && cachedRecords.data) {
          const updatedRecords = cachedRecords.data.filter(r => r.id !== recordId);
          await offlineStorageService.cacheMedicalRecords(updatedRecords);
        }

        Alert.alert('Success', 'Record deleted successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      prescription: '#10b981',
      diagnosis: '#f59e0b',
      hospital_card: '#6366f1',
      bill: '#ef4444',
      insurance: '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  const getRecordTypeIcon = (type) => {
    const icons = {
      prescription: 'medical',
      diagnosis: 'pulse',
      hospital_card: 'card',
      bill: 'receipt',
      insurance: 'shield-checkmark'
    };
    return icons[type] || 'document';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <Text>Record not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeIcon, { backgroundColor: getRecordTypeColor(record.type) + '20' }]}>
          <Ionicons 
            name={getRecordTypeIcon(record.type)} 
            size={32} 
            color={getRecordTypeColor(record.type)} 
          />
        </View>
        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.familyMember}>{record.familyMemberName}</Text>
        <Text style={styles.date}>{formatDate(record.createdAt)}</Text>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsContainer}>
          {record.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{record.description}</Text>
            </View>
          )}
          {record.doctor && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Doctor</Text>
              <Text style={styles.detailValue}>Dr. {record.doctor}</Text>
            </View>
          )}
          {record.date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{record.date}</Text>
            </View>
          )}
          {record.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>{record.notes}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Attachments */}
      {record.attachments && record.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <View style={styles.attachmentsContainer}>
            {record.attachments.map((attachment, index) => (
              <TouchableOpacity key={index} style={styles.attachmentItem}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.url }} style={styles.attachmentPreview} />
                ) : (
                  <View style={styles.documentPreview}>
                    <Ionicons name="document" size={24} color="#6366f1" />
                  </View>
                )}
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="create-outline" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>Edit Record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#10b981" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteRecord}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  typeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  familyMember: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#9ca3af',
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
  detailsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  attachmentsContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attachmentItem: {
    width: 100,
    alignItems: 'center',
  },
  attachmentPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    marginHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  deleteButton: {
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});

export default RecordDetailScreen;
