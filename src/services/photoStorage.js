import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Local photo storage service for offline access
 * Handles downloading, caching, and retrieving photos locally
 */
class PhotoStorageService {
  constructor() {
    this.photoDirectory = FileSystem.documentDirectory + 'cached_photos/';
    this.initializeDirectory();
  }

  // Initialize the photo cache directory
  async initializeDirectory() {
    try {
      console.log('Initializing photo cache directory...');
      console.log('Target directory:', this.photoDirectory);
      
      const dirInfo = await FileSystem.getInfoAsync(this.photoDirectory);
      console.log('Directory info:', dirInfo);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.photoDirectory, { intermediates: true });
        console.log('Photo cache directory created successfully');
        
        // Verify directory was created
        const newDirInfo = await FileSystem.getInfoAsync(this.photoDirectory);
        console.log('Verification - Directory info after creation:', newDirInfo);
      } else {
        console.log('Photo cache directory already exists');
      }
    } catch (error) {
      console.error('Error initializing photo directory:', error);
      // Try to create in a different location if the default fails
      try {
        this.photoDirectory = FileSystem.cacheDirectory + 'photos/';
        console.log('Trying alternative directory:', this.photoDirectory);
        await FileSystem.makeDirectoryAsync(this.photoDirectory, { intermediates: true });
        console.log('Alternative photo cache directory created');
      } catch (altError) {
        console.error('Failed to create alternative directory:', altError);
      }
    }
  }

  // Generate a unique filename for cached photos
  generateCacheFilename(originalUri, userId, memberId) {
    const extension = this.getFileExtension(originalUri) || 'jpg';
    const timestamp = Date.now();
    return `${userId}_${memberId}_${timestamp}.${extension}`;
  }

  // Get file extension from URI
  getFileExtension(uri) {
    if (!uri) return null;
    const match = uri.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  // Cache a photo locally (simplified version with better error handling)
  async cachePhoto(photoUri, userId, memberId) {
    try {
      if (!photoUri) return null;

      // If it's already in our cache directory, return as is
      if (photoUri.includes('cached_photos')) {
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          return photoUri;
        }
      }

      const filename = this.generateCacheFilename(photoUri, userId, memberId);
      const localPath = this.photoDirectory + filename;

      // Handle remote URLs (Firebase Storage, etc.) - this is the primary use case
      if (photoUri.startsWith('http')) {
        try {
          console.log('Attempting to download photo:', photoUri);
          const downloadResult = await FileSystem.downloadAsync(photoUri, localPath);
          
          if (downloadResult.status === 200) {
            console.log('Photo downloaded and cached successfully:', localPath);
            return localPath;
          } else {
            console.log('Failed to download photo, status:', downloadResult.status);
            return photoUri; // Return original URL if download fails
          }
        } catch (downloadError) {
          console.log('Could not download photo, using original URL:', downloadError.message);
          return photoUri; // Return original URL if download fails
        }
      }

      // For local files, we'll skip caching due to compatibility issues
      // and just return the original URI
      if (photoUri.startsWith('file://')) {
        console.log('Local file detected, using original URI:', photoUri);
        return photoUri;
      }

      // Return original URI for any other cases
      return photoUri;
    } catch (error) {
      console.error('Error in cachePhoto:', error);
      return photoUri; // Return original URI as fallback
    }
  }

  // Get cached photo or return original
  async getCachedPhoto(originalUri, userId, memberId) {
    try {
      if (!originalUri) return null;

      // If it's already a local cached file, check if it exists
      if (originalUri.includes('cached_photos')) {
        const fileInfo = await FileSystem.getInfoAsync(originalUri);
        if (fileInfo.exists) {
          return originalUri;
        }
      }

      // Try to find existing cached version
      try {
        const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
        const memberFiles = files.filter(file => 
          file.includes(`${userId}_${memberId}`)
        );

        if (memberFiles.length > 0) {
          // Return the most recent cached version
          const sortedFiles = memberFiles.sort().reverse();
          const cachedPath = this.photoDirectory + sortedFiles[0];
          const fileInfo = await FileSystem.getInfoAsync(cachedPath);
          
          if (fileInfo.exists) {
            return cachedPath;
          }
        }
      } catch (dirError) {
        console.log('Could not read cache directory:', dirError.message);
      }

      // If no cached version exists and we're online, try to cache the original
      if (originalUri.startsWith('http') || originalUri.startsWith('file://')) {
        const cachedUri = await this.cachePhoto(originalUri, userId, memberId);
        return cachedUri || originalUri; // Return original if caching fails
      }

      // Return original URI as fallback
      return originalUri;
    } catch (error) {
      console.error('Error getting cached photo:', error);
      return originalUri; // Return original URI as fallback
    }
  }

  // Update family member with locally cached photo
  async updateMemberWithCachedPhoto(member, userId) {
    try {
      if (!member || !member.photo) return member;

      const cachedPhotoUri = await this.getCachedPhoto(member.photo, userId, member.id);
      
      return {
        ...member,
        photo: cachedPhotoUri || member.photo, // Always use original as fallback
        originalPhotoUri: member.photo, // Keep reference to original
        isPhotoCached: cachedPhotoUri && cachedPhotoUri !== member.photo
      };
    } catch (error) {
      console.error('Error updating member with cached photo:', error);
      return {
        ...member,
        isPhotoCached: false // Mark as not cached if there was an error
      };
    }
  }

  // Cache photos for multiple family members
  async cacheFamilyMemberPhotos(members, userId) {
    try {
      const updatedMembers = await Promise.all(
        members.map(member => this.updateMemberWithCachedPhoto(member, userId))
      );
      
      return updatedMembers;
    } catch (error) {
      console.error('Error caching family member photos:', error);
      return members; // Return original array if error
    }
  }

  // Clean old cached photos (keep only latest version per member)
  async cleanOldPhotos(userId) {
    try {
      const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
      const userFiles = files.filter(file => file.startsWith(`${userId}_`));
      
      // Group files by member ID
      const memberGroups = {};
      userFiles.forEach(file => {
        const parts = file.split('_');
        if (parts.length >= 3) {
          const memberId = parts[1];
          if (!memberGroups[memberId]) {
            memberGroups[memberId] = [];
          }
          memberGroups[memberId].push(file);
        }
      });

      // Keep only the latest file for each member
      for (const memberId in memberGroups) {
        const memberFiles = memberGroups[memberId].sort();
        const filesToDelete = memberFiles.slice(0, -1); // Keep the last (newest) file
        
        for (const fileToDelete of filesToDelete) {
          const filePath = this.photoDirectory + fileToDelete;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log('Deleted old cached photo:', filePath);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error cleaning old photos:', error);
      return false;
    }
  }

  // Delete cached photo for a specific member
  async deleteMemberPhoto(userId, memberId) {
    try {
      const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
      const memberFiles = files.filter(file => 
        file.includes(`${userId}_${memberId}`)
      );

      for (const file of memberFiles) {
        const filePath = this.photoDirectory + file;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        console.log('Deleted cached photo:', filePath);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting member photo:', error);
      return false;
    }
  }

  // Get cache info and size
  async getCacheInfo() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
      let totalSize = 0;
      
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(this.photoDirectory + file);
        totalSize += fileInfo.size || 0;
      }
      
      return {
        fileCount: files.length,
        totalSize,
        formattedSize: this.formatBytes(totalSize),
        directory: this.photoDirectory
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        fileCount: 0,
        totalSize: 0,
        formattedSize: '0 B',
        directory: this.photoDirectory
      };
    }
  }

  // Clear all cached photos
  async clearAllPhotos() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
      
      for (const file of files) {
        const filePath = this.photoDirectory + file;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
      
      console.log('All cached photos cleared');
      return true;
    } catch (error) {
      console.error('Error clearing all photos:', error);
      return false;
    }
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if photo exists locally
  async isPhotoCached(photoUri) {
    try {
      if (!photoUri || !photoUri.includes('cached_photos')) return false;
      
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  // Test file system capabilities (for debugging)
  async testFileSystem() {
    try {
      console.log('=== File System Capability Test ===');
      console.log('Document Directory:', FileSystem.documentDirectory);
      console.log('Cache Directory:', FileSystem.cacheDirectory);
      
      // Test directory creation
      const testDir = FileSystem.documentDirectory + 'test_directory/';
      await FileSystem.makeDirectoryAsync(testDir, { intermediates: true });
      console.log('✓ Directory creation works');
      
      // Test file creation
      const testFile = testDir + 'test.txt';
      await FileSystem.writeAsStringAsync(testFile, 'test content');
      console.log('✓ File creation works');
      
      // Test file reading
      const content = await FileSystem.readAsStringAsync(testFile);
      console.log('✓ File reading works, content:', content);
      
      // Test file info
      const info = await FileSystem.getInfoAsync(testFile);
      console.log('✓ File info works:', info);
      
      // Clean up
      await FileSystem.deleteAsync(testDir, { idempotent: true });
      console.log('✓ Cleanup completed');
      
      console.log('=== File System Test Complete ===');
      return true;
    } catch (error) {
      console.error('File System Test Failed:', error);
      return false;
    }
  }

  // Get debug cache info
  async getDebugCacheInfo() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photoDirectory);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(this.photoDirectory);
        console.log('Cache directory info:', {
          path: this.photoDirectory,
          exists: dirInfo.exists,
          fileCount: files.length,
          files: files.slice(0, 5) // Show first 5 files
        });
        return { fileCount: files.length, files };
      } else {
        console.log('Cache directory does not exist');
        return { fileCount: 0, files: [] };
      }
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { fileCount: 0, files: [] };
    }
  }
}

export default new PhotoStorageService();
