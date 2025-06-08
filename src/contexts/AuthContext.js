import React, { createContext, useContext, useState, useEffect } from 'react';

// Defensive import - handle cases where Firebase might not be initialized
let auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, doc, setDoc, getDoc;

try {
  const firebaseImports = require('../services/firebase');
  auth = firebaseImports.auth;
  db = firebaseImports.db;
  onAuthStateChanged = firebaseImports.onAuthStateChanged;
  signInWithEmailAndPassword = firebaseImports.signInWithEmailAndPassword;
  createUserWithEmailAndPassword = firebaseImports.createUserWithEmailAndPassword;
  signOut = firebaseImports.signOut;
  doc = firebaseImports.doc;
  setDoc = firebaseImports.setDoc;
  getDoc = firebaseImports.getDoc;
} catch (error) {
  console.error('❌ Error importing Firebase services in AuthContext:', error);
}

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Safety check: ensure Firebase is properly initialized
    if (!auth || !db || !onAuthStateChanged) {
      console.error('❌ Firebase services not available in AuthContext');
      setAuthError('Firebase initialization failed');
      setLoading(false);
      return;
    }

    console.log('🔍 AuthContext: Setting up auth state change listener');

    const unsubscribe = onAuthStateChanged(auth, async (userState) => {
      console.log('🔄 Auth state changed:', userState ? `User logged in (${userState.email})` : 'No user');
      
      setUser(userState);

      if (userState) {
        try {
          console.log('📡 Fetching user profile from Firestore');
          const userDoc = await getDoc(doc(db, 'users', userState.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
            console.log('✅ User profile loaded successfully');
          } else {
            console.log('⚠️ No user profile found in Firestore - creating a basic one');
            const defaultProfile = {
              email: userState.email,
              displayName: userState.displayName || userState.email.split('@')[0],
              createdAt: new Date(),
              subscriptionPlan: 'basic',
            };
            await setDoc(doc(db, 'users', userState.uid), defaultProfile);
            setUserProfile(defaultProfile);
            console.log('✅ Default user profile created');
          }
        } catch (error) {
          console.error('❌ Error fetching/creating user profile:', error);
          setUserProfile(null);
          setAuthError(error.message);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
      setAuthError(null);
    }, (error) => {
      console.error('❌ Auth state error:', error);
      setAuthError(error.message);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (!auth || !signInWithEmailAndPassword) {
      throw new Error('Firebase Auth not available');
    }
    
    try {
      console.log('🔐 Attempting login for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful');
      return result;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  };

  const register = async (email, password, userData) => {
    if (!auth || !createUserWithEmailAndPassword || !db || !setDoc || !doc) {
      throw new Error('Firebase services not available');
    }
    
    try {
      console.log('📝 Attempting registration for:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('💾 Creating user profile in Firestore');
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        createdAt: new Date(),
        subscriptionPlan: 'basic',
        ...userData,
      });

      console.log('✅ Registration successful');
      return result;
    } catch (error) {
      console.error('❌ Registration failed:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth || !signOut) {
      throw new Error('Firebase Auth not available');
    }
    
    try {
      console.log('🚪 Attempting logout');
      await signOut(auth);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    login,
    register,
    logout,
    loading,
    authError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};