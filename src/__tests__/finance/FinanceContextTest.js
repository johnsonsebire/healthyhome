// Test file for FinanceContext transaction loading
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { FinanceProvider, useFinance, FINANCE_SCOPE } from '../../contexts/FinanceContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date())
}));

// Mock Firebase Auth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user-id' }
  }))
}));

// Mock Family Sharing Context
jest.mock('../../contexts/FamilySharingContext', () => ({
  useFamilySharing: jest.fn(() => ({
    nuclearFamilyMembers: [],
    extendedFamilyMembers: []
  }))
}));

// Mock network service
jest.mock('../../services/networkService', () => ({
  isOnline: jest.fn(() => true)
}));

// Mock offline storage service
jest.mock('../../services/offlineStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}));

// Mock currency service
jest.mock('../../services/currencyService', () => ({
  loadUserCurrencySettings: jest.fn(),
  initializeExchangeRates: jest.fn(),
  refreshRates: jest.fn(),
  convertCurrency: jest.fn((amount) => amount),
  formatCurrency: jest.fn((amount) => `$${amount}`),
  getSupportedCurrencies: jest.fn(() => [])
}));

describe('FinanceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loadTransactions includes accounts without explicit scope set', async () => {
    // Mock accounts with and without scope
    const mockAccounts = [
      { id: 'account1', owner: 'test-user-id', scope: FINANCE_SCOPE.PERSONAL },
      { id: 'account2', owner: 'test-user-id' }, // No scope set
      { id: 'account3', owner: 'test-user-id', scope: null } // Null scope
    ];

    // Mock transactions for these accounts
    const mockTransactions = [
      { id: 'tx1', accountId: 'account1', amount: 100, type: 'expense', date: new Date() },
      { id: 'tx2', accountId: 'account2', amount: 200, type: 'expense', date: new Date() },
      { id: 'tx3', accountId: 'account3', amount: 300, type: 'expense', date: new Date() }
    ];

    // Setup mock query responses
    query.mockReturnValue('mock-query');
    getDocs.mockResolvedValue({
      docs: mockTransactions.map(tx => ({
        id: tx.id,
        data: () => tx
      }))
    });

    // Create wrapper that provides the Finance context
    const wrapper = ({ children }) => (
      <FinanceProvider>{children}</FinanceProvider>
    );

    // Render the hook with the provider
    const { result, waitForNextUpdate } = renderHook(() => useFinance(), { wrapper });

    // Wait for initial loading
    await waitForNextUpdate();

    // Manually set the accounts to our mock data
    act(() => {
      result.current.setAccounts(mockAccounts);
    });

    // Trigger loadTransactions with personal scope
    act(() => {
      result.current.changeScope(FINANCE_SCOPE.PERSONAL);
    });

    // Wait for transactions to load
    await waitForNextUpdate();

    // Verify transactions were loaded correctly
    expect(result.current.transactions).toHaveLength(3);
    expect(result.current.transactions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tx1' }),
      expect.objectContaining({ id: 'tx2' }),
      expect.objectContaining({ id: 'tx3' })
    ]));
  });
});
