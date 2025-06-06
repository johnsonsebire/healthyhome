// App constants and configuration

export const APP_CONFIG = {
  name: 'Family Medical Records',
  version: '1.0.0',
  supportEmail: 'support@familymedical.app',
  privacyPolicyUrl: 'https://familymedical.app/privacy',
  termsOfServiceUrl: 'https://familymedical.app/terms',
};

export const MEDICAL_RECORD_TYPES = {
  PRESCRIPTION: 'prescription',
  DIAGNOSIS: 'diagnosis',
  LAB_RESULT: 'lab_result',
  HOSPITAL_CARD: 'hospital_card',
  BILL: 'bill',
  INSURANCE: 'insurance',
  VACCINATION: 'vaccination',
  SURGERY: 'surgery',
  ALLERGY: 'allergy',
  OTHER: 'other',
};

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
};

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 1,
    limits: {
      familyMembers: 3,
      records: 10,
      storage: 100 * 1024 * 1024, // 100MB
      appointments: 10,
    },
    features: [
      'Up to 3 family members',
      'Up to 10 medical records',
      '100MB storage',
      'Basic appointment scheduling',
      'Standard support',
    ],
  },
  STANDARD: {
    id: 'standard',
    name: 'Standard',
    price: 2,
    limits: {
      familyMembers: 10,
      records: 100,
      storage: 500 * 1024 * 1024, // 500MB
      appointments: 50,
    },
    features: [
      'Up to 10 family members',
      'Up to 100 medical records',
      '500MB storage',
      'Advanced appointment scheduling',
      'OCR document scanning',
      'Data export',
      'Priority support',
    ],
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 3,
    limits: {
      familyMembers: 50,
      records: -1, // unlimited
      storage: 2 * 1024 * 1024 * 1024, // 2GB
      appointments: -1, // unlimited
    },
    features: [
      'Up to 50 family members',
      'Unlimited medical records',
      '2GB storage',
      'Advanced appointment scheduling',
      'OCR document scanning',
      'Data export & backup',
      'Insurance claim tracking',
      'Health analytics',
      '24/7 premium support',
    ],
  },
};

export const FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt'],
  ALL_SUPPORTED: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf', 'doc', 'docx', 'txt'],
};

export const MAX_FILE_SIZE = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
};

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Uncle/Aunt',
  'Cousin',
  'Partner',
  'Other',
];

export const SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Surgery',
  'Urology',
  'Other',
];

export const NOTIFICATION_TYPES = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  MEDICATION_REMINDER: 'medication_reminder',
  DOCUMENT_EXPIRY: 'document_expiry',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
  GENERAL: 'general',
};

export const COLORS = {
  PRIMARY: '#007AFF',
  SECONDARY: '#5856D6',
  SUCCESS: '#34C759',
  WARNING: '#FF9500',
  ERROR: '#FF3B30',
  GRAY: '#8E8E93',
  LIGHT_GRAY: '#F2F2F7',
  DARK_GRAY: '#48484A',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
};

export const FONTS = {
  REGULAR: 'System',
  MEDIUM: 'System',
  BOLD: 'System',
  LIGHT: 'System',
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  ROUND: 50,
};

export const SHADOW = {
  SMALL: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  MEDIUM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  LARGE: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

export const API_ENDPOINTS = {
  // These would be your actual API endpoints in production
  BASE_URL: 'https://api.familymedical.app',
  AUTH: '/auth',
  USERS: '/users',
  RECORDS: '/records',
  APPOINTMENTS: '/appointments',
  NOTIFICATIONS: '/notifications',
};

export const STORAGE_KEYS = {
  USER_PREFERENCES: '@family_medical_user_preferences',
  OFFLINE_QUEUE: '@family_medical_offline_queue',
  CACHED_DATA: '@family_medical_cached_data',
  SUBSCRIPTION: '@family_medical_subscription',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  STORAGE_ERROR: 'Unable to save data. Please try again.',
  PERMISSION_ERROR: 'Permission denied. Please check app settings.',
  SUBSCRIPTION_ERROR: 'Subscription limit reached. Please upgrade your plan.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export const SUCCESS_MESSAGES = {
  RECORD_SAVED: 'Medical record saved successfully.',
  APPOINTMENT_SCHEDULED: 'Appointment scheduled successfully.',
  DATA_EXPORTED: 'Data exported successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully.',
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-Z\s]{2,50}$/,
};

export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'MMM DD, YYYY HH:mm',
};

export const PERMISSIONS = {
  CAMERA: 'camera',
  PHOTO_LIBRARY: 'photo_library',
  NOTIFICATIONS: 'notifications',
  CALENDAR: 'calendar',
  CONTACTS: 'contacts',
};
