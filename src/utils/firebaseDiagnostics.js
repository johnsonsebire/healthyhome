import { auth, db, storage } from '../../firebaseConfig';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const runFirebaseDiagnostics = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  console.log('🔬 Running Firebase Diagnostics...');

  // Test 1: Firebase services initialization
  try {
    results.tests.push({
      name: 'Firebase Services Initialization',
      status: 'success',
      details: {
        auth: !!auth,
        firestore: !!db,
        storage: !!storage,
        authConfig: {
          apiKey: auth.config?.apiKey?.substring(0, 10) + '...',
          authDomain: auth.config?.authDomain,
          projectId: auth.config?.projectId
        },
        authType: auth.constructor.name || 'Unknown',
        persistence: auth._config?.persistence ? 'Configured' : 'Not configured'
      }
    });
    console.log('✅ Firebase services initialized correctly');
    console.log('🔧 Auth type:', auth.constructor.name);
    console.log('💾 Persistence:', auth._config?.persistence ? 'Configured with AsyncStorage' : 'Not configured');
  } catch (error) {
    results.tests.push({
      name: 'Firebase Services Initialization',
      status: 'error',
      error: error.message
    });
    console.error('❌ Firebase services initialization failed:', error);
  }

  // Test 2: Authentication configuration test
  try {
    console.log('🔐 Testing authentication configuration...');
    
    // Try to get the current user (should not throw if auth is configured)
    const currentUser = auth.currentUser;
    
    results.tests.push({
      name: 'Authentication Configuration',
      status: 'success',
      details: {
        currentUser: !!currentUser,
        authReady: true
      }
    });
    console.log('✅ Authentication configuration is accessible');
  } catch (error) {
    results.tests.push({
      name: 'Authentication Configuration',
      status: 'error',
      error: error.message
    });
    console.error('❌ Authentication configuration test failed:', error);
  }

  // Test 3: Anonymous sign-in test (this will fail if auth is not enabled)
  try {
    console.log('👤 Testing anonymous authentication...');
    
    const userCredential = await signInAnonymously(auth);
    
    // Sign out immediately
    await auth.signOut();
    
    results.tests.push({
      name: 'Anonymous Authentication Test',
      status: 'success',
      details: {
        uid: userCredential.user.uid,
        message: 'Anonymous auth works - Email/Password should work too'
      }
    });
    console.log('✅ Anonymous authentication successful');
  } catch (error) {
    results.tests.push({
      name: 'Anonymous Authentication Test',
      status: 'error',
      error: error.message,
      errorCode: error.code,
      details: {
        message: error.code === 'auth/configuration-not-found' 
          ? 'Authentication is not enabled in Firebase Console'
          : 'Other authentication error'
      }
    });
    console.error('❌ Anonymous authentication failed:', error);
  }

  // Test 4: Firestore connection test
  try {
    console.log('🗄️ Testing Firestore connection...');
    
    const testDocRef = doc(db, 'test', 'diagnostic-test');
    await setDoc(testDocRef, {
      timestamp: new Date(),
      test: 'Firebase diagnostic'
    });
    
    results.tests.push({
      name: 'Firestore Connection Test',
      status: 'success',
      details: {
        message: 'Successfully wrote to Firestore'
      }
    });
    console.log('✅ Firestore connection successful');
  } catch (error) {
    results.tests.push({
      name: 'Firestore Connection Test',
      status: 'error',
      error: error.message,
      errorCode: error.code
    });
    console.error('❌ Firestore connection failed:', error);
  }

  // Test 5: Project configuration validation
  try {
    const config = auth.config;
    const validations = {
      hasApiKey: !!config?.apiKey,
      hasAuthDomain: !!config?.authDomain,
      hasProjectId: !!config?.projectId,
      authDomainFormat: config?.authDomain?.endsWith('.firebaseapp.com'),
      projectIdMatch: config?.projectId === 'familyhealthapp-e5fd3'
    };

    const allValid = Object.values(validations).every(v => v === true);

    results.tests.push({
      name: 'Project Configuration Validation',
      status: allValid ? 'success' : 'warning',
      details: validations
    });

    if (allValid) {
      console.log('✅ Project configuration is valid');
    } else {
      console.warn('⚠️ Some project configuration issues detected:', validations);
    }
  } catch (error) {
    results.tests.push({
      name: 'Project Configuration Validation',
      status: 'error',
      error: error.message
    });
    console.error('❌ Project configuration validation failed:', error);
  }

  // Generate summary
  const successCount = results.tests.filter(t => t.status === 'success').length;
  const errorCount = results.tests.filter(t => t.status === 'error').length;
  const warningCount = results.tests.filter(t => t.status === 'warning').length;

  results.summary = {
    total: results.tests.length,
    success: successCount,
    errors: errorCount,
    warnings: warningCount,
    overallStatus: errorCount > 0 ? 'issues_found' : 'healthy'
  };

  console.log('📊 Diagnostic Summary:', results.summary);
  
  return results;
};

export const formatDiagnosticResults = (results) => {
  let output = '🔬 Firebase Diagnostic Results\n';
  output += `📅 Timestamp: ${results.timestamp}\n\n`;
  
  results.tests.forEach((test, index) => {
    const icon = test.status === 'success' ? '✅' : test.status === 'error' ? '❌' : '⚠️';
    output += `${icon} ${test.name}\n`;
    
    if (test.status === 'error') {
      output += `   Error: ${test.error}\n`;
      if (test.errorCode) {
        output += `   Code: ${test.errorCode}\n`;
      }
    }
    
    if (test.details) {
      output += `   Details: ${JSON.stringify(test.details, null, 2)}\n`;
    }
    
    output += '\n';
  });
  
  output += `📊 Summary: ${results.summary.success}/${results.summary.total} tests passed\n`;
  
  if (results.summary.errors > 0) {
    output += '\n🚨 Action Required:\n';
    
    // Check for specific error types and provide targeted advice
    const hasConfigError = results.tests.some(test => 
      test.errorCode === 'auth/configuration-not-found'
    );
    
    if (hasConfigError) {
      output += '📧 CRITICAL: Enable Email/Password Authentication in Firebase Console\n';
      output += '   → Go to https://console.firebase.google.com/\n';
      output += '   → Select project: familyhealthapp-e5fd3\n';
      output += '   → Go to Authentication > Sign-in method\n';
      output += '   → Enable Email/Password provider\n';
      output += '   → Click Save\n\n';
    }
    
    output += '📋 General troubleshooting:\n';
    output += '1. Verify Firebase project configuration\n';
    output += '2. Check internet connection\n';
    output += '3. Restart app after making console changes\n';
    output += '4. See FIREBASE_CONSOLE_SETUP.md for detailed instructions\n';
  } else {
    output += '\n✅ All tests passed! Firebase is properly configured.\n';
    output += '🎉 You can now proceed with user registration and login.\n';
  }
  
  return output;
};
