import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  getRecordTypeDisplayName, 
  getRecordTypeColor, 
  getRecordTypeIcon,
  generateBarcodeComponent,
  formatProviderForCard,
  getProviderDisplayName 
} from '../utils/recordTypes';

const RecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [barcodes, setBarcodes] = useState({});

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

  // Generate barcodes asynchronously after record is loaded
  useEffect(() => {
    if (record) {
      generateBarcodesForRecord(record);
    }
  }, [record]);

  const generateBarcodesForRecord = (recordData) => {
    if (!recordData) return;

    const barcodesToGenerate = [];
    
    // Collect all barcode data that needs to be generated
    if (recordData.type === 'insurance' && recordData.membershipNo) {
      barcodesToGenerate.push({ key: 'membershipNo', value: recordData.membershipNo });
    }
    
    if (recordData.type === 'hospital_card' && recordData.cardNumber) {
      barcodesToGenerate.push({ key: 'cardNumber', value: recordData.cardNumber });
    }

    // Generate all barcodes
    const newBarcodes = {};
    for (const item of barcodesToGenerate) {
      try {
        const BarcodeComponent = generateBarcodeComponent(item.value);
        if (BarcodeComponent) {
          newBarcodes[item.key] = BarcodeComponent;
        }
      } catch (error) {
        console.error(`Error generating barcode for ${item.key}:`, error);
        // Keep as undefined so we know generation failed
      }
    }

    setBarcodes(prev => ({ ...prev, ...newBarcodes }));
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

  const handleShareRecord = async () => {
    try {
      // Create a formatted text version of the record
      const recordText = createRecordText();
      
      // Show options for sharing
      Alert.alert(
        'Share Record',
        'Choose how you want to share this record:',
        [
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              await Clipboard.setStringAsync(recordText);
              Alert.alert('Copied!', 'Record details copied to clipboard');
            }
          },
          {
            text: 'Share via Apps',
            onPress: async () => {
              try {
                await Share.share({
                  message: recordText,
                  title: `${getRecordTypeDisplayName(record.type)} - ${record.familyMemberName}`
                });
              } catch (error) {
                console.error('Error sharing:', error);
                Alert.alert('Error', 'Failed to share record');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error preparing share:', error);
      Alert.alert('Error', 'Failed to prepare record for sharing');
    }
  };

  const createRecordText = () => {
    const lines = [];
    lines.push(`📋 ${getRecordTypeDisplayName(record.type)}`);
    lines.push(`👤 Family Member: ${record.familyMemberName}`);
    lines.push(`📅 Date: ${formatDate(record.createdAt)}`);
    lines.push('');

    if (record.title) {
      lines.push(`📝 Title: ${record.title}`);
    }

    // Type-specific details
    if (record.type === 'insurance') {
      lines.push(`🏥 Provider: ${getProviderDisplayName(record.provider, record.customProvider)}`);
      if (record.membershipNo) {
        lines.push(`🆔 Membership No: ${record.membershipNo}`);
      }
      if (record.dateOfIssue) {
        lines.push(`📅 Issue Date: ${record.dateOfIssue}`);
      }
      if (record.expiryDate) {
        lines.push(`⏰ Expiry Date: ${record.expiryDate}`);
      }
    } else if (record.type === 'hospital_card') {
      if (record.hospital) {
        lines.push(`🏥 Hospital: ${record.hospital}`);
      }
      if (record.country) {
        lines.push(`🌍 Country: ${record.country}`);
      }
      if (record.city) {
        lines.push(`🏙️ City: ${record.city}`);
      }
      if (record.cardNumber) {
        lines.push(`🆔 Card Number: ${record.cardNumber}`);
      }
    } else if (record.type === 'bill') {
      if (record.hospital) {
        lines.push(`🏥 Hospital: ${record.hospital}`);
      }
      if (record.billFor) {
        lines.push(`💰 Bill For: ${record.billFor}`);
      }
      if (record.billAmount) {
        lines.push(`💵 Amount: ₦${record.billAmount}`);
      }
      if (record.paymentStatus) {
        lines.push(`📊 Status: ${record.paymentStatus}`);
      }
    } else if (record.type === 'prescription' || record.type === 'diagnosis') {
      if (record.doctor) {
        lines.push(`👨‍⚕️ Doctor: Dr. ${record.doctor}`);
      }
    }

    if (record.description) {
      lines.push('');
      lines.push(`📋 Description: ${record.description}`);
    }

    if (record.notes) {
      lines.push('');
      lines.push(`📝 Notes: ${record.notes}`);
    }

    lines.push('');
    lines.push('Generated by Family Medical App');

    return lines.join('\n');
  };

  const handleAttachmentPress = (attachment) => {
    Alert.alert(
      'Open Attachment',
      `Do you want to open ${attachment.name || 'this attachment'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open',
          onPress: () => {
            // For now, we'll just show an alert. In a full implementation,
            // you would open the file with the appropriate app
            Alert.alert('Opening...', 'This feature will open the attachment in the appropriate app.');
          }
        }
      ]
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

  // Helper function to render ID card style view for insurance and hospital cards
  const renderIDCard = () => {
    if (!['insurance', 'hospital_card'].includes(record.type)) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {record.type === 'insurance' ? 'Insurance Card' : 'Hospital Card'}
        </Text>
        <View style={styles.idCard}>
          {record.type === 'insurance' ? renderInsuranceCard() : renderHospitalCard()}
        </View>
      </View>
    );
  };

  // Render insurance card
  const renderInsuranceCard = () => {
    const providerInfo = formatProviderForCard(record.provider || record.customProvider);
    const membershipNo = record.membershipNo || record.cardNumber;
    
    return (
      <View style={styles.cardContainer}>
        {/* Header */}
        <View style={styles.cardHeader}>
          {providerInfo.country && (
            <Text style={styles.cardCountry}>{providerInfo.country}</Text>
          )}
          <Text style={styles.cardOrganization}>{providerInfo.organization}</Text>
          <Text style={styles.cardType}>{providerInfo.cardType}</Text>
        </View>

        {/* Member Information */}
        <View style={styles.cardBody}>
          <View style={styles.memberInfo}>
            {/* Photo placeholder - will be added when family member photos are available */}
            <View style={styles.photoContainer}>
              <Ionicons name="person" size={40} color="#9ca3af" />
            </View>
            
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{record.familyMemberName}</Text>
              <Text style={styles.membershipNumber}>ID: {membershipNo}</Text>
              
              {record.dateOfIssue && (
                <Text style={styles.cardDate}>Issued: {record.dateOfIssue}</Text>
              )}
              {record.expiryDate && (
                <Text style={styles.cardDate}>Expires: {record.expiryDate}</Text>
              )}
            </View>
          </View>

          {/* Barcode */}
          {membershipNo && (
            <View style={styles.barcodeContainer}>
              {barcodes.membershipNo ? (
                // Show real CODE128 barcode
                <View style={styles.barcodeWrapper}>
                  {barcodes.membershipNo}
                </View>
              ) : barcodes.hasOwnProperty('membershipNo') ? (
                // Barcode generation failed, show error
                <View style={styles.barcodeError}>
                  <Text style={styles.barcodeErrorText}>Barcode generation failed</Text>
                </View>
              ) : (
                // Still generating barcode, show loading
                <View style={styles.barcodeLoading}>
                  <Text style={styles.barcodeLoadingText}>Generating CODE128 barcode...</Text>
                </View>
              )}
              <Text style={styles.barcodeNumber}>{membershipNo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render hospital card
  const renderHospitalCard = () => {
    const cardNumber = record.cardNumber;
    
    return (
      <View style={styles.cardContainer}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardOrganization}>{record.hospital}</Text>
          {record.city && record.region && (
            <Text style={styles.cardLocation}>{record.city}, {record.region}</Text>
          )}
          <Text style={styles.cardType}>HOSPITAL CARD</Text>
        </View>

        {/* Member Information */}
        <View style={styles.cardBody}>
          <View style={styles.memberInfo}>
            {/* Photo placeholder */}
            <View style={styles.photoContainer}>
              <Ionicons name="person" size={40} color="#9ca3af" />
            </View>
            
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{record.familyMemberName}</Text>
              {cardNumber && (
                <Text style={styles.membershipNumber}>Card No: {cardNumber}</Text>
              )}
              {record.country && (
                <Text style={styles.cardDate}>Country: {record.country}</Text>
              )}
            </View>
          </View>

          {/* Barcode */}
          {cardNumber && (
            <View style={styles.barcodeContainer}>
              {barcodes.cardNumber ? (
                // Show real CODE128 barcode
                <View style={styles.barcodeWrapper}>
                  {barcodes.cardNumber}
                </View>
              ) : barcodes.hasOwnProperty('cardNumber') ? (
                // Barcode generation failed, show error
                <View style={styles.barcodeError}>
                  <Text style={styles.barcodeErrorText}>Barcode generation failed</Text>
                </View>
              ) : (
                // Still generating barcode, show loading
                <View style={styles.barcodeLoading}>
                  <Text style={styles.barcodeLoadingText}>Generating CODE128 barcode...</Text>
                </View>
              )}
              <Text style={styles.barcodeNumber}>{cardNumber}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render comprehensive details based on record type
  const renderRecordDetails = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Record Details</Text>
        <View style={styles.detailsContainer}>
          {/* Common fields */}
          {record.title && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Title</Text>
              <Text style={styles.detailValue}>{record.title}</Text>
            </View>
          )}

          {/* Type-specific fields */}
          {record.type === 'insurance' && renderInsuranceDetails()}
          {record.type === 'hospital_card' && renderHospitalCardDetails()}
          {record.type === 'bill' && renderBillDetails()}
          {record.type === 'prescription' && renderPrescriptionDetails()}
          {record.type === 'diagnosis' && renderDiagnosisDetails()}

          {/* Common fields */}
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
    );
  };

  // Insurance specific details
  const renderInsuranceDetails = () => (
    <>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Provider</Text>
        <Text style={styles.detailValue}>
          {getProviderDisplayName(record.provider, record.customProvider)}
        </Text>
      </View>
      {record.membershipNo && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Membership Number</Text>
          <Text style={styles.detailValue}>{record.membershipNo}</Text>
        </View>
      )}
      {record.dateOfIssue && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date of Issue</Text>
          <Text style={styles.detailValue}>{record.dateOfIssue}</Text>
        </View>
      )}
      {record.expiryDate && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expiry Date</Text>
          <Text style={styles.detailValue}>{record.expiryDate}</Text>
        </View>
      )}
    </>
  );

  // Hospital card specific details
  const renderHospitalCardDetails = () => (
    <>
      {record.country && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Country</Text>
          <Text style={styles.detailValue}>{record.country}</Text>
        </View>
      )}
      {record.city && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>City</Text>
          <Text style={styles.detailValue}>{record.city === 'other' ? record.customCity : record.city}</Text>
        </View>
      )}
      {record.region && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Region</Text>
          <Text style={styles.detailValue}>{record.region === 'other' ? record.customRegion : record.region}</Text>
        </View>
      )}
      {record.hospital && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Hospital/Clinic</Text>
          <Text style={styles.detailValue}>{record.hospital}</Text>
        </View>
      )}
      {record.cardNumber && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Card Number</Text>
          <Text style={styles.detailValue}>{record.cardNumber}</Text>
        </View>
      )}
    </>
  );

  // Medical bill specific details
  const renderBillDetails = () => (
    <>
      {record.hospital && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Hospital/Clinic</Text>
          <Text style={styles.detailValue}>{record.hospital}</Text>
        </View>
      )}
      {record.billFor && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bill For</Text>
          <Text style={styles.detailValue}>{record.billFor}</Text>
        </View>
      )}
      {record.billAmount && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bill Amount</Text>
          <Text style={styles.detailValue}>₵{record.billAmount}</Text>
        </View>
      )}
      {record.totalPaid !== undefined && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount Paid</Text>
          <Text style={styles.detailValue}>₵{record.totalPaid}</Text>
        </View>
      )}
      {record.paymentStatus && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Status</Text>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: getPaymentStatusColor(record.paymentStatus) }]}>
              {getPaymentStatusText(record.paymentStatus)}
            </Text>
          </View>
        </View>
      )}
    </>
  );

  // Prescription specific details
  const renderPrescriptionDetails = () => (
    <>
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
    </>
  );

  // Diagnosis specific details
  const renderDiagnosisDetails = () => (
    <>
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
    </>
  );

  // Helper functions for payment status
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
        <View style={[styles.typeBadge, { backgroundColor: getRecordTypeColor(record.type) }]}>
          <Text style={styles.typeBadgeText}>{getRecordTypeDisplayName(record.type)}</Text>
        </View>
        <Text style={styles.title}>{record.title || getRecordTypeDisplayName(record.type)}</Text>
        <Text style={styles.familyMember}>{record.familyMemberName}</Text>
        <Text style={styles.date}>{formatDate(record.createdAt)}</Text>
      </View>

      {/* ID Card View for Insurance and Hospital Cards */}
      {renderIDCard()}

      {/* Comprehensive Record Details */}
      {renderRecordDetails()}

      {/* Attachments */}
      {record.attachments && record.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="attach" size={20} color="#6366f1" /> Attachments ({record.attachments.length})
          </Text>
          <View style={styles.attachmentsContainer}>
            {record.attachments.map((attachment, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.attachmentItem}
                onPress={() => handleAttachmentPress(attachment)}
              >
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.url }} style={styles.attachmentPreview} />
                ) : (
                  <View style={styles.documentPreview}>
                    <Ionicons name="document" size={24} color="#6366f1" />
                  </View>
                )}
                <Text style={styles.attachmentName} numberOfLines={2}>
                  {attachment.name || `Attachment ${index + 1}`}
                </Text>
                <Text style={styles.attachmentSize}>
                  {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
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
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditRecord', { recordId: record.id, record: record })}
          >
            <Ionicons name="create-outline" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>Edit Record</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareRecord}
          >
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
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 10,
    color: '#9ca3af',
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
  idCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContainer: {
    padding: 16,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardCountry: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  cardOrganization: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  membershipNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  barcodeContainer: {
    alignItems: 'flex-end',
  },
  barcode: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barcodeNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // ID Card styles
  idCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    minHeight: 200,
  },
  cardHeader: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardCountry: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardOrganization: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  cardLocation: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardBody: {
    padding: 20,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  membershipNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  barcodeContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  barcodeWrapper: {
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    padding: 4,
  },
  barcode: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1f2937',
    letterSpacing: 1,
    marginBottom: 8,
  },
  barcodeLoading: {
    alignItems: 'center',
    marginBottom: 8,
  },
  barcodeLoadingText: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 4,
  },
  barcodeWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  barcodeError: {
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  barcodeErrorText: {
    fontSize: 10,
    color: '#ef4444',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default RecordDetailScreen;
