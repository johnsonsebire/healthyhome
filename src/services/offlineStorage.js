import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline storage service for caching data when network is unavailable
const CACHE_KEYS = {
  MEDICAL_RECORDS: 'medical_records_cache',
  FAMILY_MEMBERS: 'family_members_cache',
  APPOINTMENTS: 'appointments_cache',
  USER_PROFILE: 'user_profile_cache',
  SUBSCRIPTION: 'subscription_cache',
  SYNC_QUEUE: 'sync_queue',
};

class OfflineStorageService {
  // Save data to local storage
  async saveToCache(key, data) {
    try {
      const jsonData = JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0',
      });
      await AsyncStorage.setItem(key, jsonData);
      return true;
    } catch (error) {
      console.error('Error saving to cache:', error);
      return false;
    }
  }

  // Retrieve data from local storage
  async getFromCache(key) {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      if (jsonData) {
        const parsed = JSON.parse(jsonData);
        return {
          data: parsed.data,
          timestamp: parsed.timestamp,
          isStale: this.isDataStale(parsed.timestamp),
        };
      }
      return null;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  // Check if cached data is stale (older than 1 hour)
  isDataStale(timestamp) {
    const oneHour = 60 * 60 * 1000;
    return Date.now() - timestamp > oneHour;
  }

  // Medical Records caching
  async cacheMedicalRecords(records) {
    return this.saveToCache(CACHE_KEYS.MEDICAL_RECORDS, records);
  }

  async getCachedMedicalRecords() {
    return this.getFromCache(CACHE_KEYS.MEDICAL_RECORDS);
  }

  // Family Members caching
  async cacheFamilyMembers(members) {
    return this.saveToCache(CACHE_KEYS.FAMILY_MEMBERS, members);
  }

  async getCachedFamilyMembers() {
    return this.getFromCache(CACHE_KEYS.FAMILY_MEMBERS);
  }

  // Appointments caching
  async cacheAppointments(appointments) {
    return this.saveToCache(CACHE_KEYS.APPOINTMENTS, appointments);
  }

  async getCachedAppointments() {
    return this.getFromCache(CACHE_KEYS.APPOINTMENTS);
  }

  // User profile caching
  async cacheUserProfile(profile) {
    return this.saveToCache(CACHE_KEYS.USER_PROFILE, profile);
  }

  async getCachedUserProfile() {
    return this.getFromCache(CACHE_KEYS.USER_PROFILE);
  }

  // Subscription caching
  async cacheSubscription(subscription) {
    return this.saveToCache(CACHE_KEYS.SUBSCRIPTION, subscription);
  }

  async getCachedSubscription() {
    return this.getFromCache(CACHE_KEYS.SUBSCRIPTION);
  }

  // Sync queue for offline operations
  async addToSyncQueue(operation) {
    try {
      const existingQueue = await this.getFromCache(CACHE_KEYS.SYNC_QUEUE);
      const queue = existingQueue?.data || [];
      
      const queueItem = {
        id: Date.now().toString(),
        operation,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      queue.push(queueItem);
      await this.saveToCache(CACHE_KEYS.SYNC_QUEUE, queue);
      return queueItem.id;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      return null;
    }
  }

  async getSyncQueue() {
    const result = await this.getFromCache(CACHE_KEYS.SYNC_QUEUE);
    return result?.data || [];
  }

  async removeFromSyncQueue(itemId) {
    try {
      const existingQueue = await this.getFromCache(CACHE_KEYS.SYNC_QUEUE);
      const queue = existingQueue?.data || [];
      
      const updatedQueue = queue.filter(item => item.id !== itemId);
      await this.saveToCache(CACHE_KEYS.SYNC_QUEUE, updatedQueue);
      return true;
    } catch (error) {
      console.error('Error removing from sync queue:', error);
      return false;
    }
  }

  async updateSyncQueueItem(itemId, updates) {
    try {
      const existingQueue = await this.getFromCache(CACHE_KEYS.SYNC_QUEUE);
      const queue = existingQueue?.data || [];
      
      const updatedQueue = queue.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      
      await this.saveToCache(CACHE_KEYS.SYNC_QUEUE, updatedQueue);
      return true;
    } catch (error) {
      console.error('Error updating sync queue item:', error);
      return false;
    }
  }

  // Clear all cached data
  async clearAllCache() {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Clear specific cache
  async clearCache(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error clearing specific cache:', error);
      return false;
    }
  }

  // Get cache size info
  async getCacheInfo() {
    try {
      const keys = Object.values(CACHE_KEYS);
      const cacheInfo = {};
      let totalSize = 0;

      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        const size = data ? JSON.stringify(data).length : 0;
        cacheInfo[key] = {
          size,
          exists: !!data,
          lastModified: data ? JSON.parse(data).timestamp : null,
        };
        totalSize += size;
      }

      return {
        totalSize,
        items: cacheInfo,
        formattedSize: this.formatBytes(totalSize),
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return null;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new OfflineStorageService();
