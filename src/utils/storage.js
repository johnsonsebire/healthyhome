// Storage utilities for file size calculations and formatting

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getStorageLimits = (plan) => {
  const limits = {
    basic: 100 * 1024 * 1024,    // 100MB
    standard: 500 * 1024 * 1024, // 500MB  
    premium: 2 * 1024 * 1024 * 1024, // 2GB
  };
  
  return limits[plan] || limits.basic;
};

export const calculateStorageUsage = (files) => {
  return files.reduce((total, file) => {
    return total + (file.size || 0);
  }, 0);
};

export const canUploadFile = (currentUsage, fileSize, storageLimit) => {
  return (currentUsage + fileSize) <= storageLimit;
};

// File type validation
export const isValidFileType = (fileName, allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']) => {
  const extension = fileName.toLowerCase().split('.').pop();
  return allowedTypes.includes(extension);
};

export const getFileIcon = (fileName) => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const iconMap = {
    pdf: 'document-text',
    doc: 'document-text',
    docx: 'document-text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    txt: 'document-text',
    default: 'document'
  };
  
  return iconMap[extension] || iconMap.default;
};
