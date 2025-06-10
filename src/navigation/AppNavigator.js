import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RecordsScreen from '../screens/RecordsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AddRecordScreen from '../screens/AddRecordScreen';
import EditRecordScreen from '../screens/EditRecordScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import FamilyMemberScreen from '../screens/FamilyMemberScreen';
import FamilyMemberDetailScreen from '../screens/FamilyMemberDetailScreen';
import FamilyTreeScreen from '../screens/FamilyTreeScreen';
import FamilySharingScreen from '../screens/FamilySharingScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import HelpFaqScreen from '../screens/HelpFaqScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import DataExportScreen from '../screens/DataExportScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Records') {
          iconName = focused ? 'documents' : 'documents-outline';
        } else if (route.name === 'Schedule') {
          iconName = focused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'Insurance') {
          iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: 'gray',
      headerStyle: {
        backgroundColor: '#6366f1',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Records" component={RecordsScreen} />
    <Tab.Screen name="Schedule" component={ScheduleScreen} />
    <Tab.Screen name="Insurance" component={InsuranceScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="MainTabs" 
      component={MainTabs} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="AddRecord" 
      component={AddRecordScreen}
      options={{ 
        title: 'Add Record',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="RecordDetail" 
      component={RecordDetailScreen}
      options={{ 
        title: 'Record Details',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="EditRecord" 
      component={EditRecordScreen}
      options={{ 
        title: 'Edit Record',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="FamilyMember" 
      component={FamilyMemberScreen}
      options={{ 
        title: 'Family Member',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="FamilyMemberDetail" 
      component={FamilyMemberDetailScreen}
      options={{ 
        title: 'Family Member Details',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="FamilyTree" 
      component={FamilyTreeScreen}
      options={{ 
        title: 'Family Tree',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="FamilySharing" 
      component={FamilySharingScreen}
      options={{ 
        title: 'Family Sharing',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="Subscription" 
      component={SubscriptionScreen}
      options={{ 
        title: 'Subscription',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ 
        title: 'My Profile',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="PrivacyPolicy" 
      component={PrivacyPolicyScreen}
      options={{ 
        title: 'Privacy Policy',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="TermsOfService" 
      component={TermsOfServiceScreen}
      options={{ 
        title: 'Terms of Service',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="HelpFaq" 
      component={HelpFaqScreen}
      options={{ 
        title: 'Help & FAQ',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ 
        title: 'Notifications',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="PrivacySecurity" 
      component={PrivacySecurityScreen}
      options={{ 
        title: 'Privacy & Security',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
    <Stack.Screen 
      name="DataExport" 
      component={DataExportScreen}
      options={{ 
        title: 'Data Export',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff'
      }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [isNewUser, setIsNewUser] = useState(false);
  const [checkingUserStatus, setCheckingUserStatus] = useState(true);
  
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check if the user is on free plan and has been registered in the last 10 minutes
            const isRecentlyRegistered = userData.createdAt && 
              (new Date().getTime() - userData.createdAt.toDate().getTime()) < 10 * 60 * 1000;
            const isFreePlan = userData.subscriptionPlan === 'free';
            
            setIsNewUser(isRecentlyRegistered && isFreePlan);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
        setCheckingUserStatus(false);
      } else {
        setCheckingUserStatus(false);
      }
    };

    checkUserStatus();
  }, [user]);
  
  console.log('🧭 AppNavigator - Auth state:', { 
    user: user ? 'logged in' : 'not logged in', 
    loading,
    isNewUser,
    checkingUserStatus
  });

  if (loading || checkingUserStatus) {
    // Return null to let App.js loading spinner handle initial loading
    return null;
  }

  if (!user) {
    return <AuthStack />;
  }
  
  if (isNewUser) {
    // If it's a new user (recently registered and on free plan), show onboarding
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AppStack" component={AppStack} />
      </Stack.Navigator>
    );
  }

  return <AppStack />;
};

export default AppNavigator;
