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
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import offlineStorageService from '../services/offlineStorage';
import networkService from '../services/networkService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

const ScheduleScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadAppointments();
      }
    });

    return unsubscribe;
  }, [user]);

  const loadAppointments = async () => {
    const result = await withErrorHandling(
      async () => {
        // Try cache first if offline
        if (!networkService.isOnline()) {
          const cachedAppointments = await offlineStorageService.getCachedAppointments();
          if (cachedAppointments && cachedAppointments.data) {
            return cachedAppointments.data;
          }
        }

        // Load from Firebase
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(appointmentsQuery);
        const appointmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cache the data
        await offlineStorageService.cacheAppointments(appointmentsData);
        return appointmentsData;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      setAppointments(result.data);
    } else {
      // Use cached data as fallback
      const cachedAppointments = await offlineStorageService.getCachedAppointments();
      if (cachedAppointments && cachedAppointments.data) {
        setAppointments(cachedAppointments.data);
      }
    }
    setLoading(false);
  };

  const onRefresh = () => {
    setLoading(true);
    loadAppointments();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = (date) => {
    const appointmentDate = date.toDate ? date.toDate() : new Date(date);
    return appointmentDate >= new Date();
  };

  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: isUpcoming(appointment.date) ? '#10b981' : '#6b7280' }
        ]} />
        <View style={styles.appointmentInfo}>
          <Text style={styles.appointmentTitle}>{appointment.title}</Text>
          <Text style={styles.appointmentDoctor}>Dr. {appointment.doctor}</Text>
          <Text style={styles.appointmentLocation}>{appointment.location}</Text>
        </View>
        <View style={styles.appointmentDateTime}>
          <Text style={styles.appointmentDate}>{formatDate(appointment.date)}</Text>
          <Text style={styles.appointmentTime}>{formatTime(appointment.date)}</Text>
        </View>
      </View>
      {appointment.notes && (
        <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const EmptyStateComponent = () => (
    <EmptyState 
      icon="calendar-outline"
      title="No appointments scheduled"
      subtitle="Schedule your first appointment to get started"
      action={{
        label: 'Schedule Appointment',
        onPress: () => {/* Navigate to add appointment */}
      }}
    />
  );

  const upcomingAppointments = appointments.filter(apt => isUpcoming(apt.date));
  const pastAppointments = appointments.filter(apt => !isUpcoming(apt.date));

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
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : undefined}
      >
        {appointments.length === 0 ? (
          <EmptyStateComponent />
        ) : (
          <>
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                {upcomingAppointments.map(appointment => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </View>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Appointments</Text>
                {pastAppointments.map(appointment => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {/* Navigate to add appointment */}}
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
  emptyContainer: {
    flex: 1,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIndicator: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
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
    marginBottom: 2,
  },
  appointmentLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  appointmentDateTime: {
    alignItems: 'flex-end',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  appointmentNotes: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
  addAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  addAppointmentButtonText: {
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

export default ScheduleScreen;
