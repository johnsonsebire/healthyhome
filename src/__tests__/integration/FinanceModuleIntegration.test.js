import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Mock the context providers and screens
const AuthContext = {
  Provider: ({ children, value }) => <>{children}</>,
};

const FamilySharingContext = {
  Provider: ({ children, value }) => <>{children}</>,
};

const FinanceProvider = ({ children }) => <>{children}</>;
const FINANCE_SCOPE = {
  PERSONAL: 'personal',
  NUCLEAR: 'nuclear',
  EXTENDED: 'extended'
};

// Mock the screens
const WelfareAccountsScreen = () => <div>WelfareAccountsScreen</div>;
const WelfareAccountDetailsScreen = () => <div>WelfareAccountDetailsScreen</div>;
const AddWelfareAccountScreen = () => <div>AddWelfareAccountScreen</div>;
const ContributeToWelfareScreen = () => <div>ContributeToWelfareScreen</div>;

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({
    exists: jest.fn(() => true),
    data: jest.fn(() => ({})),
    id: 'mock-doc-id'
  })),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
    forEach: jest.fn()
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('../../firebaseConfig');

jest.mock('../../services/networkService', () => ({
  isOnline: jest.fn(() => true),
}));

jest.mock('../../services/offlineStorage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Create a mock stack navigator
const Stack = createStackNavigator();

const MockNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="WelfareAccounts" component={WelfareAccountsScreen} />
    <Stack.Screen 
      name="WelfareAccountDetails" 
      component={WelfareAccountDetailsScreen} 
      initialParams={{ accountId: 'welfare1' }}
    />
    <Stack.Screen name="AddWelfareAccount" component={AddWelfareAccountScreen} />
    <Stack.Screen name="ContributeToWelfare" component={ContributeToWelfareScreen} />
  </Stack.Navigator>
);

// Create a wrapper component with all required contexts
const TestWrapper = ({ children }) => {
  const authValue = {
    user: { uid: 'test-user-id' },
    userProfile: {
      displayName: 'Test User',
      email: 'test@example.com',
    },
    isAuthenticated: true,
  };

  const familySharingValue = {
    nuclearFamilyId: 'test-nuclear-family-id',
    extendedFamilyId: 'test-extended-family-id',
    nuclearFamilyMembers: [],
    extendedFamilyMembers: [
      { id: 'user1', name: 'John Doe' },
      { id: 'user2', name: 'Jane Doe' },
    ],
    currentUserProfile: {
      id: 'user1',
      name: 'John Doe'
    }
  };

  return (
    <NavigationContainer>
      <AuthContext.Provider value={authValue}>
        <FamilySharingContext.Provider value={familySharingValue}>
          <FinanceProvider>
            {children}
          </FinanceProvider>
        </FamilySharingContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

describe('Finance Module Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates from welfare accounts list to account details', async () => {
    // Mock response for the welfare accounts list
    const { getDocs } = require('firebase/firestore');
    getDocs.mockImplementation(() => Promise.resolve({
      docs: [
        {
          id: 'welfare1',
          data: () => ({
            name: 'Family Emergency Fund',
            balance: 5000,
            goal: 10000,
            description: 'For family emergencies',
            contributionFrequency: 'monthly',
            contributionAmount: 200,
            familyId: 'test-extended-family-id',
            members: ['user1', 'user2'],
            createdAt: new Date('2023-01-01'),
            lastContribution: new Date('2023-06-01'),
          })
        }
      ],
      forEach: jest.fn((callback) => {
        callback({
          id: 'welfare1',
          data: () => ({
            name: 'Family Emergency Fund',
            balance: 5000,
            goal: 10000,
            description: 'For family emergencies',
            contributionFrequency: 'monthly',
            contributionAmount: 200,
            familyId: 'test-extended-family-id',
            members: ['user1', 'user2'],
            createdAt: new Date('2023-01-01'),
            lastContribution: new Date('2023-06-01'),
          })
        });
      })
    }));

    // Render the navigation stack
    const { getByText, queryByText } = render(
      <TestWrapper>
        <MockNavigator />
      </TestWrapper>
    );

    // Wait for the welfare accounts to load
    await waitFor(() => {
      expect(getByText('Family Emergency Fund')).toBeTruthy();
    });

    // Navigate to account details
    fireEvent.press(getByText('Family Emergency Fund'));

    // Mock the response for the welfare account details
    const { getDoc } = require('firebase/firestore');
    getDoc.mockImplementation(() => Promise.resolve({
      exists: () => true,
      data: () => ({
        name: 'Family Emergency Fund',
        balance: 5000,
        goal: 10000,
        description: 'For family emergencies',
        contributionFrequency: 'monthly',
        contributionAmount: 200,
        familyId: 'test-extended-family-id',
        members: ['user1', 'user2'],
        createdAt: new Date('2023-01-01'),
        lastContribution: new Date('2023-06-01'),
        contributions: []
      }),
      id: 'welfare1'
    }));

    // Check that account details are displayed
    await waitFor(() => {
      expect(getByText('Family Emergency Fund')).toBeTruthy();
      expect(getByText('For family emergencies')).toBeTruthy();
      expect(getByText('Goal: $10,000')).toBeTruthy();
    });
  });

  it('creates a new welfare account and navigates back to list', async () => {
    // Mock responses
    const { getDocs, addDoc } = require('firebase/firestore');
    
    // First render will show empty list
    getDocs.mockImplementation(() => Promise.resolve({
      docs: [],
      forEach: jest.fn()
    }));
    
    // After adding account, will show the new account
    addDoc.mockImplementation(() => Promise.resolve({ id: 'new-welfare-id' }));

    // Render the navigation stack
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <MockNavigator />
      </TestWrapper>
    );

    // Wait for the empty welfare accounts list to load
    await waitFor(() => {
      expect(getByText('No welfare accounts found')).toBeTruthy();
    });

    // Navigate to add welfare account screen
    fireEvent.press(getByTestId('add-welfare-button'));

    // Fill out the form
    await waitFor(() => {
      expect(getByText('Create Welfare Account')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Account Name'), 'New Welfare Fund');
    fireEvent.changeText(getByPlaceholderText('Description'), 'A new welfare fund');
    fireEvent.changeText(getByPlaceholderText('Initial Balance'), '1000');
    fireEvent.changeText(getByPlaceholderText('Goal Amount'), '5000');
    fireEvent.changeText(getByPlaceholderText('Contribution Amount'), '100');

    // Submit the form
    fireEvent.press(getByText('Create Account'));

    // After creation, should navigate back and show the new list
    getDocs.mockImplementation(() => Promise.resolve({
      docs: [
        {
          id: 'new-welfare-id',
          data: () => ({
            name: 'New Welfare Fund',
            balance: 1000,
            goal: 5000,
            description: 'A new welfare fund',
            contributionFrequency: 'monthly',
            contributionAmount: 100,
            familyId: 'test-extended-family-id',
            members: ['user1'],
            createdAt: new Date(),
            lastContribution: null,
          })
        }
      ],
      forEach: jest.fn((callback) => {
        callback({
          id: 'new-welfare-id',
          data: () => ({
            name: 'New Welfare Fund',
            balance: 1000,
            goal: 5000,
            description: 'A new welfare fund',
            contributionFrequency: 'monthly',
            contributionAmount: 100,
            familyId: 'test-extended-family-id',
            members: ['user1'],
            createdAt: new Date(),
            lastContribution: null,
          })
        });
      })
    }));

    // Check that we're back on the list with the new account
    await waitFor(() => {
      expect(getByText('New Welfare Fund')).toBeTruthy();
    });
  });
});
