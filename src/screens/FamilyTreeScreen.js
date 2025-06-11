import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import FamilyTreeView from '../components/FamilyTreeView';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';
import photoStorage from '../services/photoStorage';

const FamilyTreeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadFamilyMembers();
    }

    // Listen for network changes
    const unsubscribe = networkService.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        // Reload data when back online
        loadFamilyMembers();
      }
    });

    return unsubscribe;
  }, [user]);

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
        const q = query(
          collection(db, 'familyMembers'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const members = [];
        querySnapshot.forEach((doc) => {
          members.push({ id: doc.id, ...doc.data() });
        });

        // Cache the data with photos
        await offlineStorageService.cacheFamilyMembers(members, user.uid);
        return members;
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
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
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFamilyMembers();
  };

  const handleMemberPress = (member) => {
    if (member && member.id) {
      navigation.navigate('FamilyMemberDetail', { memberId: member.id });
    }
  };

  const renderOfflineBanner = () => {
    if (!isOnline) {
      return (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline - Data may not be current</Text>
        </View>
      );
    }
    return null;
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderOfflineBanner()}
      
      <View style={styles.header}>
        <Text style={styles.title}>Family Tree</Text>
        <Text style={styles.subtitle}>
          Visualize your family connections
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']} 
            tintColor={'#007AFF'}
          />
        }
      >
        <View style={styles.treeContainer}>
          <FamilyTreeView 
            familyMembers={familyMembers}
            onMemberPress={handleMemberPress}
          />
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            <Ionicons name="information-circle" size={16} color="#666" /> How to use
          </Text>
          <Text style={styles.instructionsText}>
            • Tap on any family member to view their details{'\n'}
            • Blue circles represent your nuclear family (you, your spouse, and your children){'\n'}
            • Purple circles represent extended family (parents, siblings, grandparents, etc.){'\n'}
            • Solid lines connect nuclear family members{'\n'}
            • Dashed lines connect extended family members{'\n'}
            • Extended family members' medical records are not shared by default{'\n'}
            • Pull down to refresh the family tree{'\n'}
            • Add more family members to expand your tree
          </Text>
        </View>

        {/* Add spacing after instructions so FAB doesn't obstruct content */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('FamilyMember')}
      >
        <Ionicons name="person-add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Family Member</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for FAB
  },
  treeContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 300, // Ensure minimum height for tree
  },
  instructionsContainer: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 80, // Space for floating action button
  },
  addButton: {
    position: 'absolute',
    right: 20,
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
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FamilyTreeScreen;
