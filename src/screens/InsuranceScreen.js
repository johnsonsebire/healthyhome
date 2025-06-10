import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import InsuranceRecommendationModal from '../components/InsuranceRecommendationModal';
import { getProviderDisplayName } from '../utils/recordTypes';

const InsuranceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [insuranceRecords, setInsuranceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsuranceRecords();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadInsuranceRecords();
      }
    });

    return unsubscribe;
  }, [user]);

  const loadInsuranceRecords = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            return cachedRecords.data.filter(record => record.type === 'insurance');
          }
        }

        // Load from Firebase
        const recordsQuery = query(
          collection(db, 'medicalRecords'),
          where('userId', '==', user.uid),
          where('type', '==', 'insurance')
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
      setInsuranceRecords(result.data);
    } else {
      // Use cached data as fallback
      const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
      if (cachedRecords && cachedRecords.data) {
        const filtered = cachedRecords.data.filter(record => record.type === 'insurance');
        setInsuranceRecords(filtered);
      }
    }
    setLoading(false);
  };

  const onRefresh = () => {
    setLoading(true);
    loadInsuranceRecords();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const getUniqueProviders = () => {
    const providers = insuranceRecords
      .map(record => getProviderDisplayName(record.provider, record.customProvider))
      .filter((value, index, self) => self.indexOf(value) === index);
    return providers;
  };

  const InsuranceCard = ({ record }) => (
    <TouchableOpacity
      style={styles.insuranceCard}
      onPress={() => navigation.navigate('RecordDetail', { recordId: record.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.insuranceIcon}>
          <Ionicons name="shield-checkmark" size={24} color="#8b5cf6" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>
            {getProviderDisplayName(record.provider, record.customProvider)}
          </Text>
          <Text style={styles.cardMember}>{record.familyMemberName}</Text>
          {record.membershipNo && (
            <Text style={styles.cardMembership}>ID: {record.membershipNo}</Text>
          )}
          <Text style={styles.cardDate}>Added: {formatDate(record.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
      {record.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {record.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, title, subtitle, onPress, color = "#6366f1" }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.quickActionText}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const EmptyStateComponent = () => (
    <EmptyState 
      icon="shield-checkmark-outline"
      title="No insurance records"
      subtitle="Add your insurance information to keep track of coverage and claims"
      action={{
        label: 'Add Insurance',
        onPress: () => navigation.navigate('AddRecord', { type: 'insurance' })
      }}
    />
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

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        contentContainerStyle={insuranceRecords.length === 0 ? styles.emptyContainer : undefined}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsSpacing}>
            <View style={styles.quickActions}>
              <QuickAction
                icon="add-circle"
                title="Add Insurance Card"
                subtitle="New insurance card"
                onPress={() => navigation.navigate('AddRecord', { type: 'insurance' })}
                color="#8b5cf6"
              />
              <QuickAction
                icon="paper-plane"
                title="Recommend a Provider"
                subtitle="Suggest providers to our team"
                onPress={() => setShowRecommendationModal(true)}
                color="#10b981"
              />
            </View>
          </View>
        </View>

        {/* Insurance Records */}
        {insuranceRecords.length === 0 ? (
          <EmptyStateComponent />
        ) : (
          <View style={styles.section}>
            {/* Insurance Statistics */}
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Your Coverage Overview</Text>
              <View style={styles.statsGridContainer}>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{insuranceRecords.length}</Text>
                    <Text style={styles.statLabel}>Insurance Cards</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{getUniqueProviders().length}</Text>
                    <Text style={styles.statLabel}>Providers</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {insuranceRecords.filter(r => r.expiryDate && new Date(r.expiryDate) > new Date()).length}
                    </Text>
                    <Text style={styles.statLabel}>Active Cards</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Insurance Cards</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddRecord', { type: 'insurance' })}>
                <Text style={styles.addText}>Add New</Text>
              </TouchableOpacity>
            </View>
            {insuranceRecords.map(record => (
              <InsuranceCard key={record.id} record={record} />
            ))}
            
            {/* Provider Information Section */}
            <View style={styles.providerInfoSection}>
              <Text style={styles.providerInfoTitle}>Insurance Provider Information</Text>
              {getUniqueProviders().map(provider => (
                <View key={provider} style={styles.providerCard}>
                  <View style={styles.providerHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#8b5cf6" />
                    <Text style={styles.providerName}>{provider}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.providerLink}
                    onPress={() => Alert.alert('Provider Info', `Learn more about ${provider} - Coming soon`)}
                  >
                    <Text style={styles.providerLinkText}>Read About This Provider</Text>
                    <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance Tips</Text>
          <View style={styles.tipsSpacing}>
            <View style={styles.tipsContainer}>
              <View style={styles.tipItem}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={styles.tipText}>
                  Keep digital copies of your insurance cards for easy access
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                <Text style={styles.tipText}>
                  Review your coverage annually to ensure it meets your needs
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="receipt" size={20} color="#6366f1" />
                <Text style={styles.tipText}>
                  Save all medical bills and receipts for insurance claims
                </Text>
              </View>
            </View>
            </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddRecord', { type: 'insurance' })}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Insurance Recommendation Modal */}
      <InsuranceRecommendationModal
        visible={showRecommendationModal}
        onClose={() => setShowRecommendationModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emptyContainer: {
    flex: 1,
  },
  section: {
    margin: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsGridContainer: {
    marginTop: 16, // Add spacing between title and stats grid
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickActions: {
    gap: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  insuranceCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insuranceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardMember: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardMembership: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
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
  actionsSpacing: {
    marginTop: 16,
  },
  tipsSpacing: {
    marginTop: 16,
  },
  providerInfoSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  providerInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  providerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  providerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerLinkText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default InsuranceScreen;
