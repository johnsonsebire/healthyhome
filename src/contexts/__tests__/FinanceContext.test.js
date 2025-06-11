import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { FinanceProvider, useFinance, FINANCE_SCOPE } from '../FinanceContext';

// Mocking the dependencies
jest.mock('../../firebaseConfig');

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user-id' },
    userProfile: {
      displayName: 'Test User',
      email: 'test@example.com',
    },
  })),
}));

jest.mock('../FamilySharingContext', () => ({
  useFamilySharing: jest.fn(() => ({
    nuclearFamilyId: 'test-nuclear-family-id',
    extendedFamilyId: 'test-extended-family-id',
    nuclearFamilyMembers: [],
    extendedFamilyMembers: [],
  })),
}));

jest.mock('../../services/networkService', () => ({
  isOnline: jest.fn(() => true),
}));

jest.mock('../../services/offlineStorage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const firebaseDoc = {
  id: 'test-doc-id',
  data: () => ({
    name: 'Test Account',
    balance: 1000,
    type: 'savings',
    createdAt: new Date(),
    userId: 'test-user-id',
    scope: FINANCE_SCOPE.PERSONAL,
  }),
};

// Mock collection query response
const mockGetDocs = jest.fn(() => Promise.resolve({
  docs: [firebaseDoc],
  forEach: jest.fn((callback) => {
    callback(firebaseDoc);
  }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({
    exists: jest.fn(() => true),
    data: jest.fn(() => ({})),
    id: 'mock-doc-id'
  })),
  getDocs: mockGetDocs,
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

describe('FinanceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial state values', async () => {
    const wrapper = ({ children }) => (
      <FinanceProvider>{children}</FinanceProvider>
    );

    const { result } = renderHook(() => useFinance(), { wrapper });

    // Check initial state
    expect(result.current.accounts).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.projects).toEqual([]);
    expect(result.current.loans).toEqual([]);
    expect(result.current.welfareAccounts).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.currentScope).toBe(FINANCE_SCOPE.PERSONAL);
  });

  it('should change scope when changeScope is called', async () => {
    const wrapper = ({ children }) => (
      <FinanceProvider>{children}</FinanceProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useFinance(), { wrapper });
    
    // Wait for initial load
    await waitForNextUpdate();

    // Change scope to nuclear
    await act(async () => {
      result.current.changeScope(FINANCE_SCOPE.NUCLEAR);
      await waitForNextUpdate();
    });

    expect(result.current.currentScope).toBe(FINANCE_SCOPE.NUCLEAR);

    // Change scope to extended
    await act(async () => {
      result.current.changeScope(FINANCE_SCOPE.EXTENDED);
      await waitForNextUpdate();
    });

    expect(result.current.currentScope).toBe(FINANCE_SCOPE.EXTENDED);
  });

  // Add more tests for other methods in FinanceContext
});
