import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const RECORD_TYPES = [
  { id: 'all', name: 'All Records', icon: 'documents' },
  { id: 'prescription', name: 'Prescriptions', icon: 'medical' },
  { id: 'diagnosis', name: 'Diagnoses', icon: 'pulse' },
  { id: 'hospital_card', name: 'Hospital Cards', icon: 'card' },
  { id: 'bill', name: 'Bills', icon: 'receipt' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-checkmark' },
];

const RecordsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecords();
      loadFamilyMembers();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadRecords();
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, selectedType]);

  const loadRecords = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try to load from cache first if offline
        if (!networkService.isOnline()) {
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            return cachedRecords.data;
          }
        }

        // Load from Firebase
        const recordsQuery = query(
          collection(db, 'medicalRecords'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(recordsQuery);
        const recordsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cache the data
        await offlineStorageService.cacheMedicalRecords(recordsData);
        return recordsData;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      setRecords(result.data);
    } else {
      // Try to use cached data as fallback
      const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
      if (cachedRecords && cachedRecords.data) {
        setRecords(cachedRecords.data);
      }
    }
    setLoading(false);
  };

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

        // Cache the data
        await offlineStorageService.cacheFamilyMembers(membersData);
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

  const filterRecords = () => {
    let filtered = records;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(record => record.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.title?.toLowerCase().includes(query) ||
        record.description?.toLowerCase().includes(query) ||
        record.familyMemberName?.toLowerCase().includes(query) ||
        record.doctor?.toLowerCase().includes(query)
      );
    }

    setFilteredRecords(filtered);
  };

  const onRefresh = () => {
    setLoading(true);
    loadRecords();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const getRecordIcon = (type) => {
    const recordType = RECORD_TYPES.find(t => t.id === type);
    return recordType ? recordType.icon : 'document';
  };

  const getRecordColor = (type) => {
    const colors = {
      prescription: '#10b981',
      diagnosis: '#f59e0b',
      hospital_card: '#6366f1',
      bill: '#ef4444',
      insurance: '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  const RecordItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recordItem}
      onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}
    >
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { backgroundColor: getRecordColor(item.type) + '20' }]}>
          <Ionicons name={getRecordIcon(item.type)} size={24} color={getRecordColor(item.type)} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{item.title}</Text>
          <Text style={styles.recordMember}>{item.familyMemberName}</Text>
          <Text style={styles.recordDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.recordMeta}>
          <Text style={[styles.recordType, { color: getRecordColor(item.type) }]}>
            {RECORD_TYPES.find(t => t.id === item.type)?.name || item.type}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </View>
      {item.description && (
        <Text style={styles.recordDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const TypeFilter = ({ type, isSelected, onPress }) => (
    <TouchableOpacity
      style={[styles.typeFilter, isSelected && styles.typeFilterSelected]}
      onPress={onPress}
    >
      <Ionicons 
        name={type.icon} 
        size={20} 
        color={isSelected ? '#ffffff' : '#6b7280'} 
        style={styles.typeFilterIcon}
      />
      <Text style={[styles.typeFilterText, isSelected && styles.typeFilterTextSelected]}>
        {type.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Type Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RECORD_TYPES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TypeFilter
              type={item}
              isSelected={selectedType === item.id}
              onPress={() => setSelectedType(item.id)}
            />
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Records List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecordItem item={item} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState 
              icon="documents-outline"
              title="No records found"
              subtitle={
                searchQuery || selectedType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first medical record'
              }
              action={
                !searchQuery && selectedType === 'all' 
                  ? {
                      label: 'Add Record',
                      onPress: () => navigation.navigate('AddRecord')
                    }
                  : null
              }
            />
          )
        }
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        contentContainerStyle={filteredRecords.length === 0 ? styles.emptyContainer : styles.listContainer}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddRecord')}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  typeFilterSelected: {
    backgroundColor: '#6366f1',
  },
  typeFilterIcon: {
    marginRight: 6,
  },
  typeFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeFilterTextSelected: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  recordItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  recordMember: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  recordDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  recordMeta: {
    alignItems: 'flex-end',
  },
  recordType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  addRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  addRecordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default RecordsScreen;
