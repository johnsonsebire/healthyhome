import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

class NetworkService {
  constructor() {
    this.isConnected = true;
    this.listeners = [];
    this.init();
  }

  init() {
    // Listen for network state changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected && state.isInternetReachable;
      
      if (wasConnected !== this.isConnected) {
        this.notifyListeners(this.isConnected);
        
        if (this.isConnected) {
          this.handleReconnection();
        } else {
          this.handleDisconnection();
        }
      }
    });
  }

  // Get current network status
  async getNetworkStatus() {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected && state.isInternetReachable,
        type: state.type,
        details: state.details,
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return { isConnected: false, type: 'unknown', details: null };
    }
  }

  // Check if device is online
  isOnline() {
    return this.isConnected;
  }

  // Add listener for network changes
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of network changes
  notifyListeners(isConnected) {
    this.listeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error notifying network listener:', error);
      }
    });
  }

  // Handle reconnection
  handleReconnection() {
    console.log('Network reconnected - starting sync...');
    // Trigger sync of offline data
    this.syncOfflineData();
  }

  // Handle disconnection
  handleDisconnection() {
    console.log('Network disconnected - switching to offline mode...');
    Alert.alert(
      'No Internet Connection',
      'You are now in offline mode. Your data will be synced when connection is restored.',
      [{ text: 'OK' }]
    );
  }

  // Sync offline data when reconnected
  async syncOfflineData() {
    try {
      const { default: offlineStorage } = await import('./offlineStorage');
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) {
        return;
      }

      console.log(`Syncing ${syncQueue.length} offline operations...`);
      
      for (const item of syncQueue) {
        try {
          await this.processQueueItem(item);
          await offlineStorage.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Error syncing item:', error);
          // Increment retry count
          await offlineStorage.updateSyncQueueItem(item.id, {
            retryCount: (item.retryCount || 0) + 1,
            lastError: error.message,
          });
        }
      }
      
      console.log('Offline sync completed');
    } catch (error) {
      console.error('Error during offline sync:', error);
    }
  }

  // Process individual queue item
  async processQueueItem(item) {
    const { operation } = item;
    
    switch (operation.type) {
      case 'CREATE_RECORD':
        return this.syncCreateRecord(operation.data);
      case 'UPDATE_RECORD':
        return this.syncUpdateRecord(operation.data);
      case 'DELETE_RECORD':
        return this.syncDeleteRecord(operation.data);
      case 'CREATE_FAMILY_MEMBER':
        return this.syncCreateFamilyMember(operation.data);
      case 'UPDATE_FAMILY_MEMBER':
        return this.syncUpdateFamilyMember(operation.data);
      case 'DELETE_FAMILY_MEMBER':
        return this.syncDeleteFamilyMember(operation.data);
      default:
        console.warn('Unknown operation type:', operation.type);
    }
  }

  // Sync operations (these would integrate with your Firebase service)
  async syncCreateRecord(data) {
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return addDoc(collection(db, 'medicalRecords'), data);
  }

  async syncUpdateRecord(data) {
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return updateDoc(doc(db, 'medicalRecords', data.id), data.updates);
  }

  async syncDeleteRecord(data) {
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return deleteDoc(doc(db, 'medicalRecords', data.id));
  }

  async syncCreateFamilyMember(data) {
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return addDoc(collection(db, 'familyMembers'), data);
  }

  async syncUpdateFamilyMember(data) {
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return updateDoc(doc(db, 'familyMembers', data.id), data.updates);
  }

  async syncDeleteFamilyMember(data) {
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    return deleteDoc(doc(db, 'familyMembers', data.id));
  }

  // Test network connectivity
  async testConnectivity() {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get network type (wifi, cellular, etc.)
  async getNetworkType() {
    try {
      const state = await NetInfo.fetch();
      return state.type;
    } catch (error) {
      return 'unknown';
    }
  }

  // Check if on WiFi
  async isOnWiFi() {
    try {
      const state = await NetInfo.fetch();
      return state.type === 'wifi' && state.isConnected;
    } catch (error) {
      return false;
    }
  }

  // Check if on cellular
  async isOnCellular() {
    try {
      const state = await NetInfo.fetch();
      return state.type === 'cellular' && state.isConnected;
    } catch (error) {
      return false;
    }
  }

  // Cleanup
  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners = [];
  }
}

export default new NetworkService();
