import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { ErrorProvider, ErrorBoundary } from './src/contexts/ErrorContext';
import AppNavigator from './src/navigation/AppNavigator';
import auth, { onAuthStateChanged } from './src/services/firebaseAuth';

export default function App() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [authState, setAuthState] = useState({ loading: true, user: null });

  useEffect(() => {
    console.log('📱 App.js: Starting initialization');

    const initializeFirebase = async () => {
      try {
        console.log('🔍 Checking auth instance:', {
          hasAuth: !!auth,
          authType: typeof auth,
        });

        const unsubscribe = onAuthStateChanged(
          (user) => {
            console.log('🔄 Auth state changed:', user ? 'Logged in' : 'No user');
            setAuthState({ loading: false, user: user || 'not logged in' });
            setIsFirebaseReady(true);
            console.log('✅ Firebase initialization complete');
          },
          (error) => {
            console.error('❌ Auth state error:', error);
            setAuthState({ loading: false, user: 'not logged in' });
            setIsFirebaseReady(true);
          }
        );

        const timeout = setTimeout(() => {
          console.warn('⚠️ Force completing auth loading after timeout');
          setAuthState({ loading: false, user: 'not logged in' });
          setIsFirebaseReady(true);
        }, 5000);

        return () => {
          unsubscribe();
          clearTimeout(timeout);
        };
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        setAuthState({ loading: false, user: 'not logged in' });
        setIsFirebaseReady(true);
      }
    };

    initializeFirebase();
  }, []);

  console.log('🔄 App.js render - Firebase ready:', isFirebaseReady, 'Auth state:', authState);

  if (!isFirebaseReady || authState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Initializing App...</Text>
        <Text style={styles.subtitleText}>Please wait while we set things up</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider>
        <NavigationContainer>
          <ErrorProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <AppNavigator authState={authState} />
                <StatusBar style="auto" />
              </SubscriptionProvider>
            </AuthProvider>
          </ErrorProvider>
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  subtitleText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});