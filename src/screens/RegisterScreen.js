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

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { register } = useAuth();
  const { withErrorHandling, isLoading } = useError();

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    // Validate form data
    const validationRules = {
      firstName: { required: true, minLength: 2, message: 'First name must be at least 2 characters' },
      lastName: { required: true, minLength: 2, message: 'Last name must be at least 2 characters' },
      email: { required: true, email: true, message: 'Please enter a valid email' },
      password: { required: true, minLength: 6, message: 'Password must be at least 6 characters' },
      confirmPassword: { required: true, match: 'password', message: 'Passwords do not match' }
    };
    
    const validation = validateForm(formData, validationRules);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Show first validation error in alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }
    
    // Clear validation errors if form is valid
    setValidationErrors({});

    const result = await withErrorHandling(
      async () => {
        await register(email, password, {
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
        });
      },
      {
        errorType: ERROR_TYPES.AUTHENTICATION,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    // Navigation will be handled by AuthContext on successful registration
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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
          <Ionicons name="person-add" size={60} color="#6366f1" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us to secure your family's health records</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, hasFieldError('firstName', validationErrors) && styles.inputError]}
                placeholder="First Name"
                placeholderTextColor="#9ca3af"
                value={formData.firstName}
                onChangeText={(value) => updateFormData('firstName', value)}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, hasFieldError('lastName', validationErrors) && styles.inputError]}
                placeholder="Last Name"
                placeholderTextColor="#9ca3af"
                value={formData.lastName}
                onChangeText={(value) => updateFormData('lastName', value)}
                autoCapitalize="words"
              />
            </View>
          </View>
          {hasFieldError('firstName', validationErrors) && (
            <ValidationError error={getFieldError('firstName', validationErrors)} />
          )}
          {hasFieldError('lastName', validationErrors) && (
            <ValidationError error={getFieldError('lastName', validationErrors)} />
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError('email', validationErrors) && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
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
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, hasFieldError('confirmPassword', validationErrors) && styles.inputError]}
              placeholder="Confirm Password"
              placeholderTextColor="#9ca3af"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
          {hasFieldError('confirmPassword', validationErrors) && (
            <ValidationError error={getFieldError('confirmPassword', validationErrors)} />
          )}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    marginBottom: 16,
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
  registerButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginTextBold: {
    color: '#6366f1',
    fontWeight: '600',
  },
});

export default RegisterScreen;
