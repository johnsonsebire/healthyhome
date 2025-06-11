import React, { useState, useEffect, useRef } from 'react';
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
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import dataExportService from '../services/dataExport';

const FamilyTreeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { withErrorHandling, isLoading } = useError();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef(null);

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

  const handleExport = async () => {
    if (!viewShotRef.current) {
      Alert.alert('Error', 'Cannot capture the family tree view');
      return;
    }

    setExporting(true);
    
    try {
      // Request permission for saving to gallery
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your media library to save images.');
        setExporting(false);
        return;
      }

      Alert.alert(
        'Export Family Tree',
        'Choose export format:',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setExporting(false) },
          { text: 'PNG Image', onPress: () => captureAndExport('png') },
          { text: 'PDF Document', onPress: () => captureAndExport('pdf') },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in export dialog:', error);
      setExporting(false);
      Alert.alert('Error', 'Failed to prepare export options');
    }
  };

  const captureAndExport = async (format) => {
    try {
      // Capture the tree view as an image with full size
      const uri = await viewShotRef.current.capture({
        width: 2400,
        height: 800,
        quality: 1,
        format: 'png',
        result: 'tmpfile'
      });
      
      if (format === 'png') {
        // For PNG, save to gallery
        const fileName = `family_tree_${new Date().toISOString().split('T')[0]}.png`;
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('Family Medical App', asset, false);
        
        Alert.alert(
          'Export Successful',
          'Family Tree image has been saved to your gallery in the "Family Medical App" album.',
          [
            {
              text: 'Share',
              onPress: async () => {
                const destUri = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.copyAsync({ from: uri, to: destUri });
                await dataExportService.shareFile(destUri, 'Family Tree Image');
              }
            },
            { text: 'OK' }
          ]
        );
      } else {
        // For PDF, create a simple PDF with the image
        const fileName = `family_tree_${new Date().toISOString().split('T')[0]}.pdf`;
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Family Tree</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  text-align: center;
                }
                h1 {
                  color: #007AFF;
                  margin-bottom: 20px;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  border: 1px solid #eee;
                  border-radius: 10px;
                  margin-top: 20px;
                }
                .footer {
                  margin-top: 30px;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <h1>Family Tree</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
              <img src="data:image/png;base64,${await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })}" />
              <div class="footer">
                <p>Created with Family Medical App</p>
              </div>
            </body>
          </html>
        `;
        
        const { uri: pdfUri } = await Print.printToFileAsync({ html });
        const destUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.moveAsync({
          from: pdfUri,
          to: destUri
        });
        
        Alert.alert(
          'Export Successful',
          'Family Tree PDF has been created.',
          [
            {
              text: 'Share',
              onPress: async () => {
                await dataExportService.shareFile(destUri, 'Family Tree PDF');
              }
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Error capturing or sharing tree:', error);
      Alert.alert('Export Failed', 'Could not export the family tree: ' + error.message);
    } finally {
      setExporting(false);
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
      {exporting && (
        <View style={styles.exportingOverlay}>
          <LoadingSpinner />
          <Text style={styles.exportingText}>Preparing export...</Text>
        </View>
      )}
      
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
        <ViewShot 
          ref={viewShotRef} 
          options={{ 
            format: 'png', 
            quality: 1,
            result: 'tmpfile'
          }}
          style={styles.viewShotContainer}
          captureMode="mount"
        >
          <View style={styles.treeContainer}>
            <FamilyTreeView 
              familyMembers={familyMembers}
              onMemberPress={handleMemberPress}
            />
          </View>
        </ViewShot>

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
            • Add more family members to expand your tree{'\n'}
            • Tap the export button to save your family tree as PNG or PDF
          </Text>
        </View>

        {/* Add spacing after instructions so FAB doesn't obstruct content */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fabButton, styles.exportButton]}
          onPress={handleExport}
        >
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.fabButtonText}>Export</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fabButton, styles.addButton]}
          onPress={() => navigation.navigate('FamilyMember')}
        >
          <Ionicons name="person-add" size={20} color="white" />
          <Text style={styles.fabButtonText}>Add Family Member</Text>
        </TouchableOpacity>
      </View>
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
  viewShotContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    width: '92%',
  },
  treeContainer: {
    backgroundColor: 'white',
    padding: 8,
    minHeight: 400,
    minWidth: 2400, // Set a large width to ensure the entire tree is visible
    overflow: 'visible', // Allow content to be visible outside the container
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
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    flexDirection: 'row',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  exportButton: {
    backgroundColor: '#5E5CE6',
  },
  fabButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  exportingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FamilyTreeScreen;