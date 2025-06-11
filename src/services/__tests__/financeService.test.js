import financeService from '../financeService';
import { FINANCE_SCOPE } from '../../contexts/FinanceContext';
import offlineStorageService from '../offlineStorage';
import networkService from '../networkService';

// Mocking dependencies
jest.mock('../../firebaseConfig');

jest.mock('../networkService', () => ({
  isOnline: jest.fn(),
}));

jest.mock('../offlineStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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
    addDoc: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
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

describe('financeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccounts', () => {
    it('should return accounts from Firebase when online', async () => {
      // Set up mocks for online mode
      networkService.isOnline.mockReturnValue(true);
      
      const accounts = await financeService.getAccounts('test-user-id', FINANCE_SCOPE.PERSONAL);
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('Test Account');
    });

    it('should return accounts from offline storage when offline', async () => {
      // Set up mocks for offline mode
      networkService.isOnline.mockReturnValue(false);
      offlineStorageService.getItem.mockResolvedValue(JSON.stringify([
        {
          id: 'offline-account-id',
          name: 'Offline Account',
          balance: 500,
          type: 'checking',
          userId: 'test-user-id',
          scope: 'personal',
        }
      ]));
      
      const accounts = await financeService.getAccounts('test-user-id', FINANCE_SCOPE.PERSONAL);
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('Offline Account');
      expect(offlineStorageService.getItem).toHaveBeenCalledWith('finance_accounts_personal');
    });
  });

  describe('createAccount', () => {
    it('should create an account in Firebase when online', async () => {
      // Set up mocks for online mode
      networkService.isOnline.mockReturnValue(true);
      
      const accountData = {
        name: 'New Account',
        balance: 1000,
        type: 'savings',
        scope: FINANCE_SCOPE.PERSONAL,
      };
      
      const result = await financeService.createAccount('test-user-id', accountData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('test-doc-id');
    });

    it('should store account for later sync when offline', async () => {
      // Set up mocks for offline mode
      networkService.isOnline.mockReturnValue(false);
      
      const accountData = {
        name: 'Offline New Account',
        balance: 2000,
        type: 'checking',
        scope: FINANCE_SCOPE.PERSONAL,
      };
      
      const result = await financeService.createAccount('test-user-id', accountData);
      
      expect(result).toBeDefined();
      expect(offlineStorageService.setItem).toHaveBeenCalled();
    });
  });

  // Add more tests for other methods in financeService
});
