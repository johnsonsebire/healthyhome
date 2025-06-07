import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { ErrorProvider, ErrorBoundary } from './src/contexts/ErrorContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto-hiding the splash screen
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Error preventing splash screen auto hide:', error);
});

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Function to prepare the app
    async function prepareApp() {
      try {
        console.log('📱 App initialization started');
        
        // Add any initialization logic here
        // No Firebase initialization here - we do it in the service files
        
        // Simulate a delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
      } finally {
        // Mark the app as ready and hide splash screen
        setIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Error hiding splash screen:', e);
        }
      }
    }

    prepareApp();
  }, []);

  if (!isReady) {
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
                <View style={{flex: 1}}>
                  <AppNavigator />
                  <StatusBar style="auto" />
                </View>
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