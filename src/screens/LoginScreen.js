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
    // Validate form data
    const validationRules = {
      email: ['required', 'email'],
      password: ['required', { minLength: 6 }]
    };
    
    const formData = { email, password };
    const errors = validateForm(formData, validationRules);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors if form is valid
    setValidationErrors({});

    const result = await withErrorHandling(
      async () => {
        await login(email, password);
      },
      {
        errorType: ERROR_TYPES.AUTHENTICATION,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="medical" size={80} color="#6366f1" />
          <Text style={styles.title}>Family Medical Records</Text>
          <Text style={styles.subtitle}>Secure your family's health information</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError(validationErrors, 'email') && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          {hasFieldError(validationErrors, 'email') && (
            <ValidationError message={getFieldError(validationErrors, 'email')} />
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError(validationErrors, 'password') && styles.inputError]}
              placeholder="Password"
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
          {hasFieldError(validationErrors, 'password') && (
            <ValidationError message={getFieldError(validationErrors, 'password')} />
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
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
