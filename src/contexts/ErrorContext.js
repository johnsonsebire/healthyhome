import React, { createContext, useContext, useReducer } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  STORAGE: 'STORAGE',
  PERMISSION: 'PERMISSION',
  SUBSCRIPTION: 'SUBSCRIPTION',
  UNKNOWN: 'UNKNOWN',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const initialState = {
  errors: [],
  isLoading: false,
  lastError: null,
};

const errorReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
        lastError: action.payload,
      };
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
      };
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        lastError: null,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    default:
      return state;
  }
};

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const addError = (error) => {
    const errorObj = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: error.type || ERROR_TYPES.UNKNOWN,
      severity: error.severity || ERROR_SEVERITY.MEDIUM,
      message: error.message || 'An unknown error occurred',
      details: error.details || null,
      action: error.action || null,
    };

    dispatch({ type: 'ADD_ERROR', payload: errorObj });

    // Handle error based on severity
    handleErrorBySeverity(errorObj);

    return errorObj.id;
  };

  const removeError = (errorId) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const handleErrorBySeverity = (error) => {
    switch (error.severity) {
      case ERROR_SEVERITY.CRITICAL:
        Alert.alert(
          'Critical Error',
          error.message,
          [
            { text: 'OK', onPress: () => removeError(error.id) }
          ]
        );
        break;
      
      case ERROR_SEVERITY.HIGH:
        Alert.alert(
          'Error',
          error.message,
          [
            { text: 'Dismiss', onPress: () => removeError(error.id) },
            ...(error.action ? [{ text: error.action.label, onPress: error.action.onPress }] : [])
          ]
        );
        break;
      
      case ERROR_SEVERITY.MEDIUM:
        // Could show a toast or in-app notification
        console.warn('Error:', error.message);
        break;
      
      case ERROR_SEVERITY.LOW:
        // Log only
        console.log('Minor error:', error.message);
        break;
    }
  };

  // Wrapper for async operations with error handling
  const withErrorHandling = async (operation, options = {}) => {
    const {
      loadingMessage = 'Loading...',
      errorType = ERROR_TYPES.UNKNOWN,
      errorSeverity = ERROR_SEVERITY.MEDIUM,
      showLoading = true,
    } = options;

    console.log('🔄 withErrorHandling: Starting operation with options:', options);

    if (showLoading) {
      console.log('⏳ withErrorHandling: Setting loading to true');
      setLoading(true);
    }

    try {
      console.log('🚀 withErrorHandling: Executing operation...');
      const result = await operation();
      console.log('✅ withErrorHandling: Operation completed successfully');
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ withErrorHandling: Operation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      const errorId = addError({
        type: errorType,
        severity: errorSeverity,
        message: error.message || 'Operation failed',
        details: error,
      });

      console.log('🚨 withErrorHandling: Error added with ID:', errorId);
      return { success: false, error, errorId };
    } finally {
      if (showLoading) {
        console.log('⏳ withErrorHandling: Setting loading to false');
        setLoading(false);
      }
    }
  };

  const value = {
    ...state,
    addError,
    removeError,
    clearErrors,
    setLoading,
    withErrorHandling,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

// Error boundary for catching React errors
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log error to crash reporting service
    // this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Integrate with crash reporting service like Crashlytics
    console.log('Logging error to service:', error.message);
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={errorBoundaryStyles.container}>
          <Text style={errorBoundaryStyles.title}>Something went wrong</Text>
          <Text style={errorBoundaryStyles.message}>
            The application encountered an unexpected error.
          </Text>
          <TouchableOpacity 
            style={errorBoundaryStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorBoundaryStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Utility functions for common error scenarios
export const createNetworkError = (message = 'Network connection failed') => ({
  type: ERROR_TYPES.NETWORK,
  severity: ERROR_SEVERITY.HIGH,
  message,
  action: {
    label: 'Retry',
    onPress: () => {
      // Retry logic would be passed from the component
    }
  }
});

export const createAuthError = (message = 'Authentication failed') => ({
  type: ERROR_TYPES.AUTHENTICATION,
  severity: ERROR_SEVERITY.HIGH,
  message,
});

export const createValidationError = (message) => ({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.LOW,
  message,
});

export const createStorageError = (message = 'Storage operation failed') => ({
  type: ERROR_TYPES.STORAGE,
  severity: ERROR_SEVERITY.MEDIUM,
  message,
});

export const createSubscriptionError = (message = 'Subscription limit reached') => ({
  type: ERROR_TYPES.SUBSCRIPTION,
  severity: ERROR_SEVERITY.MEDIUM,
  message,
  action: {
    label: 'Upgrade',
    onPress: () => {
      // Navigate to subscription screen
    }
  }
});

const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
