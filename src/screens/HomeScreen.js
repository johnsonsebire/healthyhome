import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { testFirebaseConnection } from '../services/firebaseTest';

const HomeScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { currentPlan, plans } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  const [recentRecords, setRecentRecords] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Test Firebase connection on component mount
    testFirebaseConnection()
      .then(result => {
        console.log('Firebase connection test result:', result);
      })
      .catch(error => {
        console.error('Firebase connection test failed:', error);
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadDashboardData();
      }
    });

    return unsubscribe;
  }, [user]);

  const loadDashboardData = async () => {
    const result = await withErrorHandling(
      async () => {
        await Promise.all([
          loadRecentRecords(),
          loadUpcomingAppointments()
        ]);
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: false,
      }
    );

    setLoading(false);
  };

  const loadRecentRecords = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
          if (cachedRecords && cachedRecords.data) {
            return cachedRecords.data.slice(0, 3);
          }
        }

        // Load from Firebase
        const recordsQuery = query(
          collection(db, 'medicalRecords'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(recordsQuery);
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cache the data
        await offlineStorageService.cacheMedicalRecords(records);
        return records;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.LOW,
        showLoading: false,
      }
    );

    if (result.success) {
      setRecentRecords(result.data);
    } else {
      // Use cached data as fallback
      const cachedRecords = await offlineStorageService.getCachedMedicalRecords();
      if (cachedRecords && cachedRecords.data) {
        setRecentRecords(cachedRecords.data.slice(0, 3));
      }
    }
  };

  const loadUpcomingAppointments = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedAppointments = await offlineStorageService.getCachedAppointments();
          if (cachedAppointments && cachedAppointments.data) {
            return cachedAppointments.data
              .filter(apt => new Date(apt.date) >= new Date())
              .slice(0, 3);
          }
        }

        // Load from Firebase
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid),
          where('date', '>=', new Date()),
          orderBy('date', 'asc'),
          limit(3)
        );
        const snapshot = await getDocs(appointmentsQuery);
        const appointments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cache the data
        await offlineStorageService.cacheAppointments(appointments);
        return appointments;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.LOW,
        showLoading: false,
      }
    );

    if (result.success) {
      setUpcomingAppointments(result.data);
    } else {
      // Use cached data as fallback
      const cachedAppointments = await offlineStorageService.getCachedAppointments();
      if (cachedAppointments && cachedAppointments.data) {
        const filtered = cachedAppointments.data
          .filter(apt => new Date(apt.date) >= new Date())
          .slice(0, 3);
        setUpcomingAppointments(filtered);
      }
    }
  };

  const onRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const QuickActionCard = ({ icon, title, subtitle, onPress, color = "#6366f1" }) => (
    <TouchableOpacity style={[styles.quickActionCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.quickActionText}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const RecordCard = ({ record }) => (
    <TouchableOpacity 
      style={styles.recordCard}
      onPress={() => navigation.navigate('RecordDetail', { recordId: record.id })}
    >
      <View style={styles.recordHeader}>
        <Text style={styles.recordType}>{record.type}</Text>
        <Text style={styles.recordDate}>{formatDate(record.createdAt)}</Text>
      </View>
      <Text style={styles.recordTitle}>{record.title}</Text>
      <Text style={styles.recordMember}>{record.familyMemberName}</Text>
    </TouchableOpacity>
  );

  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Ionicons name="calendar" size={20} color="#10b981" />
        <Text style={styles.appointmentDate}>{formatDate(appointment.date)}</Text>
      </View>
      <Text style={styles.appointmentTitle}>{appointment.title}</Text>
      <Text style={styles.appointmentDoctor}>Dr. {appointment.doctor}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}

      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{userProfile?.firstName || 'User'}!</Text>
        <View style={styles.subscriptionBadge}>
          <Text style={styles.subscriptionText}>
            {plans[currentPlan]?.name} Plan
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="add-circle"
            title="Add Record"
            subtitle="New medical record"
            onPress={() => navigation.navigate('AddRecord')}
            color="#6366f1"
          />
          <QuickActionCard
            icon="calendar-outline"
            title="Schedule Visit"
            subtitle="Book appointment"
            onPress={() => navigation.navigate('Schedule')}
            color="#10b981"
          />
          <QuickActionCard
            icon="people-outline"
            title="Family Members"
            subtitle="Manage profiles"
            onPress={() => navigation.navigate('FamilyMember')}
            color="#f59e0b"
          />
          <QuickActionCard
            icon="card-outline"
            title="Subscription"
            subtitle="Manage plan"
            onPress={() => navigation.navigate('Subscription')}
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Recent Records */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Records</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Records')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentRecords.length > 0 ? (
          <View style={styles.recordsList}>
            {recentRecords.map(record => (
              <RecordCard key={record.id} record={record} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No records yet</Text>
            <TouchableOpacity 
              style={styles.addFirstRecordButton}
              onPress={() => navigation.navigate('AddRecord')}
            >
              <Text style={styles.addFirstRecordText}>Add your first record</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {upcomingAppointments.length > 0 ? (
          <View style={styles.appointmentsList}>
            {upcomingAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No appointments scheduled</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
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
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  quickActions: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  recordsList: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recordMember: {
    fontSize: 14,
    color: '#6b7280',
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  addFirstRecordButton: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstRecordText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
});

export default HomeScreen;
