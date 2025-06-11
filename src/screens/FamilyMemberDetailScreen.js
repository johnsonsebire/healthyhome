import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useFamilySharing } from '../contexts/FamilySharingContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { hasAccessToRecords, getRelationshipCategory, getFamilyCategoryByPerspective, getFamilyCategory, FAMILY_CATEGORIES } from '../utils/familyRelationships';
import { getGenderSpecificRelationship, getRelationshipEmoji } from '../utils/genderBasedRelationships';
import { LoadingSpinner } from '../components/LoadingSpinner';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';
import photoStorage from '../services/photoStorage';
import CachedPhoto from '../components/CachedPhoto';
import { getRecordTypeDisplayName, getRecordTypeIcon, getRecordTypeColor } from '../utils/recordTypes';

const FamilyMemberDetailScreen = ({ route, navigation }) => {
  const { memberId } = route.params;
  const { user, userProfile } = useAuth();
  const { sharingPreferences } = useFamilySharing();
  const { withErrorHandling, isLoading } = useError();
  
  const [familyMember, setFamilyMember] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showFamilyTooltip, setShowFamilyTooltip] = useState(false);

  useEffect(() => {
    if (user && memberId) {
      loadFamilyMember();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadFamilyMember();
      }
    });

    return unsubscribe;
  }, [user, memberId]);

  useEffect(() => {
    if (familyMember) {
      // Check if the user has access to this member's records
      const self = { id: user.uid, relationship: 'Self' };
      const canAccess = hasAccessToRecords(self, familyMember, sharingPreferences);
      setHasAccess(canAccess);
      
      if (canAccess) {
        loadMedicalRecords();
      } else {
        setRecordsLoading(false);
      }
    }
  }, [familyMember, sharingPreferences]);

  const loadFamilyMember = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
          if (cachedMembers && cachedMembers.data) {
            const cachedMember = cachedMembers.data.find(m => m.id === memberId);
            if (cachedMember) {
              return cachedMember;
            }
          }
        }

        // Load from Firebase
        const memberDoc = await getDoc(doc(db, 'familyMembers', memberId));
        if (memberDoc.exists()) {
          const memberData = { id: memberDoc.id, ...memberDoc.data() };
          
          // Cache photo locally if it exists and user is available
          if (memberData.photo && user?.uid) {
            try {
              const cachedPhotoUri = await photoStorage.cachePhoto(memberData.photo, user.uid, memberData.id);
              if (cachedPhotoUri) {
                memberData.photo = cachedPhotoUri;
                memberData.isPhotoCached = true;
              }
            } catch (error) {
              console.error('Error caching member photo:', error);
            }
          }
          
          return memberData;
        } else {
          throw new Error('Family member not found');
        }
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      setFamilyMember(result.data);
    } else {
      // Use cached data as fallback or show error
      const cachedMembers = await offlineStorageService.getCachedFamilyMembers();
      if (cachedMembers && cachedMembers.data) {
        const cachedMember = cachedMembers.data.find(m => m.id === memberId);
        if (cachedMember) {
          // Try to get cached photo if not already cached
          if (cachedMember.photo && !cachedMember.isPhotoCached && user?.uid) {
            try {
              const cachedPhotoUri = await photoStorage.getCachedPhoto(cachedMember.photo, user.uid, cachedMember.id);
              if (cachedPhotoUri) {
                cachedMember.photo = cachedPhotoUri;
                cachedMember.isPhotoCached = true;
              }
            } catch (error) {
              console.error('Error getting cached photo:', error);
            }
          }
          setFamilyMember(cachedMember);
        } else {
          Alert.alert('Error', 'Family member not found');
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', 'Failed to load family member details');
        navigation.goBack();
      }
    }
    setLoading(false);
  };

  const loadMedicalRecords = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            return cachedRecords.data.filter(r => r.familyMemberId === memberId);
          }
        }

        // Load from Firebase
        const q = query(
          collection(db, 'medicalRecords'),
          where('userId', '==', user.uid),
          where('familyMemberId', '==', memberId)
        );
        
        const querySnapshot = await getDocs(q);
        const records = [];
        querySnapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() });
        });

        return records;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );

    if (result.success) {
      setMedicalRecords(result.data);
    } else {
      // Use cached data as fallback
      const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
      if (cachedRecords && cachedRecords.data) {
        setMedicalRecords(cachedRecords.data.filter(r => r.familyMemberId === memberId));
      }
    }
    setRecordsLoading(false);
  };

  const renderOfflineBanner = () => {      if (!isOnline) {
      return (
        <View style={styles.offlineIndicator}>
          <Text>
            <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          </Text>
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      );
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  // Family Category Tooltip Modal
  const renderFamilyTooltip = () => {
    if (!showFamilyTooltip) return null;
    
    return (
      <View style={styles.tooltipOverlay}>
        <TouchableOpacity 
          style={styles.tooltipBackground}
          onPress={() => setShowFamilyTooltip(false)}
          activeOpacity={1}
        />
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>Family Categories</Text>
            <TouchableOpacity onPress={() => setShowFamilyTooltip(false)}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.tooltipContent}>
            <Text style={styles.tooltipSectionTitle}>Nuclear Family</Text>
            <Text style={styles.tooltipText}>
              Your nuclear family consists of you, your spouse (if any), and your direct children. 
              These are your immediate family members who form the core of your family structure.
            </Text>
            
            <Text style={styles.tooltipSectionTitle}>Extended Family</Text>
            <Text style={styles.tooltipText}>
              Your extended family includes all other relatives, such as your parents, siblings, 
              grandparents, aunts, uncles, and cousins.
            </Text>
            
            <Text style={styles.tooltipSectionTitle}>Perspective Matters</Text>
            <Text style={styles.tooltipText}>
              The classification of family members as Nuclear or Extended depends on your perspective as the logged-in user. 
              For example, from your perspective, your parents are part of your extended family. 
              But from your father's perspective, you would be part of his nuclear family, and his parents would be in his extended family.
            </Text>
          </ScrollView>
        </View>
      </View>
    );
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!familyMember) {
    return (
      <View style={styles.errorContainer}>
        <Text>
          <Ionicons name="alert-circle" size={64} color="#DDD" />
        </Text>
        <Text style={styles.errorText}>Family member not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderOfflineBanner()}
      {renderFamilyTooltip()}
      
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <CachedPhoto
              photoUri={familyMember.photo}
              style={styles.profilePhoto}
              placeholderStyle={styles.profilePhotoPlaceholder}
              placeholderText={getRelationshipEmoji(familyMember.relationship, familyMember.gender)}
              userId={user.uid}
              memberId={familyMember.id}
            />
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {familyMember.title ? `${familyMember.title} ${familyMember.name || 'Unknown'}` : familyMember.name || 'Unknown'}
              </Text>
              <View style={styles.relationshipContainer}>
                <Text style={styles.relationshipText}>
                  {getGenderSpecificRelationship(familyMember.relationship, familyMember.gender)}
                </Text>
                <View style={[
                  styles.categoryBadge, 
                  getFamilyCategoryByPerspective(familyMember.relationship) === FAMILY_CATEGORIES.NUCLEAR
                    ? styles.nuclearBadge
                    : styles.extendedBadge
                ]}>
                  <Text style={[
                    styles.categoryText,
                    getFamilyCategoryByPerspective(familyMember.relationship) === FAMILY_CATEGORIES.NUCLEAR
                      ? styles.nuclearCategoryText
                      : styles.extendedCategoryText
                  ]}>
                    {getFamilyCategory(familyMember.relationship)}
                    {' '}
                    <Ionicons 
                      name="information-circle" 
                      size={12} 
                      color={getFamilyCategoryByPerspective(familyMember.relationship) === FAMILY_CATEGORIES.NUCLEAR ? '#007AFF' : '#5E5CE6'} 
                      onPress={() => setShowFamilyTooltip(true)}
                    />
                  </Text>
                </View>
              </View>
              
              {familyMember.gender && (
                <Text style={styles.profileDetail}>
                  <Text>
                    <Ionicons name="person" size={16} color="#666" />
                  </Text>
                  {' '}{familyMember.gender}
                </Text>
              )}
              
              {familyMember.email && (
                <Text style={styles.profileDetail}>
                  <Text>
                    <Ionicons name="mail" size={16} color="#666" />
                  </Text>
                  {' '}{familyMember.email}
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('FamilyMember', { editMemberId: memberId })}
            >
              <Text>
                <Ionicons name="pencil" size={20} color="#007AFF" />
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {familyMember.gender && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>{familyMember.gender}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>{familyMember.dateOfBirth || 'Not provided'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Blood Type</Text>
            <Text style={styles.detailValue}>{familyMember.bloodType || 'Not provided'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Emergency Contact</Text>
            <Text style={styles.detailValue}>{familyMember.emergencyContact || 'Not provided'}</Text>
          </View>
          
          {familyMember.allergies && (
            <View style={styles.allergiesContainer}>
              <Text style={styles.detailLabel}>Allergies</Text>
              <Text style={styles.allergiesText}>{familyMember.allergies}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.sectionTitle}>Medical Records</Text>
            
            {hasAccess ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddRecord', { familyMemberId: memberId })}
              >
                <Text style={styles.addRecordText}>Add Record</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          
          {!hasAccess ? (
            <View style={styles.accessDeniedContainer}>
              <Text>
                <Ionicons name="lock-closed" size={40} color="#DDD" />
              </Text>
              <Text style={styles.accessDeniedText}>
                This family member has not shared their medical records with you.
              </Text>
            </View>
          ) : recordsLoading ? (
            <View style={styles.recordsLoadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.recordsLoadingText}>Loading records...</Text>
            </View>
          ) : medicalRecords.length === 0 ? (
            <View style={styles.emptyRecordsContainer}>
              <Text>
                <Ionicons name="document" size={40} color="#DDD" />
              </Text>
              <Text style={styles.emptyRecordsText}>No medical records found</Text>
              <TouchableOpacity
                style={styles.addFirstRecordButton}
                onPress={() => navigation.navigate('AddRecord', { familyMemberId: memberId })}
              >
                <Text style={styles.addFirstRecordText}>Add First Record</Text>
              </TouchableOpacity>
            </View>
          ) : (
            medicalRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onPress={() => navigation.navigate('RecordDetail', { recordId: record.id })}
              >
                <View style={[styles.recordIcon, { backgroundColor: getRecordTypeColor(record.type) + '20' }]}>
                  <Text>
                    <Ionicons name={getRecordTypeIcon(record.type)} size={24} color={getRecordTypeColor(record.type)} />
                  </Text>
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordTitle}>
                    {record.title || getRecordTypeDisplayName(record.type) || 'Untitled Record'}
                  </Text>
                  <Text style={[styles.recordType, { color: getRecordTypeColor(record.type) }]}>
                    {getRecordTypeDisplayName(record.type)}
                  </Text>
                  <Text style={styles.recordDate}>
                    {record.date ? formatDate(record.date) : 'No date'}
                  </Text>
                </View>
                <Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text>
          <Ionicons name="arrow-back" size={20} color="white" />
        </Text>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#ef4444',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoEmoji: {
    fontSize: 40,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  relationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  relationshipText: {
    fontSize: 18,
    color: '#007AFF',
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  nuclearBadge: {
    backgroundColor: '#e1f0ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  extendedBadge: {
    backgroundColor: '#e6e6ff',
    borderWidth: 1,
    borderColor: '#5E5CE6',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nuclearCategoryText: {
    color: '#007AFF',
  },
  extendedCategoryText: {
    color: '#5E5CE6',
  },
  profileDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailsCard: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  allergiesContainer: {
    paddingVertical: 12,
  },
  allergiesText: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    lineHeight: 22,
  },
  recordsCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addRecordText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  accessDeniedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  recordsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  recordsLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  emptyRecordsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyRecordsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 16,
  },
  addFirstRecordButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  addFirstRecordText: {
    color: 'white',
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recordType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  // Tooltip styles
  tooltipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  tooltipBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tooltipContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tooltipContent: {
    padding: 16,
    maxHeight: '80%',
  },
  tooltipSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  // Tooltip styles
  tooltipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  tooltipBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tooltipContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 400,
    elevation: 4,
  },
  tooltipHeader: {
    backgroundColor: '#f1f1f1',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tooltipContent: {
    maxHeight: 300,
  },
  tooltipSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 12,
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
});

export default FamilyMemberDetailScreen;
