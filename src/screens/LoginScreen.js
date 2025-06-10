import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ValidationError from '../components/ValidationError';
import { validateForm, getFieldError, hasFieldError } from '../utils/validation';
// COMMENTED OUT: Firebase diagnostics import - no longer needed as Firebase is working correctly
// import { runFirebaseDiagnostics, formatDiagnosticResults } from '../utils/firebaseDiagnostics';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { login } = useAuth();
  const { withErrorHandling, isLoading } = useError();

  const handleLogin = async () => {
    console.log('🔐 Login attempt started', { email: email || 'empty', password: password ? 'provided' : 'empty' });
    
    // Prevent multiple submission attempts
    if (loading || isLoading) {
      return;
    }
    
    // Set local loading state
    setLoading(true);
    
    // Validate form data
    const validationRules = {
      email: [
        { required: true, message: 'Email is required' },
        { email: true, message: 'Please enter a valid email' }
      ],
      password: [
        { required: true, message: 'Password is required' },
        { minLength: 6, message: 'Password must be at least 6 characters' }
      ]
    };
    
    const formData = { email, password };
    const validation = validateForm(formData, validationRules);
    
    console.log('📋 Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      setValidationErrors(validation.errors);
      
      // Show first validation error in alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      setLoading(false);
      return;
    }
    
    // Clear validation errors if form is valid
    setValidationErrors({});
    console.log('✅ Validation passed, attempting login...');

    const result = await withErrorHandling(
      async () => {
        console.log('🚀 Calling login function...');
        await login(email, password);
        console.log('✅ Login function completed successfully');
      },
      {
        errorType: ERROR_TYPES.AUTHENTICATION,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    console.log('🔄 Login process result:', result);
    // Reset loading state in case navigation hasn't happened yet
    setLoading(false);
    // Navigation will be handled by AuthContext on successful login
  };

  // COMMENTED OUT: Firebase diagnostics functionality - no longer needed as Firebase is working correctly
  // Users can now register and login to their accounts without issues
  /*
  const handleFirebaseDiagnostics = async () => {
    try {
      Alert.alert('🔬 Running Diagnostics', 'Testing Firebase configuration...');
      
      const results = await runFirebaseDiagnostics();
      
      console.log('🔬 Firebase Diagnostic Results:', formatDiagnosticResults(results));
      
      const authTest = results.tests.find(t => t.name === 'Anonymous Authentication Test');
      const hasAuthError = authTest && authTest.status === 'error' && authTest.errorCode === 'auth/configuration-not-found';
      
      let message = `Tests: ${results.summary.success}/${results.summary.total} passed\n\n`;
      
      if (hasAuthError) {
        message += '❌ Authentication Not Enabled\n\n';
        message += 'SOLUTION:\n';
        message += '1. Go to Firebase Console\n';
        message += '2. Enable Email/Password Auth\n';
        message += '3. Restart the app';
      } else if (results.summary.success === results.summary.total) {
        message += '✅ All tests passed!\nYou should be able to login now.';
      }
      
      Alert.alert('🔬 Firebase Diagnostics', message);
    } catch (error) {
      Alert.alert('❌ Diagnostic Error', error.message);
      console.error('Firebase diagnostics failed:', error);
    }
  };
  */

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="medical" size={80} color="#6366f1" />
          <Text style={styles.title}>Family Medical Records</Text>
          <Text style={styles.subtitle}>Secure your family's health information</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError('email', validationErrors) && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          {hasFieldError('email', validationErrors) && (
            <ValidationError error={getFieldError('email', validationErrors)} />
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError('password', validationErrors) && styles.inputError]}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
          {hasFieldError('password', validationErrors) && (
            <ValidationError error={getFieldError('password', validationErrors)} />
          )}

          <TouchableOpacity
            style={[styles.loginButton, (loading || isLoading) && styles.disabledButton]}
            onPress={() => {
              console.log('🔥 LOGIN BUTTON PRESSED!');
              handleLogin();
            }}
            disabled={loading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {(loading || isLoading) ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* COMMENTED OUT: Firebase Diagnostics Button - no longer needed as Firebase is working correctly */}
          {/*
          <TouchableOpacity
            style={styles.diagnosticButton}
            onPress={handleFirebaseDiagnostics}
          >
            <Text style={styles.diagnosticButtonText}>
              🔬 Test Firebase Connection
            </Text>
          </TouchableOpacity>
          */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  inputPlaceholder: {
    color: '#9ca3af',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerTextBold: {
    color: '#6366f1',
    fontWeight: '600',
  },
  diagnosticButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  diagnosticButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default LoginScreen;
