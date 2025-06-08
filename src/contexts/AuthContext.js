import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

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
    try {
      console.log('📝 Attempting registration for:', email);
      console.log('🔥 Firebase Auth object:', !!auth);
      console.log('🔥 Firebase Auth config:', {
        apiKey: auth.config?.apiKey ? 'Present' : 'Missing',
        authDomain: auth.config?.authDomain,
        projectId: auth.config?.projectId
      });
      
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
      console.error('❌ Error code:', error.code);
      console.error('❌ Full error:', error);
      throw error;
    }
  };

  const logout = async () => {
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