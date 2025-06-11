import financeService from '../financeService';
import networkService from '../networkService';
import offlineStorageService from '../offlineStorage';
import { FINANCE_SCOPE } from '../../contexts/FinanceContext';

// Mocking dependencies
jest.mock('../../firebaseConfig');

jest.mock('../networkService', () => ({
  isOnline: jest.fn(),
}));

jest.mock('../offlineStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock Firebase functions
jest.mock('firebase/firestore', () => {
  const firebaseMock = {
    collection: jest.fn(() => firebaseMock),
    doc: jest.fn(() => firebaseMock),
    setDoc: jest.fn(() => Promise.resolve()),
    getDoc: jest.fn(() => Promise.resolve({
      exists: jest.fn(() => true),
      data: jest.fn(() => ({
        name: 'Test Account',
        balance: 1000,
        type: 'savings',
        userId: 'test-user-id',
        scope: 'personal',
      })),
      id: 'test-doc-id'
    })),
    getDocs: jest.fn(() => Promise.resolve({
      docs: [{
        id: 'test-doc-id',
        data: () => ({
          name: 'Test Account',
          balance: 1000,
          type: 'savings',
          userId: 'test-user-id',
          scope: 'personal',
        }),
      }],
      forEach: jest.fn((callback) => {
        callback({
          id: 'test-doc-id',
          data: () => ({
            name: 'Test Account',
            balance: 1000,
            type: 'savings',
            userId: 'test-user-id',
            scope: 'personal',
          }),
        });
      }),
    })),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => firebaseMock),
    where: jest.fn(() => firebaseMock),
    orderBy: jest.fn(() => firebaseMock),
    limit: jest.fn(() => firebaseMock),
    serverTimestamp: jest.fn(() => new Date()),
  };
  
  return firebaseMock;
});

describe('Offline Finance Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    offlineStorageService.getAllKeys.mockResolvedValue([]);
  });

  describe('syncOfflineData', () => {
    it('should sync offline accounts when coming back online', async () => {
      // Setup mock data for offline operations
      const offlinePendingOperations = [
        {
          operation: 'create',
          collection: 'finance_accounts',
          data: {
            name: 'Offline Account',
            balance: 500,
            type: 'checking',
            userId: 'test-user-id',
            scope: 'personal',
            tempId: 'temp-id-1'
          },
          timestamp: Date.now()
        }
      ];
      
      offlineStorageService.getItem.mockImplementation((key) => {
        if (key === 'offline_pending_operations') {
          return Promise.resolve(JSON.stringify(offlinePendingOperations));
        }
        return Promise.resolve(null);
      });
      
      // Simulate coming back online
      networkService.isOnline.mockReturnValue(true);
      
      // Call sync function
      await financeService.syncOfflineData();
      
      // Check that the operation was synced to Firebase
      const { addDoc } = require('firebase/firestore');
      expect(addDoc).toHaveBeenCalled();
      
      // Check that pending operations were cleared
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'offline_pending_operations',
        JSON.stringify([])
      );
    });
    
    it('should not try to sync when still offline', async () => {
      // Setup mock for offline state
      networkService.isOnline.mockReturnValue(false);
      
      // Call sync function
      await financeService.syncOfflineData();
      
      // Check that no Firebase operations were performed
      const { addDoc, updateDoc, deleteDoc } = require('firebase/firestore');
      expect(addDoc).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('createAccount offline', () => {
    it('should store account for later sync when offline', async () => {
      // Setup mock for offline state
      networkService.isOnline.mockReturnValue(false);
      
      // Setup mock for existing offline data
      offlineStorageService.getItem.mockImplementation((key) => {
        if (key === 'finance_accounts_personal') {
          return Promise.resolve(JSON.stringify([]));
        }
        if (key === 'offline_pending_operations') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });
      
      const accountData = {
        name: 'New Offline Account',
        balance: 1000,
        type: 'savings',
        scope: FINANCE_SCOPE.PERSONAL,
      };
      
      // Create account while offline
      const result = await financeService.createAccount('test-user-id', accountData);
      
      // Check that account was stored locally
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'finance_accounts_personal',
        expect.any(String)
      );
      
      // Check that operation was added to pending operations
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'offline_pending_operations',
        expect.any(String)
      );
      
      // Check that we got back a temporary ID
      expect(result).toHaveProperty('id');
      expect(result.id).toContain('temp-');
    });
  });

  describe('createTransaction offline', () => {
    it('should update account balance locally when creating transaction offline', async () => {
      // Setup mock for offline state
      networkService.isOnline.mockReturnValue(false);
      
      // Setup mock for existing offline data
      const mockAccounts = [{
        id: 'account-1',
        name: 'Existing Account',
        balance: 1000,
        type: 'savings',
        userId: 'test-user-id',
        scope: FINANCE_SCOPE.PERSONAL,
      }];
      
      offlineStorageService.getItem.mockImplementation((key) => {
        if (key === 'finance_accounts_personal') {
          return Promise.resolve(JSON.stringify(mockAccounts));
        }
        if (key === 'finance_transactions_personal') {
          return Promise.resolve(JSON.stringify([]));
        }
        if (key === 'offline_pending_operations') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });
      
      const transactionData = {
        accountId: 'account-1',
        amount: 200,
        type: 'expense',
        category: 'groceries',
        description: 'Weekly groceries',
        date: new Date(),
        scope: FINANCE_SCOPE.PERSONAL,
      };
      
      // Create transaction while offline
      const result = await financeService.createTransaction('test-user-id', transactionData);
      
      // Check that transaction was stored locally
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'finance_transactions_personal',
        expect.any(String)
      );
      
      // Check that account balance was updated locally
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'finance_accounts_personal',
        expect.stringContaining('"balance":800') // 1000 - 200
      );
      
      // Check that operation was added to pending operations
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'offline_pending_operations',
        expect.any(String)
      );
      
      // Check that we got back a temporary ID
      expect(result).toHaveProperty('id');
      expect(result.id).toContain('temp-');
    });
  });

  describe('contributeToWelfare offline', () => {
    it('should update welfare account balance locally when contributing offline', async () => {
      // Setup mock for offline state
      networkService.isOnline.mockReturnValue(false);
      
      // Setup mock for existing offline data
      const mockWelfareAccounts = [{
        id: 'welfare-1',
        name: 'Family Fund',
        balance: 5000,
        goal: 10000,
        contributionFrequency: 'monthly',
        contributionAmount: 200,
        familyId: 'test-extended-family-id',
        members: ['test-user-id'],
        contributions: [],
        scope: FINANCE_SCOPE.EXTENDED,
      }];
      
      offlineStorageService.getItem.mockImplementation((key) => {
        if (key === 'finance_welfare_accounts_extended') {
          return Promise.resolve(JSON.stringify(mockWelfareAccounts));
        }
        if (key === 'offline_pending_operations') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });
      
      const contributionData = {
        amount: 500,
        notes: 'Monthly contribution',
        contributorId: 'test-user-id',
        contributorName: 'Test User',
      };
      
      // Contribute to welfare while offline
      await financeService.contributeToWelfare('welfare-1', contributionData);
      
      // Check that welfare account was updated locally
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'finance_welfare_accounts_extended',
        expect.stringContaining('"balance":5500') // 5000 + 500
      );
      
      // Check that operation was added to pending operations
      expect(offlineStorageService.setItem).toHaveBeenCalledWith(
        'offline_pending_operations',
        expect.any(String)
      );
    });
  });
});
